// Client Supabase service_role — BYPASS RLS.
// À utiliser UNIQUEMENT côté serveur (server actions, API routes, webhooks).
// Pour : créditer wallet, écrire paiements, créer wallet_transactions.
// Ne JAMAIS exposer ce client au client browser.

import { createClient as createSbClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant — requis pour les opérations admin");
  }
  return createSbClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
