"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditLogRow } from "@/lib/supabase/database.types";

async function verifierAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" as const, userId: null };
  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return { erreur: "Accès refusé" as const, userId: null };
  return { erreur: null, userId: user.id };
}

export async function getAuditLogAdmin(): Promise<{
  erreur: string | null;
  entrees: (AuditLogRow & { admin_nom: string | null })[] | null;
}> {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, entrees: null };

  const admin = createAdminClient();
  const { data: entrees, error } = await admin
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return { erreur: error.message, entrees: null };
  if (!entrees?.length) return { erreur: null, entrees: [] };

  const adminIds = [...new Set(entrees.map((e) => e.admin_id).filter((id): id is string => !!id))];
  const nomMap = new Map<string, string>();
  for (const id of adminIds) {
    const { data } = await admin.from("utilisateurs").select("nom").eq("id", id).maybeSingle();
    if (data?.nom) nomMap.set(id, data.nom);
  }

  return {
    erreur: null,
    entrees: entrees.map((e) => ({ ...e, admin_nom: e.admin_id ? nomMap.get(e.admin_id) ?? null : null })),
  };
}
