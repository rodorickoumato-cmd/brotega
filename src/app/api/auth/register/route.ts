/**
 * API: Inscription - Pseudo + PIN + Choix récupération
 * ✅ Production-grade security:
 * - Rate limiting (3 attempts per hour)
 * - Bcrypt PIN hashing (12 rounds)
 * - Input validation
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { hashPIN } from "@/lib/pin-secure";
import { checkRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/rate-limit";
import { validatePseudo, validatePIN, validateEmail, validateRole, getClientIP } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    // ✅ RATE LIMITING (3 attempts per hour)
    const rateCheck = await checkRateLimit(ip, RATE_LIMITS.REGISTER);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          erreur: "Trop de tentatives. Réessayez dans 1 heure.",
          resetAt: rateCheck.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { pseudo: rawPseudo, pin: rawPin, recovery_method, email: rawEmail, phrase, role: rawRole } = body;

    // 1. ✅ VALIDATE PSEUDO
    const pseudo = validatePseudo(rawPseudo);
    if (!pseudo) {
      return NextResponse.json(
        { erreur: "Pseudo: 3-50 caractères, alphanumérique + underscore" },
        { status: 400 }
      );
    }

    // ✅ VALIDATE PIN
    const pin = validatePIN(rawPin);
    if (!pin) {
      return NextResponse.json(
        { erreur: "PIN: 4-6 chiffres" },
        { status: 400 }
      );
    }

    // ✅ VALIDATE RECOVERY METHOD
    if (!["email", "phrase", "code"].includes(recovery_method)) {
      return NextResponse.json(
        { erreur: "Méthode récupération invalide" },
        { status: 400 }
      );
    }

    // ✅ VALIDATE ROLE
    const role = validateRole(rawRole) || "customer";

    // ✅ VALIDATE EMAIL if needed
    if (recovery_method === "email") {
      const email = validateEmail(rawEmail);
      if (!email) {
        return NextResponse.json(
          { erreur: "Email invalide" },
          { status: 400 }
        );
      }
    }

    // 2. ✅ CHECK PSEUDO UNIQUE
    const admin = createAdminClient();
    const { data: existing } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id")
      .eq("pseudo", pseudo)
      .maybeSingle()) as any;

    if (existing) {
      return NextResponse.json(
        { erreur: "Ce pseudo est déjà utilisé" },
        { status: 409 }
      );
    }

    // 3. ✅ HASH PIN WITH BCRYPT (12 rounds)
    let pinHash: string;
    try {
      pinHash = await hashPIN(pin);
    } catch (err) {
      console.error("[AUTH] PIN hashing failed:", err);
      return NextResponse.json(
        { erreur: "Erreur lors du hash du PIN" },
        { status: 500 }
      );
    }

    // 4. ✅ GENERATE RECOVERY CODE
    const recoveryCode = crypto.randomBytes(8).toString("hex").toUpperCase();
    const recoveryCodeHash = crypto
      .createHash("sha256")
      .update(recoveryCode)
      .digest("hex");

    // 5. ✅ PREPARE USER DATA
    const userData: any = {
      pseudo,
      pin_hash: pinHash,
      recovery_method,
      role,
      actif: true,
    };

    // ✅ ADD METHOD-SPECIFIC FIELDS
    if (recovery_method === "email") {
      userData.email = validateEmail(rawEmail) || null;
    } else if (recovery_method === "phrase") {
      userData.phrase_hash = crypto
        .createHash("sha256")
        .update(phrase || "")
        .digest("hex");
      userData.phrase_first_letter = (phrase || "")[0]?.toUpperCase() || "";
      userData.phrase_word_count = (phrase || "").split(/\s+/).length;
    } else if (recovery_method === "code") {
      userData.recovery_code_hash = recoveryCodeHash;
    }

    // 6. ✅ INSERT USER
    const { data: newUser, error: insertError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .insert([userData])
      .select("id")
      .single()) as any;

    if (insertError || !newUser) {
      console.error("[AUTH] Insert error:", insertError);
      return NextResponse.json(
        { erreur: "Erreur inscription" },
        { status: 500 }
      );
    }

    // ✅ RESET RATE LIMIT ON SUCCESS
    await resetRateLimit(ip, RATE_LIMITS.REGISTER);

    // 7. ✅ RETURN RECOVERY CODE (only for code method)
    return NextResponse.json(
      {
        succes: true,
        user_id: newUser.id,
        recovery_code: recovery_method === "code" ? recoveryCode : undefined,
        message: "Inscription réussie!",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
