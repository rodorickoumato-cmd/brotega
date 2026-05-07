// Provider Mock — pour développement local sans API réelle.
// Simule une réussite après 8s via un fetch interne au webhook.
// Activer avec PAYMENT_PROVIDER=mock dans .env.local

import type {
  PaiementProvider, InitierPaiementParams, InitierPaiementResult,
  StatutDistantParams, StatutDistantResult,
} from "./types";

export class MockProvider implements PaiementProvider {
  id = "mock" as const;

  async initier(p: InitierPaiementParams): Promise<InitierPaiementResult> {
    const providerRef = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Auto-déclenche le webhook après 8s (simule l'utilisateur qui saisit son PIN MM)
    setTimeout(async () => {
      try {
        await fetch(p.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Mock-Signature": this.signerMock(JSON.stringify({ providerRef, statut: "reussi" })),
          },
          body: JSON.stringify({
            providerRef,
            statut: "reussi",
            commandeId: p.commandeId,
            montantXaf: p.montantXaf,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {
        // En dev, le webhook peut ne pas être joignable — silencieux
      }
    }, 8000);

    return {
      ok: true,
      providerRef,
      statut: "en_attente",
      instructions: "Mode test : paiement validé automatiquement dans 8 secondes.",
    };
  }

  async verifierStatut(_p: StatutDistantParams): Promise<StatutDistantResult> {
    return { ok: true, statut: "reussi", raw: { mock: true } };
  }

  verifierSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    return signature === this.signerMock(rawBody);
  }

  private signerMock(body: string): string {
    // Signature triviale pour le mock — à NE PAS utiliser en prod
    let h = 0;
    for (let i = 0; i < body.length; i++) h = (h << 5) - h + body.charCodeAt(i);
    return `mock-${Math.abs(h)}`;
  }
}
