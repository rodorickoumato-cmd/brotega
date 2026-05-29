// Provider PVIT — agrégateur Mobile Money Gabon (Airtel Money + Moov Money)
// Champs réels découverts via tests API le 29/05/2026 :
// - Header : X-Secret (pas Authorization Bearer)
// - operator_code (pas operator), customer_account_number, merchant_operation_account_code,
//   transaction_type=PAYMENT, owner_charge=MERCHANT, callback_url_code, service=RESTFUL
// - reference : alphanumérique uniquement, max 20 chars

import { createHmac, timingSafeEqual } from "crypto";
import type {
  PaiementProvider, InitierPaiementParams, InitierPaiementResult,
  StatutDistantParams, StatutDistantResult, ProviderId,
} from "./types";

function getEnv() {
  return {
    BASE_URL:      process.env.PVIT_BASE_URL          ?? "https://api.mypvit.pro",
    SLUG:          process.env.PVIT_SLUG              ?? "",
    ACCOUNT_CODE:  process.env.PVIT_ACCOUNT_CODE      ?? "",
    REST_TOKEN:    process.env.PVIT_REST_TOKEN        ?? "",
    STATUS_TOKEN:  process.env.PVIT_STATUS_TOKEN      ?? "",
    SECRET:        process.env.PVIT_SECRET            ?? "",
    CALLBACK_CODE: process.env.PVIT_CALLBACK_URL_CODE ?? "",
  };
}

const OPERATOR_MAP: Record<ProviderId, string> = {
  airtel: "AIRTEL_MONEY",
  moov:   "MOOV_MONEY",
  cash:   "",
  mock:   "",
};

// reference PVIT : alphanumérique + underscore, max 20 chars, pas de tirets
function toRef(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20).toUpperCase();
}

export class PvitProvider implements PaiementProvider {
  id: ProviderId;

  constructor(id: ProviderId = "airtel") { this.id = id; }

  async initier(p: InitierPaiementParams): Promise<InitierPaiementResult> {
    const { SLUG, REST_TOKEN, ACCOUNT_CODE, CALLBACK_CODE, BASE_URL, SECRET } = getEnv();
    if (!SLUG || !REST_TOKEN || !ACCOUNT_CODE || !CALLBACK_CODE) {
      return { ok: false, erreur: "Variables PVIT manquantes dans .env (SLUG, REST_TOKEN, ACCOUNT_CODE, CALLBACK_CODE)" };
    }

    const operator_code = OPERATOR_MAP[p.provider];
    if (!operator_code) return { ok: false, erreur: "Opérateur non supporté : " + p.provider };

    // PVIT attend 9 chiffres sans préfixe pays (ex: 066393247, pas 241066393247)
    const phone = p.telephone.replace(/^\+?241/, "").replace(/^\+/, "");
    const reference = toRef(p.idempotencyKey);

    const body: Record<string, unknown> = {
      agent:                           SLUG,
      merchant_operation_account_code: ACCOUNT_CODE,
      customer_account_number:         phone,
      operator_code,
      amount:                          p.montantXaf,
      transaction_type:                "PAYMENT",
      owner_charge:                    "MERCHANT",
      owner_charge_operator:           "MERCHANT",
      service:                         "RESTFUL",
      callback_url_code:               CALLBACK_CODE,
      reference,
      product:                         `MYCSSECRET ${p.commandeCode}`.slice(0, 50),
      free_info:                       `Commande ${p.commandeCode}`,
    };

    try {
      const res = await fetch(`${BASE_URL}/v2/${REST_TOKEN}/rest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Secret": SECRET,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({})) as Record<string, unknown>;

      if (!res.ok) {
        const msg = (json["message"] ?? json["error"] ?? json["erreur"] ?? `HTTP ${res.status}`) as string;
        return { ok: false, erreur: String(msg) };
      }

      const status = String(json["status"] ?? json["state"] ?? "pending").toLowerCase();
      if (["failed", "error", "rejected", "cancelled", "echec"].includes(status)) {
        return { ok: false, erreur: String(json["message"] ?? `Statut PVIT: ${status}`) };
      }

      const transId = String(
        json["reference_id"] ?? json["transaction_id"] ?? json["transactionId"] ?? json["id"] ?? reference
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
    const { STATUS_TOKEN, BASE_URL, SECRET, SLUG } = getEnv();
    if (!STATUS_TOKEN) return { ok: false, erreur: "PVIT_STATUS_TOKEN manquant" };

    try {
      const params = new URLSearchParams({ reference: p.providerRef, slug: SLUG });
      const res = await fetch(`${BASE_URL}/v1/${STATUS_TOKEN}/status?${params}`, {
        headers: { "X-Secret": SECRET },
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
    const { SECRET } = getEnv();
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
