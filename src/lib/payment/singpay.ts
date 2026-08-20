// Provider Singpay — plateforme de paiement Mobile Money simple et robuste
// Supporte Airtel Money + Moov Money (Gabon)
// Documentation : https://docs.singpay.io

import { createHmac, timingSafeEqual } from "crypto";
import type {
  PaiementProvider, InitierPaiementParams, InitierPaiementResult,
  StatutDistantParams, StatutDistantResult, ProviderId,
} from "./types";

function getEnv() {
  return {
    BASE_URL: process.env.SINGPAY_BASE_URL ?? "https://api.singpay.io",
    MERCHANT_ID: process.env.SINGPAY_MERCHANT_ID ?? "",
    API_KEY: process.env.SINGPAY_API_KEY ?? "",
    SECRET_KEY: process.env.SINGPAY_SECRET_KEY ?? "",
    WEBHOOK_URL: process.env.SINGPAY_WEBHOOK_URL ?? "",
  };
}

// Mapping des providers Singpay
const PROVIDER_MAP: Record<ProviderId, string> = {
  airtel: "AIRTEL_MONEY",
  moov: "MOOV_MONEY",
  cash: "",
  mock: "",
};

// Génère une référence unique pour Singpay (alphanumérique, max 50 chars)
function toRef(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50).toUpperCase();
}

export class SingpayProvider implements PaiementProvider {
  id: ProviderId;

  constructor(id: ProviderId = "airtel") {
    this.id = id;
  }

  async initier(p: InitierPaiementParams): Promise<InitierPaiementResult> {
    const { BASE_URL, MERCHANT_ID, API_KEY, WEBHOOK_URL, SECRET_KEY } = getEnv();

    if (!MERCHANT_ID || !API_KEY) {
      return {
        ok: false,
        erreur: "Variables Singpay manquantes dans .env (SINGPAY_MERCHANT_ID, SINGPAY_API_KEY)",
      };
    }

    const operateur = PROVIDER_MAP[p.provider];
    if (!operateur) {
      return { ok: false, erreur: "Opérateur non supporté : " + p.provider };
    }

    // Singpay attend le numéro au format E.164 ou sans le "+"
    let phone = p.telephone.replace(/^\+?241/, "").replace(/^\+/, "");
    if (/^[0-9]{8}$/.test(phone)) phone = "0" + phone;

    const reference = toRef(p.idempotencyKey);

    const body = {
      merchant_id: MERCHANT_ID,
      reference,
      amount: p.montantXaf,
      currency: "XAF",
      phone,
      operator: operateur,
      description: `J'adore la Famille ${p.commandeCode}`.slice(0, 30),
      callback_url: WEBHOOK_URL,
      metadata: {
        commande_id: p.commandeId,
        commande_code: p.commandeCode,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${BASE_URL}/v1/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const detail = json.message ?? json.error ?? json.errors;
        const msg = typeof detail === "string" ? detail : `HTTP ${res.status}`;
        console.error("Singpay erreur", res.status, JSON.stringify(json));
        return { ok: false, erreur: String(msg) };
      }

      console.log("Singpay réponse OK", JSON.stringify(json));

      const status = String(json.status ?? "pending").toLowerCase();
      const transId = String(json.transaction_id ?? json.id ?? reference);

      // Statut possible : pending, accepted, completed, failed
      const mapStatut = (): "en_attente" | "reussi" => {
        if (["completed", "success", "successful"].includes(status)) return "reussi";
        return "en_attente";
      };

      return {
        ok: true,
        providerRef: transId,
        statut: mapStatut(),
        instructions: "Validez le paiement sur votre téléphone mobile",
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur réseau Singpay";
      console.error("Singpay initier exception", msg);
      return { ok: false, erreur: msg };
    }
  }

  async verifierStatut(p: StatutDistantParams): Promise<StatutDistantResult> {
    const { BASE_URL, API_KEY, SECRET_KEY } = getEnv();

    if (!API_KEY) {
      return { ok: false, erreur: "SINGPAY_API_KEY manquant" };
    }

    try {
      const res = await fetch(`${BASE_URL}/v1/payments/${encodeURIComponent(p.providerRef)}`, {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
        },
      });

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        return { ok: false, erreur: `HTTP ${res.status}` };
      }

      const status = String(json.status ?? "pending").toLowerCase();

      const mapStatut = (s: string): "en_attente" | "reussi" | "echec" => {
        if (["completed", "success", "successful"].includes(s)) return "reussi";
        if (["failed", "error", "rejected", "cancelled"].includes(s)) return "echec";
        return "en_attente";
      };

      return {
        ok: true,
        statut: mapStatut(status),
        raw: json,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur réseau";
      return { ok: false, erreur: msg };
    }
  }

  verifierSignature(rawBody: string, signature: string | null): boolean {
    const { SECRET_KEY } = getEnv();

    if (!SECRET_KEY) {
      // Si pas de clé secrète, accepter les webhooks (dev)
      return true;
    }

    if (!signature) {
      return false;
    }

    try {
      // Singpay utilise HMAC-SHA256
      const computed = createHmac("sha256", SECRET_KEY).update(rawBody).digest("hex");
      const a = Buffer.from(computed, "utf8");
      const b = Buffer.from(signature, "utf8");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
