import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPushUtilisateurs } from "@/lib/push";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const { livreur_id } = await req.json() as { livreur_id: string };
  if (!livreur_id) return NextResponse.json({ erreur: "livreur_id requis" }, { status: 400 });

  const admin = createAdminClient();

  // Récupère toutes les livraisons livrées non payées de ce livreur
  const { data: livraisons } = await admin
    .from("livraisons")
    .select("id, remuneration_xaf")
    .eq("livreur_id", livreur_id)
    .eq("statut", "livree")
    .eq("remuneration_versee", false);

  if (!livraisons?.length) {
    return NextResponse.json({ erreur: "Aucun gain à verser" }, { status: 400 });
  }

  const total = livraisons.reduce((s, l) => s + (l.remuneration_xaf ?? 0), 0);
  const ids = livraisons.map((l) => l.id);
  const maintenant = new Date().toISOString();

  await admin.from("livraisons").update({
    remuneration_versee: true,
    remuneration_versee_at: maintenant,
  }).in("id", ids);

  // Notifie le livreur
  void envoyerPushUtilisateurs([livreur_id], {
    title: "Paiement reçu 💰",
    body: `Vos gains de ${total.toLocaleString("fr-FR")} XAF ont été versés sur votre Mobile Money.`,
    url: "/livreur",
    tag: "paiement-livreur",
  });

  return NextResponse.json({ succes: true, montant_verse: total, nb_livraisons: ids.length });
}
