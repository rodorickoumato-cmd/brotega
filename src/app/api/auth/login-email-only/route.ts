/**
 * API: POST /api/auth/login-email-only
 * ✅ Ancien utilisateurs: seulement email, pas de password
 * ✅ Reconnaître & Connecter directement
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJWT } from "@/lib/jwt-secure";
import { validateEmail, getClientIP } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    const body = await req.json();
    const { email } = body;

    // ✅ VALIDATE EMAIL
    const validEmail = validateEmail(email);
    if (!validEmail) {
      return NextResponse.json(
        { erreur: "Email invalide" },
        { status: 400 }
      );
    }

    // ✅ RATE LIMITING
    const rateLimitCheck = await checkRateLimit(ip, RATE_LIMITS.LOGIN);
    if (!rateLimitCheck.allowed) {
      await logAuditEvent({
        user_id: "anonymous",
        action: "user_login",
        resource_type: "auth",
        status: "failure",
        ip_address: ip,
        details: { reason: "rate_limit_exceeded", email },
      });
      return NextResponse.json(
        { erreur: `Trop de tentatives. Réessayez dans ${Math.ceil(rateLimitCheck.resetAt.getTime() - Date.now()) / 1000}s` },
        { status: 429 }
      );
    }

    const admin = createAdminClient();

    // ✅ CHECK 1: User already migrated (in new system)
    const { data: migratedUser } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id, pseudo, role, email")
      .eq("email", validEmail)
      .maybeSingle()) as any;

    if (migratedUser) {
      // ✅ MIGRATED USER - Generate JWT
      const token = generateJWT(migratedUser.id, migratedUser.role || "customer");

      await logAuditEvent({
        user_id: migratedUser.id,
        action: "user_login",
        resource_type: "auth",
        status: "success",
        ip_address: ip,
        details: { method: "email_only", email },
      });

      return NextResponse.json({
        succes: true,
        token,
        user: {
          id: migratedUser.id,
          pseudo: migratedUser.pseudo,
          role: migratedUser.role || "customer",
          migration_status: "migrated",
        },
      });
    }

    // ✅ CHECK 2: Legacy user in Supabase Auth (auth.users table)
    // Bypass RLS with service_role to search in auth.users
    const { data: legacyUsers, error: authError } = await (admin
      .from("auth.users" as any)
      .select("id, email")
      .eq("email", validEmail)
      .maybeSingle()) as any;

    if (legacyUsers && !authError) {
      // ✅ LEGACY USER FOUND in Supabase Auth
      const token = generateJWT(legacyUsers.id, "customer");

      await logAuditEvent({
        user_id: legacyUsers.id,
        action: "user_login",
        resource_type: "auth",
        status: "success",
        ip_address: ip,
        details: { method: "email_only_legacy", email },
      });

      return NextResponse.json({
        succes: true,
        token,
        user: {
          id: legacyUsers.id,
          email: validEmail,
          migration_status: "legacy",
          migration_required: true,
        },
        message: "Bienvenue! Veuillez configurer votre Pseudo+PIN",
      });
    }

    // ✅ EMAIL NOT FOUND (anywhere)
    await logAuditEvent({
      user_id: "anonymous",
      action: "user_login",
      resource_type: "auth",
      status: "failure",
      ip_address: ip,
      details: { reason: "email_not_found", email, auth_error: authError?.message },
    });

    return NextResponse.json(
      { erreur: "Email non trouvé. Créez un compte?" },
      { status: 401 }
    );
  } catch (err) {
    console.error("[POST /api/auth/login-email-only]", err);
    return NextResponse.json(
      { erreur: "Erreur serveur" },
      { status: 500 }
    );
  }
}
