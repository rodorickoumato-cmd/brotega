import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPushUtilisateurs } from "@/lib/push";

const VEHICULES = ["moto", "velo", "voiture", "autre"] as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (!profil) return NextResponse.json({ erreur: "Profil introuvable" }, { status: 404 });
  if (profil.role === "livreur") {
    return NextResponse.json({ erreur: "Vous êtes déjà livreur" }, { status: 400 });
  }

  const { vehicule, zone, message } = await req.json() as {
    vehicule: string; zone: string; message?: string;
  };

  if (!VEHICULES.includes(vehicule as typeof VEHICULES[number])) {
    return NextResponse.json({ erreur: "Véhicule invalide" }, { status: 400 });
  }
  if (!zone?.trim()) {
    return NextResponse.json({ erreur: "Zone d'intervention requise" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Empêche les doublons — une candidature en_attente suffit
  const { data: existante } = await admin
    .from("candidatures_livreur")
    .select("id")
    .eq("utilisateur_id", user.id)
    .eq("statut", "en_attente")
    .maybeSingle();

  if (existante) {
    return NextResponse.json({ erreur: "Vous avez déjà une candidature en cours d'examen" }, { status: 409 });
  }

  await admin.from("candidatures_livreur").insert({
    utilisateur_id: user.id,
    vehicule,
    zone: zone.trim(),
    message: message?.trim() || null,
  });

  // Notifie les admins
  const { data: admins } = await admin
    .from("utilisateurs").select("id").eq("role", "admin");
  if (admins?.length) {
    void envoyerPushUtilisateurs(admins.map((a) => a.id), {
      title: "Nouvelle candidature livreur 🏍️",
      body: `${profil.role === "acheteur" ? "Un utilisateur" : profil.role} souhaite devenir livreur.`,
      url: "/admin/candidatures",
      tag: "candidature-livreur",
    });
  }

  return NextResponse.json({ succes: true });
}

// Approbation / refus — admin uniquement
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const { candidature_id, decision } = await req.json() as {
    candidature_id: string;
    decision: "approuvee" | "refusee";
  };
  if (!candidature_id || !["approuvee", "refusee"].includes(decision)) {
    return NextResponse.json({ erreur: "Paramètres invalides" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: candidature } = await admin
    .from("candidatures_livreur")
    .select("id, utilisateur_id, statut")
    .eq("id", candidature_id)
    .single();

  if (!candidature) return NextResponse.json({ erreur: "Candidature introuvable" }, { status: 404 });
  if (candidature.statut !== "en_attente") {
    return NextResponse.json({ erreur: "Candidature déjà traitée" }, { status: 400 });
  }

  await admin.from("candidatures_livreur").update({
    statut: decision,
    traite_par: user.id,
    traite_le: new Date().toISOString(),
  }).eq("id", candidature_id);

  if (decision === "approuvee") {
    await admin.from("utilisateurs").update({ role: "livreur" }).eq("id", candidature.utilisateur_id);

    void envoyerPushUtilisateurs([candidature.utilisateur_id], {
      title: "Candidature approuvée 🎉",
      body: "Félicitations ! Vous êtes maintenant livreur sur J'adore la Famille.",
      url: "/livreur",
      tag: "candidature-approuvee",
    });
  } else {
    void envoyerPushUtilisateurs([candidature.utilisateur_id], {
      title: "Candidature non retenue",
      body: "Votre demande n'a pas pu être acceptée pour le moment.",
      url: "/",
      tag: "candidature-refusee",
    });
  }

  return NextResponse.json({ succes: true });
}
