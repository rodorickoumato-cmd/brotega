"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/supabase/database.types";

function slugifier(str: string): string {
  return str.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function traduireErreur(msg: string): string {
  if (!msg) return "Erreur inconnue.";
  if (msg.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (msg.includes("Email not confirmed")) return "Vérifiez votre email avant de vous connecter.";
  if (msg.includes("User already registered")) return "Cet email est déjà utilisé. Connectez-vous.";
  if (msg.includes("Password should be")) return "Le mot de passe doit avoir au moins 6 caractères.";
  if (msg.includes("Too many requests") || msg.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Erreur : " + msg;
}

// ─── Connexion ────────────────────────────────────────────────────────────────

export async function seConnecter(input: { email: string; motDePasse: string }) {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.motDePasse) return { erreur: "Email et mot de passe requis." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.motDePasse,
  });

  if (error || !data.user) return { erreur: traduireErreur(error?.message ?? "") };

  const { data: profil } = await supabase
    .from("utilisateurs").select("id, role").eq("id", data.user.id).single();

  revalidatePath("/");
  return { succes: true, profilExiste: !!profil, role: profil?.role ?? null };
}

// ─── Inscription ──────────────────────────────────────────────────────────────

export async function sInscrire(input: {
  email: string;
  motDePasse: string;
  nom: string;
  telephone?: string;
  role: "acheteur" | "vendeur";
  nomBoutique?: string;
  ville?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) return { erreur: "Email requis." };
  if (!input.motDePasse || input.motDePasse.length < 6) return { erreur: "Mot de passe : 6 caractères minimum." };
  if (!input.nom.trim()) return { erreur: "Votre nom est requis." };
  if (input.role === "vendeur" && !input.nomBoutique?.trim()) return { erreur: "Le nom de la boutique est requis." };

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.motDePasse,
  });

  if (error) return { erreur: traduireErreur(error.message) };
  if (!data.user) return { erreur: "Impossible de créer le compte." };

  const telephone = input.telephone?.trim() ? `+241${input.telephone.trim()}` : null;

  const { error: profilError } = await supabase.from("utilisateurs").insert({
    id: data.user.id,
    nom: input.nom.trim(),
    email,
    email_verifie: false,
    telephone,
    whatsapp: telephone,
    role: input.role,
    marketing_opt_in: false,
  });

  if (profilError && !profilError.message.includes("duplicate")) {
    return { erreur: "Erreur création profil : " + profilError.message };
  }

  if (input.role === "vendeur" && input.nomBoutique) {
    const slug = `${slugifier(input.nomBoutique)}-${data.user.id.slice(0, 6)}`;
    await supabase.from("vendeurs").insert({
      utilisateur_id: data.user.id,
      nom: input.nomBoutique.trim(),
      slug,
      ville: input.ville ?? "Libreville",
      telephone,
      whatsapp: telephone,
      statut: "en_attente",
      categories: [],
    });
  }

  revalidatePath("/");
  return { succes: true, role: input.role };
}

// ─── Mot de passe oublié ──────────────────────────────────────────────────────

export async function reinitialiserMotDePasse(email: string) {
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${appUrl}/auth/callback?next=/auth/reset-password`,
  });
  if (error) return { erreur: traduireErreur(error.message) };
  return { succes: true };
}

// ─── Création profil (conservé pour compatibilité) ────────────────────────────

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
  const telephone = data.telephone ?? null;

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

  let { data: profil } = await supabase
    .from("utilisateurs").select("id, role, telephone").eq("id", user.id).single();

  // Profil absent (inscription incomplète) → le créer automatiquement
  if (!profil) {
    const nomDefaut = user.email?.split("@")[0] ?? "Vendeur";
    await supabase.from("utilisateurs").insert({
      id: user.id,
      nom: nomDefaut,
      email: user.email ?? null,
      email_verifie: !!user.email_confirmed_at,
      role: "acheteur",
      marketing_opt_in: false,
    });
    const { data: profilCree } = await supabase
      .from("utilisateurs").select("id, role, telephone").eq("id", user.id).single();
    profil = profilCree;
  }

  if (!profil) return { erreur: "Impossible de créer votre profil. Contactez le support." };
  if (profil.role === "vendeur") return { erreur: "Vous êtes déjà vendeur." };

  const { data: dejaVendeur } = await supabase
    .from("vendeurs").select("id").eq("utilisateur_id", user.id).maybeSingle();

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
    .from("utilisateurs").update({ role: "vendeur" }).eq("id", user.id);
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
