"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vers241 } from "@/lib/phone";
import type { Database } from "@/lib/supabase/database.types";

function slugifier(str: string): string {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Mapping erreurs Supabase → messages français simples
function traduireErreurAuth(msg: string): string {
  if (!msg) return "Erreur inconnue.";
  const map: Record<string, string> = {
    "Invalid phone number": "Numéro de téléphone invalide.",
    "Phone not confirmed": "Numéro non confirmé. Vérifiez le code SMS.",
    "Token has expired or is invalid": "Code expiré ou invalide. Demandez un nouveau code.",
    "SMS rate limit exceeded": "Trop de demandes. Patientez quelques minutes.",
    "Too many requests": "Trop de tentatives. Réessayez dans quelques minutes.",
    "User already registered": "Ce numéro est déjà utilisé.",
    "Phone provider": "SMS non configuré. Contactez le support.",
    "phone_provider": "SMS non configuré. Contactez le support.",
    "provider is not enabled": "Envoi SMS non activé sur le serveur.",
    "Signups not allowed": "Inscription désactivée. Connectez-vous plutôt.",
    "signups_disabled": "Inscription désactivée.",
    "not found": "Service introuvable. Vérifiez la configuration.",
    "Twilio": "Erreur Twilio : " + msg,
  };
  for (const [k, v] of Object.entries(map)) if (msg.toLowerCase().includes(k.toLowerCase())) return v;
  // Retourne l'erreur brute pour faciliter le diagnostic
  return "Erreur : " + msg;
}

// 1a) Envoi OTP par email — login ET register
export async function envoyerEmailOTP(input: { email: string; creerSiAbsent: boolean }) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erreur: "Adresse email invalide." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: input.creerSiAbsent },
  });

  if (error) return { erreur: traduireErreurAuth(error.message) };
  return { succes: true, email };
}

// 1b) Vérification OTP email
export async function verifierEmailOTP(input: { email: string; code: string }) {
  const email = input.email.trim().toLowerCase();
  if (!/^\d{6}$/.test(input.code)) return { erreur: "Le code doit avoir 6 chiffres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: input.code,
    type: "email",
  });

  if (error || !data.user) return { erreur: traduireErreurAuth(error?.message ?? "") };

  const { data: profil } = await supabase
    .from("utilisateurs")
    .select("id, role")
    .eq("id", data.user.id)
    .single();

  // Si le profil existe déjà, marque l'email comme vérifié
  if (profil) {
    await supabase
      .from("utilisateurs")
      .update({ email, email_verifie: true })
      .eq("id", data.user.id);
    revalidatePath("/compte/profil");
    revalidatePath("/compte");
  }

  revalidatePath("/");
  return { succes: true, userId: data.user.id, profilExiste: !!profil, role: profil?.role ?? null };
}

// 1c) Envoi OTP par SMS — utilisé pour login ET register
//     `creerSiAbsent` = false pour login (l'utilisateur doit exister)
//     `creerSiAbsent` = true pour register
export async function envoyerOTP(input: { telephone: string; creerSiAbsent: boolean }) {
  const phone = vers241(input.telephone);
  if (!phone) return { erreur: "Numéro invalide. Format attendu : 66 03 08 48" };

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
  email?: string;
  telephone?: string;
  marketingOptIn?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée. Reconnectez-vous." };

  const authEmail = user.email ?? null;
  const telephone = data.telephone ?? (user.phone ? "+" + user.phone : null);

  const { error: profilError } = await supabase.from("utilisateurs").insert({
    id: user.id,
    nom: data.nom,
    telephone,
    whatsapp: telephone,
    email: data.email ?? authEmail,
    email_verifie: true,
    marketing_opt_in: data.marketingOptIn ?? false,
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
      telephone: telephone ?? null,
      whatsapp: telephone ?? null,
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

export async function modifierProfil(data: {
  nom?: string;
  email?: string;
  whatsapp?: string;
  marketing_opt_in?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté." };
  if (data.nom !== undefined && !data.nom.trim()) return { erreur: "Le nom ne peut pas être vide." };
  if (data.email !== undefined && data.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { erreur: "Adresse email invalide." };
  }

  type UtilisateurUpdate = Database["public"]["Tables"]["utilisateurs"]["Update"];
  const champs: UtilisateurUpdate = {};
  if (data.nom !== undefined) champs.nom = data.nom.trim();
  if (data.email !== undefined) champs.email = data.email.trim() || null;
  if (data.whatsapp !== undefined) champs.whatsapp = data.whatsapp.trim() || null;
  if (data.marketing_opt_in !== undefined) champs.marketing_opt_in = data.marketing_opt_in;

  const { error } = await supabase.from("utilisateurs").update(champs).eq("id", user.id);
  if (error) return { erreur: error.message };
  revalidatePath("/compte");
  revalidatePath("/compte/profil");
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
