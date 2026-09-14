/**
 * API: Connexion - Pseudo + PIN
 * ✅ Production-grade security:
 * - Rate limiting (5 attempts per 15 min)
 * - JWT signature verification
 * - Bcrypt PIN verification
 * - Input validation
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { generateJWT } from "@/lib/jwt-secure";
import { verifyPIN } from "@/lib/pin-secure";
import { checkRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/rate-limit";
import { validatePseudo, validatePIN, getClientIP } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    // ✅ RATE LIMITING (5 attempts per 15 min)
    const rateCheck = await checkRateLimit(ip, RATE_LIMITS.LOGIN);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          erreur: "Trop de tentatives. Réessayez dans 15 minutes.",
          resetAt: rateCheck.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }

    // 1. ✅ PARSE & VALIDATE INPUTS
    const body = await req.json();
    const { pseudo: rawPseudo, pin: rawPin } = body;

    // ✅ Validate pseudo format
    const pseudo = validatePseudo(rawPseudo);
    if (!pseudo) {
      return NextResponse.json(
        { erreur: "Pseudo invalide (3-50 caractères, alphanumérique)" },
        { status: 400 }
      );
    }

    // ✅ Validate PIN format
    const pin = validatePIN(rawPin);
    if (!pin) {
      return NextResponse.json(
        { erreur: "PIN invalide (4-6 chiffres)" },
        { status: 400 }
      );
    }

    // 2. ✅ FETCH USER
    const admin = createAdminClient();
    const { data: user, error: fetchError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("*")
      .eq("pseudo", pseudo)
      .single()) as any;

    if (fetchError || !user) {
      console.warn(`[AUTH] Login failed: user not found for pseudo ${pseudo}`);
      return NextResponse.json(
        { erreur: "Pseudo ou PIN incorrect" },
        { status: 401 }
      );
    }

    // 3. ✅ VERIFY PIN WITH BCRYPT
    let pinValid = false;
    try {
      pinValid = await verifyPIN(pin, user.pin_hash);
    } catch (err) {
      console.error("[AUTH] PIN verification error:", err);
      return NextResponse.json(
        { erreur: "Erreur lors de la vérification" },
        { status: 500 }
      );
    }

    if (!pinValid) {
      console.warn(`[AUTH] Login failed: invalid PIN for user ${user.id}`);
      return NextResponse.json(
        { erreur: "Pseudo ou PIN incorrect" },
        { status: 401 }
      );
    }

    // 4. ✅ GENERATE SIGNED JWT
    const token = generateJWT(
      user.id,
      user.role || "customer"
    );

    // 5. ✅ RECORD SESSION
    const deviceId = req.headers.get("user-agent")?.substring(0, 255) || "unknown";
    await (admin
      .from("user_sessions" as any)
      .upsert({
        user_id: user.id,
        token_hash: crypto.createHash("sha256").update(token).digest("hex"),
        device_id: deviceId,
        ip_address: ip,
        user_agent: req.headers.get("user-agent"),
      })) as any;

    // 6. ✅ LOG SUCCESS
    await (admin
      .from("recovery_attempts" as any)
      .insert({
        user_id: user.id,
        action: "login",
        success: true,
        ip_address: ip,
        user_agent: req.headers.get("user-agent"),
      })) as any;

    // 7. ✅ UPDATE LAST LOGIN
    await (admin
      .from("utilisateurs_auth_v2" as any)
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id)
      .then(() => ({ data: null, error: null }))) as any;

    // ✅ RESET RATE LIMIT ON SUCCESS
    await resetRateLimit(ip, RATE_LIMITS.LOGIN);

    // 8. ✅ RETURN TOKEN
    return NextResponse.json(
      {
        succes: true,
        token,
        user: {
          id: user.id,
          pseudo: user.pseudo,
          role: user.role || "customer",
          recovery_method: user.recovery_method,
        },
        message: "Connecté avec succès!",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json(
      { erreur: "Erreur serveur" },
      { status: 500 }
    );
  }
}
