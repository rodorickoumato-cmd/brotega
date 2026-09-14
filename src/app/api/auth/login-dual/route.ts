/**
 * API: POST /api/auth/login-dual - Dual authentication (Email/Password OR Pseudo/PIN)
 * ✅ Accept both old (Supabase) and new (Pseudo+PIN) auth methods
 * ✅ Track migration progress
 * ✅ Phase 1: Both work simultaneously
 * ✅ Phase 2 (after 30 days): Legacy disabled
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJWT } from "@/lib/jwt-secure";
import { verifyPIN } from "@/lib/pin-secure";
import { checkRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/rate-limit";
import { validateEmail, validatePIN, getClientIP } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    // ✅ RATE LIMITING
    const rateCheck = await checkRateLimit(ip, RATE_LIMITS.LOGIN);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { erreur: "Trop de tentatives. Réessayez dans 15 minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      authMethod, // "email" or "pseudo"
      email,
      password,
      pseudo,
      pin,
    } = body;

    const admin = createAdminClient();

    // ────────────────────────────────────────────
    // 🔴 OLD METHOD: Email/Password (Supabase)
    // ────────────────────────────────────────────
    if (authMethod === "email") {
      const validEmail = validateEmail(email);
      if (!validEmail || !password) {
        return NextResponse.json(
          { erreur: "Email ou password incorrect" },
          { status: 401 }
        );
      }

      // ✅ Sign in with Supabase Auth
      const supabase = require("@supabase/supabase-js").createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validEmail,
        password,
      });

      if (error || !data?.user) {
        await logAuditEvent({
          action: "user_login",
          resource_type: "user",
          status: "failure",
          ip_address: ip,
          details: { method: "email", reason: "invalid_credentials" },
        });

        return NextResponse.json(
          { erreur: "Email ou password incorrect" },
          { status: 401 }
        );
      }

      const supabaseUserId = data.user.id;

      // ✅ Check if user already migrated to new system
      const { data: migratedUser } = await (admin
        .from("utilisateurs_auth_v2" as any)
        .select("id, role")
        .eq("migrated_from_supabase_id", supabaseUserId)
        .single()) as any;

      if (migratedUser) {
        // ✅ User already migrated - use new JWT
        const token = generateJWT(migratedUser.id, migratedUser.role);

        await logAuditEvent({
          user_id: migratedUser.id,
          action: "user_login",
          resource_type: "user",
          status: "success",
          ip_address: ip,
          details: { method: "email_legacy" },
        });

        await resetRateLimit(ip, RATE_LIMITS.LOGIN);

        return NextResponse.json({
          succes: true,
          token,
          message: "Connecté avec succès!",
          authMethod: "email",
        });
      }

      // ✅ User hasn't migrated yet - generate JWT from Supabase user
      const token = generateJWT(supabaseUserId, "customer");

      await logAuditEvent({
        user_id: supabaseUserId,
        action: "user_login",
        resource_type: "user",
        status: "success",
        ip_address: ip,
        details: { method: "email", migrated: false },
      });

      await resetRateLimit(ip, RATE_LIMITS.LOGIN);

      return NextResponse.json({
        succes: true,
        token,
        message: "Connecté avec succès! Migrez vers Pseudo+PIN bientôt.",
        authMethod: "email",
        migration_required: true, // Alert on frontend
        migration_deadline: "2026-10-14", // 30 days from now
      });
    }

    // ────────────────────────────────────────────
    // 🟢 NEW METHOD: Pseudo/PIN
    // ────────────────────────────────────────────
    else if (authMethod === "pseudo") {
      const validPseudo = pseudo?.trim();
      const validPin = validatePIN(pin);

      if (!validPseudo || !validPin) {
        return NextResponse.json(
          { erreur: "Pseudo ou PIN incorrect" },
          { status: 400 }
        );
      }

      // ✅ Fetch user from new system
      const { data: user } = await (admin
        .from("utilisateurs_auth_v2" as any)
        .select("*")
        .eq("pseudo", validPseudo)
        .single()) as any;

      if (!user) {
        await logAuditEvent({
          action: "user_login",
          resource_type: "user",
          status: "failure",
          ip_address: ip,
          details: { method: "pseudo", reason: "user_not_found" },
        });

        return NextResponse.json(
          { erreur: "Pseudo ou PIN incorrect" },
          { status: 401 }
        );
      }

      // ✅ Verify PIN with bcrypt
      const pinValid = await verifyPIN(validPin, user.pin_hash);
      if (!pinValid) {
        await logAuditEvent({
          user_id: user.id,
          action: "user_login",
          resource_type: "user",
          status: "failure",
          ip_address: ip,
          details: { method: "pseudo", reason: "invalid_pin" },
        });

        return NextResponse.json(
          { erreur: "Pseudo ou PIN incorrect" },
          { status: 401 }
        );
      }

      // ✅ Generate JWT
      const token = generateJWT(user.id, user.role);

      await logAuditEvent({
        user_id: user.id,
        action: "user_login",
        resource_type: "user",
        status: "success",
        ip_address: ip,
        details: { method: "pseudo" },
      });

      await resetRateLimit(ip, RATE_LIMITS.LOGIN);

      return NextResponse.json({
        succes: true,
        token,
        message: "Connecté avec succès!",
        authMethod: "pseudo",
      });
    }

    return NextResponse.json(
      { erreur: "Méthode d'authentification invalide" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[POST /api/auth/login-dual]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
