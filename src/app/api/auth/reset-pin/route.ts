// API: Réinitialiser PIN après récupération

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pseudo, reset_token, new_pin } = body;

    // 1. Validation
    if (!pseudo || !reset_token || !new_pin) {
      return NextResponse.json(
        { erreur: "Paramètres requis manquants" },
        { status: 400 }
      );
    }

    if (!/^\d{4,6}$/.test(new_pin)) {
      return NextResponse.json(
        { erreur: "PIN: 4-6 chiffres" },
        { status: 400 }
      );
    }

    // 2. Récupérer l'utilisateur
    const admin = createAdminClient();
    const { data: user } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id")
      .eq("pseudo", pseudo)
      .maybeSingle()) as any;

    if (!user) {
      return NextResponse.json(
        { erreur: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // 3. Vérifier le reset_token (doit être valide et non expiré)
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(reset_token)
      .digest("hex");

    const { data: session } = await (admin
      .from("user_sessions" as any)
      .select("id, expires_at")
      .eq("user_id", user.id)
      .eq("token_hash", resetTokenHash)
      .eq("device_id", "password_reset")
      .maybeSingle()) as any;

    if (
      !session ||
      new Date(session.expires_at) < new Date()
    ) {
      return NextResponse.json(
        { erreur: "Token de réinitialisation expiré ou invalide" },
        { status: 401 }
      );
    }

    // 4. Hash le nouveau PIN
    const newPinHash = crypto
      .createHmac("sha256", "brotega_salt_2026")
      .update(new_pin)
      .digest("hex");

    // 5. Mettre à jour le PIN
    const { error: updateError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .update({
        pin_hash: newPinHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)) as any;

    if (updateError) {
      return NextResponse.json(
        { erreur: "Erreur mise à jour PIN" },
        { status: 500 }
      );
    }

    // 6. Supprimer la session de réinitialisation
    await (admin
      .from("user_sessions" as any)
      .delete()
      .eq("id", session.id)) as any;

    // 7. Log action réussie
    await (admin
      .from("recovery_attempts" as any)
      .insert({
        user_id: user.id,
        action: "pin_reset",
        success: true,
        ip_address: req.ip,
        user_agent: req.headers.get("user-agent"),
      })) as any;

    return NextResponse.json(
      {
        succes: true,
        message: "PIN réinitialisé avec succès! Vous pouvez maintenant vous connecter.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/auth/reset-pin]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
