// Log d'audit — qui/quoi/quand/avant/après sur les actions admin critiques.
// Appelé depuis les server actions admin après une mutation réussie.
// Ne doit JAMAIS faire échouer l'action qu'il trace : un échec d'écriture du
// log est silencieux (cohérent avec le reste du code — ex. push notifications).

import { createAdminClient } from "@/lib/supabase/admin";

export async function enregistrerAudit(params: {
  adminId: string;
  action: string;
  cibleType?: string;
  cibleId?: string;
  avant?: unknown;
  apres?: unknown;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      admin_id: params.adminId,
      action: params.action,
      cible_type: params.cibleType ?? null,
      cible_id: params.cibleId ?? null,
      avant: params.avant ?? null,
      apres: params.apres ?? null,
    });
  } catch {
    // silencieux — voir commentaire en tête de fichier
  }
}
