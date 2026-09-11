// API : Gérer la configuration de commission du vendeur
// GET  /api/vendor/commission → récupère la config actuele
// POST /api/vendor/commission → met à jour la commission par défaut

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validerCommission } from "@/lib/rules";

/**
 * GET /api/vendor/commission
 * Récupère les paramètres de commission du vendeur authentifié
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Récupérer l'utilisateur authentifié
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
    }

    // 2. Récupérer le vendeur de cet utilisateur
    const { data: vendeur, error: vendeurErr } = await supabase
      .from("vendeurs")
      .select("id")
      .eq("utilisateur_id", user.id)
      .maybeSingle();

    if (vendeurErr || !vendeur) {
      return NextResponse.json({ erreur: "Vendeur non trouvé" }, { status: 404 });
    }

    // 3. Récupérer la config de commission
    const { data: config, error: configErr } = await (supabase
      .from("vendor_commission_settings" as any)
      .select("*")
      .eq("vendeur_id", vendeur.id)
      .maybeSingle()) as any;

    if (configErr) {
      return NextResponse.json({ erreur: "Erreur base de données" }, { status: 500 });
    }

    // 4. Récupérer les articles avec commission custom
    const { data: produitsCom, error: prodErr } = await (supabase
      .from("produit_commission" as any)
      .select("id, produit_id, commission, raison, created_at")
      .eq("vendeur_id", vendeur.id)
      .order("created_at", { ascending: false })) as any;

    if (prodErr) {
      return NextResponse.json({ erreur: "Erreur produits" }, { status: 500 });
    }

    // 5. Enrichir avec les noms des produits
    const { data: produits } = await supabase
      .from("produits")
      .select("id, nom")
      .in("id", produitsCom?.map((p: any) => p.produit_id) || []);

    const produitMap = new Map(produits?.map((p: any) => [p.id, p.nom]) || []);
    const produitsCustom = produitsCom?.map((pc: any) => ({
      ...pc,
      produit_nom: produitMap.get(pc.produit_id) || "Produit supprimé",
    })) || [];

    return NextResponse.json({
      config: config || {
        commission_defaut: 0.05,
        commission_min: 0.02,
        commission_max: 0.15,
        actif: true,
      },
      produits_custom: produitsCustom,
      statistiques: {
        nb_produits_custom: produitsCustom.length,
        commission_moyenne: produitsCustom.length > 0
          ? produitsCustom.reduce((sum: number, p: any) => sum + p.commission, 0) / produitsCustom.length
          : 0,
      },
    });
  } catch (err) {
    console.error("[GET /api/vendor/commission]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/vendor/commission
 * Met à jour la commission par défaut du vendeur
 * Body: { commission_defaut: 0.04 }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { commission_defaut } = body;

    // 1. Valider input
    if (typeof commission_defaut !== "number") {
      return NextResponse.json(
        { erreur: "commission_defaut invalide" },
        { status: 400 }
      );
    }

    const val = validerCommission(commission_defaut);
    if (!val.valide) {
      return NextResponse.json({ erreur: val.erreur }, { status: 400 });
    }

    // 2. Récupérer utilisateur authentifié
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
    }

    // 3. Récupérer le vendeur
    const { data: vendeur, error: vendeurErr } = await supabase
      .from("vendeurs")
      .select("id")
      .eq("utilisateur_id", user.id)
      .maybeSingle();

    if (vendeurErr || !vendeur) {
      return NextResponse.json({ erreur: "Vendeur non trouvé" }, { status: 404 });
    }

    // 4. Récupérer l'ancienne valeur pour l'historique
    const { data: oldConfig } = await (supabase
      .from("vendor_commission_settings" as any)
      .select("commission_defaut")
      .eq("vendeur_id", vendeur.id)
      .maybeSingle()) as any;

    // 5. Mettre à jour ou créer la config
    const { data: updatedConfig, error: updateErr } = await (supabase
      .from("vendor_commission_settings" as any)
      .upsert(
        {
          vendeur_id: vendeur.id,
          commission_defaut,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "vendeur_id" }
      )
      .select()
      .maybeSingle()) as any;

    if (updateErr) {
      return NextResponse.json({ erreur: "Erreur mise à jour" }, { status: 500 });
    }

    // 6. Enregistrer dans l'historique
    await (supabase.from("commission_history" as any).insert({
      vendeur_id: vendeur.id,
      commission_ancien: oldConfig?.commission_defaut,
      commission_nouveau: commission_defaut,
      change_type: "defaut_update",
      raison: "Mise à jour par vendeur",
      changed_by_vendeur_id: vendeur.id,
    })) as any;

    return NextResponse.json(
      {
        succes: true,
        config: updatedConfig,
        message: `Commission par défaut mise à jour à ${(commission_defaut * 100).toFixed(1)}%`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/vendor/commission]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
