import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPushUtilisateurs } from "@/lib/push";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: livraisonId } = await params;
  const { code } = await req.json() as { code: string };

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ erreur: "Code invalide (6 chiffres requis)" }, { status: 400 });
  }

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
    .select("id, livreur_id, statut, commande_id, code_confirmation")
    .eq("id", livraisonId)
    .single();

  if (!livraison) return NextResponse.json({ erreur: "Livraison introuvable" }, { status: 404 });
  if (profil?.role === "livreur" && livraison.livreur_id !== user.id) {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });
  }
  if (livraison.statut !== "en_route") {
    return NextResponse.json({ erreur: "La livraison doit être en route" }, { status: 400 });
  }
  if (livraison.code_confirmation !== code) {
    return NextResponse.json({ erreur: "Code incorrect — vérifiez avec le client" }, { status: 422 });
  }

  const maintenant = new Date().toISOString();

  await admin.from("livraisons").update({
    statut:              "livree",
    livree_at:           maintenant,
    code_utilise_at:     maintenant,
    remuneration_versee: false,
  }).eq("id", livraisonId);

  await admin.from("commandes").update({
    statut:    "livree",
    livree_at: maintenant,
  }).eq("id", livraison.commande_id);

  // Récupère la rémunération pour la notification
  const { data: liv } = await admin
    .from("livraisons")
    .select("remuneration_xaf, livreur_id")
    .eq("id", livraisonId)
    .single();

  if (liv?.livreur_id) {
    const gain = liv.remuneration_xaf ?? 0;
    void envoyerPushUtilisateurs([liv.livreur_id], {
      title: "Livraison confirmée ✅",
      body: gain > 0
        ? `Bravo ! Gain de ${gain.toLocaleString("fr-FR")} XAF — paiement sous 24h.`
        : "Livraison validée avec succès.",
      url: "/livreur",
      tag: "livraison-confirmee",
    });
  }

  return NextResponse.json({ succes: true });
}
