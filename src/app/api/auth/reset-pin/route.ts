/**
 * API: Réinitialiser PIN après récupération
 * ✅ Production-grade security:
 * - Bcrypt PIN hashing (12 rounds)
 * - Token expiration checking
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { hashPIN } from "@/lib/pin-secure";
import { validatePseudo, validatePIN, getClientIP } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    const body = await req.json();
    const { pseudo: rawPseudo, reset_token, new_pin: rawNewPin } = body;

    // 1. ✅ VALIDATE INPUTS
    const pseudo = validatePseudo(rawPseudo);
    if (!pseudo) {
      return NextResponse.json(
        { erreur: "Pseudo invalide" },
        { status: 400 }
      );
    }

    const newPin = validatePIN(rawNewPin);
    if (!newPin) {
      return NextResponse.json(
        { erreur: "PIN invalide (4-6 chiffres)" },
        { status: 400 }
      );
    }

    if (!reset_token) {
      return NextResponse.json(
        { erreur: "Token de réinitialisation requis" },
        { status: 400 }
      );
    }

    // 2. ✅ FETCH USER
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

    // 3. ✅ VERIFY RESET TOKEN
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

    if (!session || new Date(session.expires_at) < new Date()) {
      console.warn(`[AUTH] Invalid or expired reset token for user ${user.id}`);
      return NextResponse.json(
        { erreur: "Token de réinitialisation expiré ou invalide" },
        { status: 401 }
      );
    }

    // 4. ✅ HASH NEW PIN WITH BCRYPT
    let newPinHash: string;
    try {
      newPinHash = await hashPIN(newPin);
    } catch (err) {
      console.error("[AUTH] PIN hashing failed:", err);
      return NextResponse.json(
        { erreur: "Erreur lors du hash du PIN" },
        { status: 500 }
      );
    }

    // 5. ✅ UPDATE PIN
    const { error: updateError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .update({
        pin_hash: newPinHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)) as any;

    if (updateError) {
      console.error("[AUTH] PIN update error:", updateError);
      return NextResponse.json(
        { erreur: "Erreur mise à jour PIN" },
        { status: 500 }
      );
    }

    // 6. ✅ DELETE RESET SESSION
    await (admin
      .from("user_sessions" as any)
      .delete()
      .eq("id", session.id)) as any;

    // 7. ✅ LOG SUCCESS
    await (admin
      .from("recovery_attempts" as any)
      .insert({
        user_id: user.id,
        action: "pin_reset",
        success: true,
        ip_address: ip,
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
