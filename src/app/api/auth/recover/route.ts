// API: Récupération de compte - Selon la méthode choisie

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pseudo, recovery_method, email, phrase, code } = body;

    // 1. Validation
    if (!pseudo) {
      return NextResponse.json(
        { erreur: "Pseudo requis" },
        { status: 400 }
      );
    }

    if (!["email", "phrase", "code"].includes(recovery_method)) {
      return NextResponse.json(
        { erreur: "Méthode récupération invalide" },
        { status: 400 }
      );
    }

    // 2. Récupérer l'utilisateur
    const admin = createAdminClient();
    const { data: user, error: userError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select(
        "id, pseudo, recovery_method, email, phrase_hash, phrase_first_letter, recovery_code_hash"
      )
      .eq("pseudo", pseudo)
      .maybeSingle()) as any;

    if (userError || !user) {
      // Log attempt (security: ne pas révéler si pseudo existe)
      await (admin
        .from("recovery_attempts" as any)
        .insert({
          action: `recover_${recovery_method}`,
          success: false,
          ip_address: (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown"),
          user_agent: req.headers.get("user-agent"),
        })) as any;

      return NextResponse.json(
        { erreur: "Pseudo ou données invalides" },
        { status: 401 }
      );
    }

    // 3. Vérifier la méthode et valider
    let isValid = false;

    if (recovery_method === "email" && user.recovery_method === "email") {
      isValid = email === user.email;
    } else if (recovery_method === "phrase" && user.recovery_method === "phrase") {
      const phraseHash = crypto.createHash("sha256").update(phrase).digest("hex");
      isValid = phraseHash === user.phrase_hash;
    } else if (recovery_method === "code" && user.recovery_method === "code") {
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      isValid = codeHash === user.recovery_code_hash;
    }

    // 4. Log attempt
    await (admin
      .from("recovery_attempts" as any)
      .insert({
        user_id: user.id,
        action: `recover_${recovery_method}`,
        success: isValid,
        recovery_method_used: recovery_method,
        ip_address: (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown"),
        user_agent: req.headers.get("user-agent"),
      })) as any;

    if (!isValid) {
      return NextResponse.json(
        { erreur: "Données de récupération invalides" },
        { status: 401 }
      );
    }

    // 5. Générer un code temporaire de réinitialisation
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Stocker temporairement (expire dans 1h)
    await (admin
      .from("user_sessions" as any)
      .insert({
        user_id: user.id,
        token_hash: resetTokenHash,
        device_id: "password_reset",
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      })) as any;

    // 6. Retourner le token de réinitialisation
    return NextResponse.json(
      {
        succes: true,
        reset_token: resetToken, // À utiliser dans /api/auth/reset-pin
        message: "Vérification réussie. Vous pouvez réinitialiser votre PIN.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/auth/recover]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
