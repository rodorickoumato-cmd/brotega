"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AppConfig } from "@/lib/config";

async function verifierAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" as const, userId: null };
  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return { erreur: "Accès refusé" as const, userId: null };
  return { erreur: null, userId: user.id };
}

export async function getConfigAdmin(): Promise<{ erreur: string | null; config: AppConfig | null }> {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, config: null };

  const admin = createAdminClient();
  const { data, error } = await admin.from("app_config").select("cle, valeur, description, categorie, modifie_le");
  if (error) return { erreur: error.message, config: null };

  const config: Record<string, unknown> = {};
  for (const row of data ?? []) {
    config[row.cle] = row.valeur;
  }

  return { erreur: null, config: config as unknown as AppConfig };
}

export async function getConfigDetailAdmin(): Promise<{
  erreur: string | null;
  lignes: Array<{ cle: string; valeur: unknown; description: string | null; categorie: string; modifie_le: string }> | null;
}> {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, lignes: null };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("app_config")
    .select("cle, valeur, description, categorie, modifie_le")
    .order("categorie")
    .order("cle");

  if (error) return { erreur: error.message, lignes: null };
  return { erreur: null, lignes: data };
}

export async function sauvegarderConfig(
  cle: string,
  valeur: unknown
): Promise<{ erreur: string | null; succes: boolean }> {
  const { erreur, userId } = await verifierAdmin();
  if (erreur || !userId) return { erreur: erreur ?? "Non autorisé", succes: false };

  const admin = createAdminClient();
  const { error } = await admin
    .from("app_config")
    .upsert({
      cle,
      valeur,
      modifie_le: new Date().toISOString(),
      modifie_par: userId,
    }, { onConflict: "cle" });

  if (error) return { erreur: error.message, succes: false };

  revalidatePath("/", "layout");
  return { erreur: null, succes: true };
}

export async function sauvegarderSection(
  entrees: Array<{ cle: string; valeur: unknown }>
): Promise<{ erreur: string | null; succes: boolean }> {
  const { erreur, userId } = await verifierAdmin();
  if (erreur || !userId) return { erreur: erreur ?? "Non autorisé", succes: false };

  const admin = createAdminClient();
  const maintenant = new Date().toISOString();

  const { error } = await admin
    .from("app_config")
    .upsert(
      entrees.map(({ cle, valeur }) => ({
        cle,
        valeur,
        modifie_le: maintenant,
        modifie_par: userId,
      })),
      { onConflict: "cle" }
    );

  if (error) return { erreur: error.message, succes: false };

  revalidatePath("/", "layout");
  return { erreur: null, succes: true };
}
