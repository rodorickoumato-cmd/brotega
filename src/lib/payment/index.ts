// Factory provider — choisit selon PAYMENT_PROVIDER (env)
// "mock" en dev, "singpay" en prod (Gabon).

import type { PaiementProvider, ProviderId } from "./types";
import { MockProvider } from "./mock";
import { PawapayProvider } from "./pawapay";
import { PvitProvider } from "./pvit";
import { SingpayProvider } from "./singpay";

export function getProvider(method: ProviderId): PaiementProvider {
  const choisi = process.env.PAYMENT_PROVIDER ?? "mock";

  if (choisi === "mock" || method === "mock") return new MockProvider();
  if (choisi === "pvit")    return new PvitProvider(method);
  if (choisi === "pawapay") return new PawapayProvider(method);
  if (choisi === "singpay") return new SingpayProvider(method);

  // Fallback sécurité
  return new MockProvider();
}

export type { PaiementProvider, ProviderId } from "./types";
