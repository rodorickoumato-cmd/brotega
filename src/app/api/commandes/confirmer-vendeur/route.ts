import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPushUtilisateurs } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const { commandeId } = await req.json() as { commandeId: string };
    if (!commandeId) return NextResponse.json({ erreur: "ID manquant" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

    const { data: vendeur } = await supabase
      .from("vendeurs").select("id").eq("utilisateur_id", user.id).maybeSingle();
    if (!vendeur) return NextResponse.json({ erreur: "Vous n'êtes pas vendeur" }, { status: 403 });

    const { data: commande } = await supabase
      .from("commandes")
      .select("id, statut, vendeur_id, utilisateur_id, code_court")
      .eq("id", commandeId).single();

    if (!commande || commande.vendeur_id !== vendeur.id) {
      return NextResponse.json({ erreur: "Commande introuvable" }, { status: 404 });
    }
    if (commande.statut !== "payee_escrow") {
      return NextResponse.json({ erreur: "Cette commande ne peut pas être confirmée." }, { status: 400 });
    }

    const admin = createAdminClient();
    await admin.from("commandes").update({ statut: "confirmee_vendeur" }).eq("id", commandeId);
    await admin.from("livraisons").insert({ commande_id: commandeId, statut: "en_attente" });

    // Notifier l'acheteur
    if (commande.utilisateur_id) {
      void envoyerPushUtilisateurs([commande.utilisateur_id], {
        title: "Commande confirmée",
        body: `Le vendeur a confirmé votre commande ${commande.code_court}. Livraison en cours.`,
        url: `/commande/${commande.code_court}`,
        tag: "commande-confirmee",
      });
    }

    return NextResponse.json({ succes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erreur: "Erreur serveur : " + msg }, { status: 500 });
  }
}
