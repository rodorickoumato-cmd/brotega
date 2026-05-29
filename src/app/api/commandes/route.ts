import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { genererCodeCommande } from "@/lib/orderCode";
import { getProvider } from "@/lib/payment";
import type { ProviderId } from "@/lib/payment";
import { vers241 } from "@/lib/phone";
import { fraisLivraison, TAUX_COMMISSION, FRAIS_MOBILE_MONEY_TAUX } from "@/lib/rules";
import { envoyerEmailConfirmationCommande, envoyerEmailNouvelleCommande } from "@/lib/email";

type ItemPanier = {
  produit_id: string;
  nom: string;
  prix_xaf: number;
  quantite: number;
  image: string | null;
  vendeur_id: string;
};

function modeVersProvider(mode: string): ProviderId {
  if (mode === "airtel_money") return "airtel";
  if (mode === "moov_money") return "moov";
  return "cash";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function envoyerEmailsCommande(admin: any, params: {
  commandeId: string; codeCourt: string; total: number;
  items: ItemPanier[]; modePaiement: string;
  acheteurId: string; acheteurEmail: string | null; vendeurId: string;
}) {
  try {
    const articles = params.items.map((i) => ({ nom: i.nom, quantite: i.quantite, prix: i.prix_xaf }));
    if (params.acheteurEmail) {
      const { data: acheteur } = await admin.from("utilisateurs").select("nom").eq("id", params.acheteurId).single();
      await envoyerEmailConfirmationCommande({
        to: params.acheteurEmail, nom: acheteur?.nom ?? "Client",
        codeCourt: params.codeCourt, total: params.total, articles, modePaiement: params.modePaiement,
      });
    }
    const { data: vendeur } = await admin.from("vendeurs").select("nom, utilisateur_id").eq("id", params.vendeurId).single();
    if (vendeur?.utilisateur_id) {
      const { data: { user: vendeurUser } } = await admin.auth.admin.getUserById(vendeur.utilisateur_id);
      if (vendeurUser?.email) {
        await envoyerEmailNouvelleCommande({
          to: vendeurUser.email, nomVendeur: vendeur.nom,
          codeCourt: params.codeCourt, total: params.total, articles,
        });
      }
    }
  } catch { /* never crash order flow */ }
}

export async function POST(request: NextRequest) {
  try {
    const input = await request.json() as {
      items: ItemPanier[];
      adresse: { nom_complet: string; telephone: string; ville: string; quartier?: string; details?: string };
      mode_paiement: string;
      telephone_paiement?: string;
    };

    if (!input.items || input.items.length === 0) {
      return NextResponse.json({ erreur: "Panier vide." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ erreur: "Vous devez être connecté pour commander." }, { status: 401 });

    const vendeurIdsClient = [...new Set(input.items.map((i) => i.vendeur_id))];
    if (vendeurIdsClient.length > 1) {
      return NextResponse.json({ erreur: "Vous ne pouvez commander qu'auprès d'un seul vendeur à la fois." }, { status: 400 });
    }

    const admin = createAdminClient();

    const produitIds = [...new Set(input.items.map((i) => i.produit_id))];
    const { data: produitsDB, error: errProduits } = await admin
      .from("produits").select("id, nom, prix, vendeur_id, image").in("id", produitIds).eq("statut", "actif");

    if (errProduits || !produitsDB || produitsDB.length !== produitIds.length) {
      // Diagnostic : chercher sans filtre statut pour distinguer "inexistant" vs "inactif"
      const { data: tousProduits } = await admin
        .from("produits").select("id, nom, statut").in("id", produitIds);
      const trouvesActifsIds = (produitsDB ?? []).map((p) => p.id);
      const manquants = produitIds.filter((id) => !trouvesActifsIds.includes(id));
      const inactifs = (tousProduits ?? []).filter((p) => p.statut !== "actif");
      const inexistants = manquants.filter((id) => !(tousProduits ?? []).find((p) => p.id === id));

      if (errProduits) {
        return NextResponse.json({ erreur: `Erreur base de données : ${errProduits.message}` }, { status: 500 });
      }
      if (inactifs.length > 0) {
        return NextResponse.json({
          erreur: `"${inactifs[0].nom}" n'est plus disponible. Retirez-le du panier et réessayez.`,
        }, { status: 400 });
      }
      if (inexistants.length > 0) {
        return NextResponse.json({
          erreur: `Produit introuvable dans votre panier. Videz le panier, retournez au catalogue et ajoutez à nouveau le produit.`,
        }, { status: 400 });
      }
      return NextResponse.json({ erreur: "Un ou plusieurs produits sont indisponibles." }, { status: 400 });
    }

    const produitMap = new Map(produitsDB.map((p) => [p.id, p]));
    const vendeurIdsDB = [...new Set(produitsDB.map((p) => p.vendeur_id))];
    if (vendeurIdsDB.length > 1) {
      return NextResponse.json({ erreur: "Tous les produits doivent appartenir au même vendeur." }, { status: 400 });
    }
    const vendeurId = vendeurIdsDB[0] as string;

    const itemsVerifies: ItemPanier[] = input.items.map((it) => {
      const db = produitMap.get(it.produit_id)!;
      return { produit_id: it.produit_id, nom: db.nom, prix_xaf: db.prix, quantite: Math.max(1, Math.floor(it.quantite)), image: db.image ?? null, vendeur_id: db.vendeur_id };
    });

    // Récupérer la ville du vendeur pour le calcul des frais de livraison
    const { data: vendeurInfo } = await admin
      .from("vendeurs").select("ville").eq("id", vendeurId).single();
    const villeVendeur = vendeurInfo?.ville ?? "Libreville";

    const sousTotal  = itemsVerifies.reduce((s, it) => s + it.prix_xaf * it.quantite, 0);
    const livraison  = fraisLivraison(villeVendeur, input.adresse.ville);
    const estMM      = input.mode_paiement === "airtel_money" || input.mode_paiement === "moov_money";
    const fraisMM    = estMM ? Math.round((sousTotal + livraison) * FRAIS_MOBILE_MONEY_TAUX) : 0;
    const total      = sousTotal + livraison + fraisMM;
    // commission_xaf stocke les frais plateforme (Mobile Money inclus) — déduits de l'escrow
    const commission = Math.round(sousTotal * TAUX_COMMISSION) + fraisMM;

    const isMM = input.mode_paiement === "airtel_money" || input.mode_paiement === "moov_money";
    let phoneMM: string | null = null;
    if (isMM) {
      phoneMM = vers241(input.telephone_paiement ?? input.adresse.telephone);
      if (!phoneMM) return NextResponse.json({ erreur: "Numéro Mobile Money invalide." }, { status: 400 });
    }

    let code: string | null = null;
    for (let i = 0; i < 3; i++) {
      const candidat = genererCodeCommande();
      const { data: existant } = await admin.from("commandes").select("id").eq("code_court", candidat).maybeSingle();
      if (!existant) { code = candidat; break; }
    }
    if (!code) return NextResponse.json({ erreur: "Erreur génération code. Réessayez." }, { status: 500 });

    const { data: commande, error: errInsert } = await admin
      .from("commandes")
      .insert({
        code_court: code,
        utilisateur_id: user.id,
        vendeur_id: vendeurId,
        articles: itemsVerifies,
        total,
        frais_livraison: livraison,
        commission_xaf: commission,
        mode_paiement: input.mode_paiement as "airtel_money" | "moov_money" | "especes",
        telephone_paiement: phoneMM,
        adresse: input.adresse,
        // Espèces : pas d'escrow mais le vendeur doit pouvoir confirmer → payee_escrow d'emblée
        statut: input.mode_paiement === "especes" ? "payee_escrow" : "en_attente_paiement",
        statut_paiement: "en_attente",
      })
      .select("id, code_court")
      .single();

    if (errInsert || !commande) {
      return NextResponse.json({ erreur: "Erreur création commande : " + (errInsert?.message ?? "inconnue") }, { status: 500 });
    }

    void envoyerEmailsCommande(admin, {
      commandeId: commande.id, codeCourt: commande.code_court!, total,
      items: itemsVerifies, modePaiement: input.mode_paiement,
      acheteurId: user.id, acheteurEmail: user.email ?? null, vendeurId,
    });

    if (input.mode_paiement === "especes") {
      return NextResponse.json({ succes: true, code: commande.code_court!, instructions: "Paiement à la livraison" });
    }

    const providerId = modeVersProvider(input.mode_paiement);
    const provider = getProvider(providerId);
    const idempotencyKey = `cmd-${commande.id}`;
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
    const webhookUrl = `${base}/api/webhooks/paiements`;

    const { data: paiement, error: errPaiement } = await admin
      .from("paiements")
      .insert({
        commande_id: commande.id,
        provider: providerId,
        idempotency_key: idempotencyKey,
        montant_xaf: total,
        telephone: phoneMM,
        statut: "initie",
      })
      .select("id")
      .single();

    if (errPaiement || !paiement) {
      return NextResponse.json({ erreur: "Erreur création paiement : " + (errPaiement?.message ?? "inconnue") }, { status: 500 });
    }

    const res = await provider.initier({
      idempotencyKey, montantXaf: total, telephone: phoneMM!,
      provider: providerId, commandeCode: commande.code_court!,
      commandeId: commande.id, webhookUrl,
    });

    if (!res.ok) {
      await admin.from("paiements").update({ statut: "echec", message_erreur: res.erreur }).eq("id", paiement.id);
      return NextResponse.json({ erreur: "Échec paiement : " + res.erreur }, { status: 502 });
    }

    await admin.from("paiements")
      .update({ provider_ref: res.providerRef, statut: res.statut === "reussi" ? "reussi" : "en_attente" })
      .eq("id", paiement.id);

    return NextResponse.json({ succes: true, code: commande.code_court!, instructions: res.instructions ?? "Validez le paiement sur votre téléphone" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erreur: "Erreur serveur : " + msg }, { status: 500 });
  }
}
