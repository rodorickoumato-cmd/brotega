// Provider PVIT — agrégateur Mobile Money Gabon (Airtel Money + Moov Money)
// Documentation : https://api.mypvit.pro
// Authentification : slug + secret passés dans le corps de la requête

import { createHmac, timingSafeEqual } from "crypto";
import type {
  PaiementProvider, InitierPaiementParams, InitierPaiementResult,
  StatutDistantParams, StatutDistantResult, ProviderId,
} from "./types";

const BASE_URL     = process.env.PVIT_BASE_URL     ?? "https://api.mypvit.pro";
const SLUG         = process.env.PVIT_SLUG         ?? "";
const REST_TOKEN   = process.env.PVIT_REST_TOKEN   ?? "";
const STATUS_TOKEN = process.env.PVIT_STATUS_TOKEN ?? "";
const SECRET       = process.env.PVIT_SECRET       ?? "";

// Opérateurs PVIT — vérifiez via GET /operators si les noms changent
const OPERATOR_MAP: Record<ProviderId, string> = {
  airtel: "AIRTEL_MONEY",
  moov:   "MOOV_MONEY",
  cash:   "",
  mock:   "",
};

export class PvitProvider implements PaiementProvider {
  id: ProviderId;

  constructor(id: ProviderId = "airtel") { this.id = id; }

  async initier(p: InitierPaiementParams): Promise<InitierPaiementResult> {
    if (!SLUG || !REST_TOKEN) {
      return { ok: false, erreur: "PVIT_SLUG ou PVIT_REST_TOKEN manquant dans .env" };
    }

    const operator = OPERATOR_MAP[p.provider];
    if (!operator) return { ok: false, erreur: "Opérateur non supporté : " + p.provider };

    // PVIT attend le numéro sans le "+"
    const phone = p.telephone.replace(/^\+/, "");

    const body: Record<string, unknown> = {
      slug:         SLUG,
      phone,
      amount:       p.montantXaf,
      currency:     "XAF",
      operator,
      description:  `MYC'S SECRET ${p.commandeCode}`.slice(0, 50),
      reference:    p.idempotencyKey,
      callback_url: p.webhookUrl,
    };

    try {
      const res = await fetch(`${BASE_URL}/v2/${REST_TOKEN}/rest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SECRET}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({})) as Record<string, unknown>;

      if (!res.ok) {
        const msg = (json["message"] ?? json["error"] ?? json["erreur"] ?? `HTTP ${res.status}`) as string;
        return { ok: false, erreur: String(msg) };
      }

      const status = String(json["status"] ?? json["state"] ?? "pending").toLowerCase();
      const estEchec = ["failed", "error", "rejected", "cancelled", "echec"].includes(status);
      if (estEchec) {
        return { ok: false, erreur: String(json["message"] ?? `Statut PVIT: ${status}`) };
      }

      // PVIT retourne transaction_id ou utilise notre référence comme clé
      const transId = String(
        json["transaction_id"] ?? json["transactionId"] ?? json["id"] ?? p.idempotencyKey
      );

      return {
        ok: true,
        providerRef: transId,
        statut: ["success", "completed", "successful"].includes(status) ? "reussi" : "en_attente",
        instructions: "Validez le paiement sur votre téléphone mobile",
      };
    } catch (e) {
      return { ok: false, erreur: e instanceof Error ? e.message : "Erreur réseau PVIT" };
    }
  }

  async verifierStatut(p: StatutDistantParams): Promise<StatutDistantResult> {
    if (!STATUS_TOKEN) return { ok: false, erreur: "PVIT_STATUS_TOKEN manquant" };

    try {
      const params = new URLSearchParams({ reference: p.providerRef, slug: SLUG });
      const res = await fetch(`${BASE_URL}/v1/${STATUS_TOKEN}/status?${params}`, {
        headers: { "Authorization": `Bearer ${SECRET}` },
      });
      const json = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (!res.ok) return { ok: false, erreur: `HTTP ${res.status}` };

      const status = String(json["status"] ?? json["state"] ?? "pending").toLowerCase();
      const mapStatut = (s: string): "en_attente" | "reussi" | "echec" => {
        if (["success", "completed", "successful"].includes(s)) return "reussi";
        if (["failed", "error", "rejected", "cancelled"].includes(s)) return "echec";
        return "en_attente";
      };

      return { ok: true, statut: mapStatut(status), raw: json };
    } catch (e) {
      return { ok: false, erreur: e instanceof Error ? e.message : "Erreur réseau" };
    }
  }

  verifierSignature(rawBody: string, signature: string | null): boolean {
    // Si pas de secret configuré → accepter (mode test)
    if (!SECRET) return true;
    if (!signature) return false;
    try {
      const computed = createHmac("sha256", SECRET).update(rawBody).digest("hex");
      const a = Buffer.from(computed, "utf8");
      const b = Buffer.from(signature, "utf8");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
