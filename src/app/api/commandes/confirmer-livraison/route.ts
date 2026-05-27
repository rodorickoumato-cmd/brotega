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

    const { data: commande } = await supabase
      .from("commandes")
      .select("id, vendeur_id, total, frais_livraison, commission_xaf, statut, utilisateur_id, code_court")
      .eq("id", commandeId)
      .single();

    if (!commande || commande.utilisateur_id !== user.id) {
      return NextResponse.json({ erreur: "Commande introuvable" }, { status: 404 });
    }
    if (!["payee_escrow", "confirmee_vendeur", "en_livraison"].includes(commande.statut)) {
      return NextResponse.json({ erreur: "Cette commande ne peut pas encore être confirmée." }, { status: 400 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    await admin.from("commandes")
      .update({ statut: "livree", livree_at: now, escrow_libere_at: now })
      .eq("id", commandeId);

    const montantEscrow = commande.total - (commande.frais_livraison ?? 0);
    await admin.rpc("liberer_escrow", {
      p_vendeur_id: commande.vendeur_id!,
      p_montant: montantEscrow,
      p_commission: commande.commission_xaf,
      p_commande_id: commande.id,
    });

    // Notifier le vendeur que sa commande est livrée
    if (commande.vendeur_id) {
      const { data: vendeur } = await admin
        .from("vendeurs").select("utilisateur_id").eq("id", commande.vendeur_id).single();
      if (vendeur?.utilisateur_id) {
        void envoyerPushUtilisateurs([vendeur.utilisateur_id], {
          title: "Livraison confirmée",
          body: `Commande ${commande.code_court} livrée. Paiement libéré.`,
          url: `/vendor/dashboard`,
          tag: "commande-livree",
        });
      }
    }

    return NextResponse.json({ succes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erreur: "Erreur serveur : " + msg }, { status: 500 });
  }
}
