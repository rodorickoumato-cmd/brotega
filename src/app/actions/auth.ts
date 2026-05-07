"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vers241 } from "@/lib/phone";

function slugifier(str: string): string {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Mapping erreurs Supabase → messages français simples
function traduireErreurAuth(msg: string): string {
  const map: Record<string, string> = {
    "Invalid phone number": "Numéro de téléphone invalide.",
    "Phone not confirmed": "Numéro non confirmé. Vérifiez le code SMS.",
    "Token has expired or is invalid": "Code expiré ou invalide. Demandez un nouveau code.",
    "SMS rate limit exceeded": "Trop de demandes. Patientez quelques minutes.",
    "Too many requests": "Trop de tentatives. Réessayez dans quelques minutes.",
    "User already registered": "Ce numéro est déjà utilisé.",
  };
  for (const [k, v] of Object.entries(map)) if (msg.includes(k)) return v;
  return "Une erreur est survenue. Réessayez.";
}

// 1) Envoi OTP par SMS — utilisé pour login ET register
//    `creerSiAbsent` = false pour login (l'utilisateur doit exister)
//    `creerSiAbsent` = true pour register
export async function envoyerOTP(input: { telephone: string; creerSiAbsent: boolean }) {
  const phone = vers241(input.telephone);
  if (!phone) return { erreur: "Numéro invalide. Format attendu : 01 23 45 67" };

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: input.creerSiAbsent,
      channel: "sms",
    },
  });

  if (error) return { erreur: traduireErreurAuth(error.message) };
  return { succes: true, telephone: phone };
}

// 2) Vérification OTP — connecte la session
export async function verifierOTP(input: { telephone: string; code: string }) {
  const phone = vers241(input.telephone);
  if (!phone) return { erreur: "Numéro invalide." };
  if (!/^\d{6}$/.test(input.code)) return { erreur: "Le code doit avoir 6 chiffres." };

  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: input.code,
    type: "sms",
  });

  if (error || !data.user) return { erreur: traduireErreurAuth(error?.message ?? "") };

  // Vérifie si profil existe déjà
  const { data: profil } = await supabase
    .from("utilisateurs")
    .select("id, role")
    .eq("id", data.user.id)
    .single();

  revalidatePath("/");
  return {
    succes: true,
    userId: data.user.id,
    profilExiste: !!profil,
    role: profil?.role ?? null,
  };
}

// 3) Création du profil après OTP vérifié (étape post-OTP au register)
export async function creerProfil(data: {
  nom: string;
  role: "acheteur" | "vendeur";
  ville?: string;
  nomBoutique?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée. Reconnectez-vous." };

  const telephone = user.phone ? "+" + user.phone : null;

  const { error: profilError } = await supabase.from("utilisateurs").insert({
    id: user.id,
    nom: data.nom,
    telephone,
    role: data.role,
  });
  if (profilError) return { erreur: "Erreur création profil : " + profilError.message };

  if (data.role === "vendeur" && data.nomBoutique) {
    const slug = `${slugifier(data.nomBoutique)}-${user.id.slice(0, 6)}`;
    const { error: vendeurError } = await supabase.from("vendeurs").insert({
      utilisateur_id: user.id,
      nom: data.nomBoutique,
      slug,
      ville: data.ville ?? "Libreville",
      telephone,
      whatsapp: telephone,
      statut: "en_attente",
      categories: [],
    });
    if (vendeurError) return { erreur: "Erreur création boutique : " + vendeurError.message };
  }

  revalidatePath("/");
  return { succes: true, role: data.role };
}

export async function devenirVendeur(data: { nomBoutique: string; ville: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté." };

  const { data: profil } = await supabase
    .from("utilisateurs")
    .select("id, role, telephone")
    .eq("id", user.id)
    .single();

  if (!profil) return { erreur: "Profil introuvable." };
  if (profil.role === "vendeur") return { erreur: "Vous êtes déjà vendeur." };

  const { data: dejaVendeur } = await supabase
    .from("vendeurs")
    .select("id")
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  if (dejaVendeur) return { erreur: "Vous avez déjà une boutique." };

  const slug = `${slugifier(data.nomBoutique)}-${user.id.slice(0, 6)}`;

  const { error: vendeurError } = await supabase.from("vendeurs").insert({
    utilisateur_id: user.id,
    nom: data.nomBoutique,
    slug,
    ville: data.ville,
    telephone: profil.telephone,
    whatsapp: profil.telephone,
    statut: "en_attente",
    categories: [],
  });
  if (vendeurError) return { erreur: "Erreur création boutique : " + vendeurError.message };

  const { error: roleError } = await supabase
    .from("utilisateurs")
    .update({ role: "vendeur" })
    .eq("id", user.id);
  if (roleError) return { erreur: "Erreur mise à jour du rôle : " + roleError.message };

  revalidatePath("/");
  return { succes: true };
}

export async function modifierProfil(data: { nom: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté." };
  if (!data.nom.trim()) return { erreur: "Le nom ne peut pas être vide." };

  const { error } = await supabase
    .from("utilisateurs")
    .update({ nom: data.nom.trim() })
    .eq("id", user.id);

  if (error) return { erreur: error.message };
  revalidatePath("/compte");
  return { succes: true };
}

export async function deconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function getSessionUtilisateur() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("utilisateurs").select("*").eq("id", user.id).single();
  return profil;
}

export async function getVendeurActuel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: vendeur } = await supabase
    .from("vendeurs").select("*").eq("utilisateur_id", user.id).single();
  return vendeur;
}
