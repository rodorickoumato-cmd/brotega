import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fraisLivraison } from "@/lib/rules";

const TAUX_REMUNERATION_LIVREUR = 0.6; // 60% des frais de livraison

function genererCode6Chiffres(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: livraisonId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "livreur" && profil?.role !== "admin") {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: livraison } = await admin
    .from("livraisons")
    .select("id, livreur_id, statut, commande_id")
    .eq("id", livraisonId)
    .single();

  if (!livraison) return NextResponse.json({ erreur: "Livraison introuvable" }, { status: 404 });
  if (profil?.role === "livreur" && livraison.livreur_id !== user.id) {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });
  }
  if (livraison.statut !== "assignee") {
    return NextResponse.json({ erreur: "Cette livraison ne peut pas être démarrée" }, { status: 400 });
  }

  // Récupérer la commande pour le téléphone client et calcul rémunération
  const { data: commande } = await admin
    .from("commandes")
    .select("adresse, frais_livraison")
    .eq("id", livraison.commande_id)
    .single();

  const adresse = commande?.adresse as { telephone?: string } | null;
  const fraisLiv = commande?.frais_livraison ?? fraisLivraison("Libreville", "Libreville");
  const remuneration = Math.round(fraisLiv * TAUX_REMUNERATION_LIVREUR);
  const code = genererCode6Chiffres();

  await admin.from("livraisons").update({
    statut:           "en_route",
    code_confirmation: code,
    client_telephone: adresse?.telephone ?? null,
    remuneration_xaf: remuneration,
    assignee_at:      new Date().toISOString(),
  }).eq("id", livraisonId);

  return NextResponse.json({ succes: true, code });
}
