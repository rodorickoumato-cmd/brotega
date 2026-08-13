"use server";

// Gestion admin des coupons de réduction (Phase 2 — Admin Center).

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enregistrerAudit } from "@/lib/audit";
import type { CouponRow } from "@/lib/supabase/database.types";

async function verifierAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" as const, userId: null };
  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return { erreur: "Accès refusé" as const, userId: null };
  return { erreur: null, userId: user.id };
}

export async function getCouponsAdmin(): Promise<{ erreur: string | null; coupons: CouponRow[] | null }> {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, coupons: null };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { erreur: error.message, coupons: null };
  return { erreur: null, coupons: data };
}

export async function creerCoupon(input: {
  code: string;
  type: "pourcentage" | "montant_fixe" | "livraison_gratuite";
  valeur: number;
  utilisationMax: number | null;
  montantMinXaf: number;
  expireLe: string | null;
}): Promise<{ erreur: string | null; succes: boolean }> {
  const { erreur, userId } = await verifierAdmin();
  if (erreur || !userId) return { erreur: erreur ?? "Non autorisé", succes: false };

  const code = input.code.trim().toUpperCase();
  if (!code) return { erreur: "Le code est requis.", succes: false };
  if (input.type === "pourcentage" && (input.valeur < 1 || input.valeur > 100)) {
    return { erreur: "Un pourcentage doit être entre 1 et 100.", succes: false };
  }
  if (input.type === "montant_fixe" && input.valeur < 1) {
    return { erreur: "Le montant de réduction doit être positif.", succes: false };
  }

  const admin = createAdminClient();
  const { data: nouveau, error } = await admin.from("coupons").insert({
    code,
    type: input.type,
    valeur: input.type === "livraison_gratuite" ? 0 : input.valeur,
    utilisation_max: input.utilisationMax,
    montant_min_xaf: input.montantMinXaf,
    expire_le: input.expireLe,
    created_par: userId,
  }).select("id").single();

  if (error) {
    return { erreur: error.code === "23505" ? "Ce code existe déjà." : error.message, succes: false };
  }

  void enregistrerAudit({
    adminId: userId, action: "coupon.creer", cibleType: "coupon", cibleId: nouveau?.id,
    apres: { code, type: input.type, valeur: input.valeur },
  });

  revalidatePath("/admin/coupons");
  return { erreur: null, succes: true };
}

export async function toggleCouponActif(id: string, actif: boolean): Promise<{ erreur: string | null; succes: boolean }> {
  const { erreur, userId } = await verifierAdmin();
  if (erreur || !userId) return { erreur: erreur ?? "Non autorisé", succes: false };

  const admin = createAdminClient();
  const { data: coupon } = await admin.from("coupons").select("code, actif").eq("id", id).single();
  const { error } = await admin.from("coupons").update({ actif }).eq("id", id);
  if (error) return { erreur: error.message, succes: false };

  void enregistrerAudit({
    adminId: userId, action: "coupon.actif", cibleType: "coupon", cibleId: id,
    avant: { actif: coupon?.actif, code: coupon?.code }, apres: { actif, code: coupon?.code },
  });

  revalidatePath("/admin/coupons");
  return { erreur: null, succes: true };
}

export async function supprimerCoupon(id: string): Promise<{ erreur: string | null; succes: boolean }> {
  const { erreur, userId } = await verifierAdmin();
  if (erreur || !userId) return { erreur: erreur ?? "Non autorisé", succes: false };

  const admin = createAdminClient();
  const { data: coupon } = await admin.from("coupons").select("code, utilisation_actuelle, type, valeur").eq("id", id).single();
  if (coupon && coupon.utilisation_actuelle > 0) {
    return { erreur: "Ce code a déjà été utilisé — désactive-le plutôt que de le supprimer, pour garder l'historique lisible.", succes: false };
  }

  const { error } = await admin.from("coupons").delete().eq("id", id);
  if (error) return { erreur: error.message, succes: false };

  void enregistrerAudit({
    adminId: userId, action: "coupon.supprimer", cibleType: "coupon", cibleId: id, avant: coupon,
  });

  revalidatePath("/admin/coupons");
  return { erreur: null, succes: true };
}
