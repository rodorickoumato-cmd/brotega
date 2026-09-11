// API : Gérer commission spécifique d'un produit
// PATCH /api/vendor/commission/produit/:id → définit commission custom
// DELETE /api/vendor/commission/produit/:id → réinitialise à la défaut

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validerCommission } from "@/lib/rules";

/**
 * PATCH /api/vendor/commission/produit/:id
 * Définit ou met à jour la commission spécifique d'un produit
 * Body: { commission: 0.03, raison?: "Article populaire" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: produitId } = await params;
    const body = await req.json();
    const { commission, raison } = body;

    // 1. Valider input
    if (typeof commission !== "number") {
      return NextResponse.json(
        { erreur: "commission invalide" },
        { status: 400 }
      );
    }

    const val = validerCommission(commission);
    if (!val.valide) {
      return NextResponse.json({ erreur: val.erreur }, { status: 400 });
    }

    // 2. Récupérer utilisateur authentifié
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
    }

    // 3. Récupérer le vendeur
    const { data: vendeur } = await supabase
      .from("vendeurs")
      .select("id")
      .eq("utilisateur_id", user.id)
      .maybeSingle();

    if (!vendeur) {
      return NextResponse.json({ erreur: "Vendeur non trouvé" }, { status: 404 });
    }

    // 4. Vérifier que le produit appartient au vendeur
    const { data: produit, error: prodErr } = await supabase
      .from("produits")
      .select("id, nom")
      .eq("id", produitId)
      .eq("vendeur_id", vendeur.id)
      .maybeSingle();

    if (prodErr || !produit) {
      return NextResponse.json(
        { erreur: "Produit non trouvé ou pas propriétaire" },
        { status: 404 }
      );
    }

    // 5. Récupérer l'ancienne commission (s'il existe)
    const { data: oldCom } = await (supabase
      .from("produit_commission" as any)
      .select("commission")
      .eq("produit_id", produitId)
      .maybeSingle()) as any;

    // 6. Upsert la commission custom
    const { data: newCom, error: insertErr } = await (supabase
      .from("produit_commission" as any)
      .upsert(
        {
          produit_id: produitId,
          vendeur_id: vendeur.id,
          commission,
          raison: raison || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "produit_id" }
      )
      .select()
      .maybeSingle()) as any;

    if (insertErr) {
      return NextResponse.json({ erreur: "Erreur mise à jour" }, { status: 500 });
    }

    // 7. Enregistrer dans l'historique
    await (supabase.from("commission_history" as any).insert({
      vendeur_id: vendeur.id,
      produit_id: produitId,
      commission_ancien: oldCom?.commission,
      commission_nouveau: commission,
      change_type: oldCom ? "custom_update" : "custom_create",
      raison: raison || null,
      changed_by_vendeur_id: vendeur.id,
    })) as any;

    return NextResponse.json(
      {
        succes: true,
        commission: newCom,
        message: `Commission de "${produit.nom}" → ${(commission * 100).toFixed(1)}%`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PATCH /api/vendor/commission/produit/:id]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/vendor/commission/produit/:id
 * Réinitialise la commission du produit à la défaut
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: produitId } = await params;

    // 1. Récupérer utilisateur authentifié
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
    }

    // 2. Récupérer le vendeur
    const { data: vendeur } = await supabase
      .from("vendeurs")
      .select("id")
      .eq("utilisateur_id", user.id)
      .maybeSingle();

    if (!vendeur) {
      return NextResponse.json({ erreur: "Vendeur non trouvé" }, { status: 404 });
    }

    // 3. Récupérer le produit et sa commission custom
    const { data: produit } = await supabase
      .from("produits")
      .select("id, nom")
      .eq("id", produitId)
      .eq("vendeur_id", vendeur.id)
      .maybeSingle();

    if (!produit) {
      return NextResponse.json(
        { erreur: "Produit non trouvé" },
        { status: 404 }
      );
    }

    // 4. Récupérer la commission avant suppression
    const { data: oldCom } = await (supabase
      .from("produit_commission" as any)
      .select("commission")
      .eq("produit_id", produitId)
      .maybeSingle()) as any;

    if (!oldCom) {
      return NextResponse.json(
        { erreur: "Pas de commission custom définie pour ce produit" },
        { status: 400 }
      );
    }

    // 5. Supprimer la commission custom
    const { error: delErr } = await (supabase
      .from("produit_commission" as any)
      .delete()
      .eq("produit_id", produitId)) as any;

    if (delErr) {
      return NextResponse.json({ erreur: "Erreur suppression" }, { status: 500 });
    }

    // 6. Enregistrer dans l'historique
    const { data: defautConfig } = await (supabase
      .from("vendor_commission_settings" as any)
      .select("commission_defaut")
      .eq("vendeur_id", vendeur.id)
      .maybeSingle()) as any;

    await (supabase.from("commission_history" as any).insert({
      vendeur_id: vendeur.id,
      produit_id: produitId,
      commission_ancien: oldCom.commission,
      commission_nouveau: defautConfig?.commission_defaut || 0.05,
      change_type: "custom_reset",
      raison: "Réinitialisé à la commission par défaut",
      changed_by_vendeur_id: vendeur.id,
    })) as any;

    return NextResponse.json(
      {
        succes: true,
        message: `Commission de "${produit.nom}" réinitialisée à la défaut`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[DELETE /api/vendor/commission/produit/:id]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
