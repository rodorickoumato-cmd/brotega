// Provider Pawapay — agrégateur Mobile Money couvrant Airtel + Moov au Gabon.
// SQUELETTE : à compléter avec les credentials réels (PAWAPAY_API_KEY, PAWAPAY_BASE_URL).
// Documentation : https://docs.pawapay.io

import { createHmac, timingSafeEqual } from "crypto";
import type {
  PaiementProvider, InitierPaiementParams, InitierPaiementResult,
  StatutDistantParams, StatutDistantResult, ProviderId,
} from "./types";

const BASE_URL = process.env.PAWAPAY_BASE_URL ?? "https://api.sandbox.pawapay.io";
const API_KEY = process.env.PAWAPAY_API_KEY ?? "";
const WEBHOOK_SECRET = process.env.PAWAPAY_WEBHOOK_SECRET ?? "";

// Mapping J'adore la Famille → correspondant Pawapay
const PROVIDER_MAP: Record<ProviderId, string> = {
  airtel: "AIRTEL_OAPI_GAB",
  moov: "MOOV_GAB",
  cash: "",
  mock: "",
};

export class PawapayProvider implements PaiementProvider {
  id: ProviderId;

  constructor(id: ProviderId = "airtel") { this.id = id; }

  async initier(p: InitierPaiementParams): Promise<InitierPaiementResult> {
    if (!API_KEY) return { ok: false, erreur: "PAWAPAY_API_KEY manquant" };

    const correspondant = PROVIDER_MAP[p.provider];
    if (!correspondant) return { ok: false, erreur: "Provider non supporté: " + p.provider };

    // Pawapay attend le numéro sans le "+"
    const phone = p.telephone.replace(/^\+/, "");

    const body = {
      depositId: p.idempotencyKey,
      amount: String(p.montantXaf),
      currency: "XAF",
      country: "GAB",
      correspondent: correspondant,
      payer: { type: "MSISDN", address: { value: phone } },
      customerTimestamp: new Date().toISOString(),
      statementDescription: `J'adore la Famille ${p.commandeCode}`.slice(0, 22),
      metadata: [
        { fieldName: "commande_id", fieldValue: p.commandeId },
        { fieldName: "code_court", fieldValue: p.commandeCode },
      ],
    };

    try {
      const res = await fetch(`${BASE_URL}/deposits`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { ok: false, erreur: json.message ?? `HTTP ${res.status}` };
      }

      const status = json.status as string;
      const accepte = status === "ACCEPTED" || status === "COMPLETED";
      if (!accepte) return { ok: false, erreur: `Statut Pawapay: ${status}`, codeErreur: status };

      return {
        ok: true,
        providerRef: p.idempotencyKey,
        statut: status === "COMPLETED" ? "reussi" : "en_attente",
        instructions: "Validez le paiement sur votre téléphone (USSD reçu)",
      };
    } catch (e) {
      return { ok: false, erreur: e instanceof Error ? e.message : "Erreur réseau" };
    }
  }

  async verifierStatut(p: StatutDistantParams): Promise<StatutDistantResult> {
    try {
      const res = await fetch(`${BASE_URL}/deposits/${encodeURIComponent(p.providerRef)}`, {
        headers: { "Authorization": `Bearer ${API_KEY}` },
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, erreur: `HTTP ${res.status}` };

      const data = Array.isArray(json) ? json[0] : json;
      const status = data?.status as string;
      const map: Record<string, "en_attente" | "reussi" | "echec"> = {
        ACCEPTED: "en_attente", SUBMITTED: "en_attente", ENQUEUED: "en_attente",
        COMPLETED: "reussi",
        FAILED: "echec", REJECTED: "echec",
      };
      return { ok: true, statut: map[status] ?? "en_attente", raw: data };
    } catch (e) {
      return { ok: false, erreur: e instanceof Error ? e.message : "Erreur réseau" };
    }
  }

  verifierSignature(rawBody: string, signature: string | null): boolean {
    if (!WEBHOOK_SECRET || !signature) return false;
    const computed = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
    try {
      const a = Buffer.from(computed);
      const b = Buffer.from(signature);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
