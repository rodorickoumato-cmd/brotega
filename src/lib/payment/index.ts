// Factory provider — choisit selon PAYMENT_PROVIDER (env)
// "mock" en dev, "pvit" en prod (Gabon).

import type { PaiementProvider, ProviderId } from "./types";
import { MockProvider } from "./mock";
import { PawapayProvider } from "./pawapay";
import { PvitProvider } from "./pvit";

export function getProvider(method: ProviderId): PaiementProvider {
  const choisi = process.env.PAYMENT_PROVIDER ?? "mock";

  if (choisi === "mock" || method === "mock") return new MockProvider();
  if (choisi === "pvit")    return new PvitProvider(method);
  if (choisi === "pawapay") return new PawapayProvider(method);

  // Fallback sécurité
  return new MockProvider();
}

export type { PaiementProvider, ProviderId } from "./types";
