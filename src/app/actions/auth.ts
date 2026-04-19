"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugifier(str: string): string {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function inscrire(data: {
  email: string;
  password: string;
  nom: string;
  telephone: string;
  ville: string;
  role: "acheteur" | "vendeur";
  nomBoutique?: string;
}) {
  const supabase = await createClient();

  // 1. Créer le compte Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { nom: data.nom, role: data.role },
    },
  });

  if (authError || !authData.user) {
    return { erreur: authError?.message ?? "Erreur lors de la création du compte." };
  }

  const userId = authData.user.id;

  // 2. Créer le profil utilisateur
  const { error: profilError } = await supabase.from("utilisateurs").insert({
    id: userId,
    nom: data.nom,
    email: data.email,
    telephone: data.telephone,
    ville: data.ville,
    role: data.role,
  });

  if (profilError) {
    return { erreur: "Compte créé mais erreur profil : " + profilError.message };
  }

  // 3. Si vendeur, créer la boutique
  if (data.role === "vendeur" && data.nomBoutique) {
    const slug = `${slugifier(data.nomBoutique)}-${userId.slice(0, 6)}`;
    const { error: vendeurError } = await supabase.from("vendeurs").insert({
      utilisateur_id: userId,
      nom: data.nomBoutique,
      slug,
      ville: data.ville,
      telephone: data.telephone,
      statut: "en_attente",
      categories: [],
    });

    if (vendeurError) {
      return { erreur: "Compte créé mais erreur boutique : " + vendeurError.message };
    }
  }

  revalidatePath("/");
  return { succes: true, role: data.role };
}

export async function connecter(data: { email: string; password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    const messages: Record<string, string> = {
      "Invalid login credentials": "Email ou mot de passe incorrect.",
      "Email not confirmed": "Veuillez confirmer votre email avant de vous connecter.",
      "Too many requests": "Trop de tentatives. Réessayez dans quelques minutes.",
    };
    return { erreur: messages[error.message] ?? error.message };
  }

  revalidatePath("/");
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
    .from("utilisateurs")
    .select("*")
    .eq("id", user.id)
    .single();

  return profil;
}

export async function getVendeurActuel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: vendeur } = await supabase
    .from("vendeurs")
    .select("*")
    .eq("utilisateur_id", user.id)
    .single();

  return vendeur;
}
