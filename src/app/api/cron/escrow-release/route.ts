import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPushUtilisateurs } from "@/lib/push";
import { formatXAF } from "@/lib/utils";

export const maxDuration = 60;

// Déclenché par Vercel Cron chaque nuit à 3h UTC.
// Libère l'escrow pour toute commande restée "en_livraison" plus de 7 jours
// sans confirmation de l'acheteur (délai de grâce de la plateforme).
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: commandes, error } = await admin
    .from("commandes")
    .select("id, vendeur_id, total, commission_xaf, code_court")
    .eq("statut", "en_livraison")
    .lt("updated_at", cutoff)
    .is("escrow_libere_at", null);

  if (error) {
    console.error("[cron/escrow-release]", error.message);
    return NextResponse.json({ erreur: error.message }, { status: 500 });
  }

  if (!commandes?.length) {
    return NextResponse.json({ traites: 0, total: 0 });
  }

  let traites = 0;
  const echecs: string[] = [];

  for (const cmd of commandes) {
    try {
      if (!cmd.vendeur_id) continue;
      const montantNet = cmd.total - cmd.commission_xaf;
      const now = new Date().toISOString();

      await admin.rpc("liberer_escrow", {
        p_vendeur_id: cmd.vendeur_id,
        p_montant: montantNet,
        p_commission: cmd.commission_xaf,
        p_commande_id: cmd.id,
      });

      await admin.from("commandes").update({
        statut: "livree",
        livree_at: now,
        escrow_libere_at: now,
      }).eq("id", cmd.id);

      const { data: vendeur } = await admin
        .from("vendeurs").select("utilisateur_id").eq("id", cmd.vendeur_id).single();

      if (vendeur?.utilisateur_id) {
        void envoyerPushUtilisateurs([vendeur.utilisateur_id], {
          title: "Paiement libéré",
          body: `Commande ${cmd.code_court ?? ""} — ${formatXAF(montantNet)} disponibles dans votre wallet.`,
          url: "/vendeur/wallet",
          tag: "escrow-auto-libere",
        });
      }

      traites++;
    } catch (e) {
      // Isoler chaque commande — un échec ne bloque pas les suivantes
      echecs.push(cmd.id);
      console.error("[cron/escrow-release] commande", cmd.id, e);
    }
  }

  return NextResponse.json({ traites, total: commandes.length, echecs });
}
