"use server";

// Gestion admin des comptes marchands PVIT par opérateur (Airtel / Moov).
// Table dédiée `pvit_config` — jamais lisible côté client (voir migration 008).

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enregistrerAudit } from "@/lib/audit";
import type { PvitConfigRow } from "@/lib/supabase/database.types";

async function verifierAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" as const, userId: null };
  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return { erreur: "Accès refusé" as const, userId: null };
  return { erreur: null, userId: user.id };
}

export async function getPvitComptesAdmin(): Promise<{
  erreur: string | null;
  comptes: PvitConfigRow[] | null;
}> {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, comptes: null };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pvit_config")
    .select("operateur, account_code, modifie_le, modifie_par")
    .order("operateur");

  if (error) return { erreur: error.message, comptes: null };
  return { erreur: null, comptes: data };
}

export async function sauvegarderPvitCompte(
  operateur: "airtel" | "moov",
  accountCode: string
): Promise<{ erreur: string | null; succes: boolean }> {
  const { erreur, userId } = await verifierAdmin();
  if (erreur || !userId) return { erreur: erreur ?? "Non autorisé", succes: false };

  const admin = createAdminClient();
  const { data: avant } = await admin.from("pvit_config").select("account_code").eq("operateur", operateur).maybeSingle();

  const { error } = await admin
    .from("pvit_config")
    .upsert({
      operateur,
      account_code: accountCode.trim(),
      modifie_le: new Date().toISOString(),
      modifie_par: userId,
    }, { onConflict: "operateur" });

  if (error) return { erreur: error.message, succes: false };

  void enregistrerAudit({
    adminId: userId, action: "pvit_config.compte", cibleType: "pvit_config", cibleId: operateur,
    avant: { account_code: avant?.account_code ?? null }, apres: { account_code: accountCode.trim() },
  });

  revalidatePath("/admin/configuration");
  return { erreur: null, succes: true };
}
