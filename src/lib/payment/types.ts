// Interface provider Mobile Money — agnostique
// Implémentations : MockProvider (dev), PawapayProvider (prod)

export type ProviderId = "airtel" | "moov" | "cash" | "mock";

export type InitierPaiementParams = {
  idempotencyKey: string;
  montantXaf: number;
  telephone: string;        // E.164 +241XXXXXXXX
  provider: ProviderId;
  commandeCode: string;     // ex BR-4F2K9 — apparaît dans le SMS opérateur
  commandeId: string;
  webhookUrl: string;       // URL absolue de notre /api/webhooks/paiements
};

export type InitierPaiementResult =
  | { ok: true; providerRef: string; statut: "en_attente" | "reussi"; instructions?: string }
  | { ok: false; erreur: string; codeErreur?: string };

export type StatutDistantParams = { providerRef: string };
export type StatutDistantResult =
  | { ok: true; statut: "en_attente" | "reussi" | "echec"; raw: unknown }
  | { ok: false; erreur: string };

export interface PaiementProvider {
  id: ProviderId;
  initier(params: InitierPaiementParams): Promise<InitierPaiementResult>;
  verifierStatut(params: StatutDistantParams): Promise<StatutDistantResult>;
  // Vérifie la signature HMAC d'un webhook entrant
  verifierSignature(rawBody: string, signature: string | null): boolean;
}
