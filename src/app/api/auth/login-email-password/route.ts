import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJWT } from "@/lib/jwt-secure";
import { validateEmail, getClientIP } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    const body = await req.json();
    const { email, password } = body;

    const validEmail = validateEmail(email);
    if (!validEmail || !password) {
      return NextResponse.json({ erreur: "Email et password requis" }, { status: 400 });
    }

    const rateLimitCheck = await checkRateLimit(ip, RATE_LIMITS.LOGIN);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({ erreur: "Trop de tentatives" }, { status: 429 });
    }

    // ✅ Vérifier avec Supabase Auth
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: validEmail,
      password: password,
    });

    if (authError || !authData.user) {
      // ✅ Si ancien user: proposer récupération via nouveau système
      try {
        const admin = createAdminClient();

        // Check si user a account dans new system (migré)
        const { data: migratedUser } = await (admin
          .from("utilisateurs_auth_v2" as any)
          .select("id, recovery_method, email")
          .eq("email", validEmail)
          .maybeSingle()) as any;

        if (migratedUser) {
          await logAuditEvent({
            user_id: "anonymous",
            action: "user_login",
            resource_type: "auth",
            status: "failure",
            ip_address: ip,
            details: { reason: "invalid_password", email, recovery_available: true },
          });
          return NextResponse.json({
            erreur: "Mot de passe incorrect",
            password_reset: true,
            recovery_method: migratedUser.recovery_method || "email",
            pseudo: migratedUser.email?.split("@")[0],
            message: "Utilisez les options de récupération du nouveau système",
          }, { status: 401 });
        }
      } catch (err) {
        console.error("[LOGIN] Recovery check error:", err);
      }

      // Sinon: erreur simple
      await logAuditEvent({
        user_id: "anonymous",
        action: "user_login",
        resource_type: "auth",
        status: "failure",
        ip_address: ip,
        details: { reason: "invalid_credentials", email },
      });
      return NextResponse.json({ erreur: "Email ou password incorrect" }, { status: 401 });
    }

    const userId = authData.user.id;
    const admin = createAdminClient();

    // Check si existe dans new system
    const { data: existingUser } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id, pseudo, role")
      .eq("id", userId)
      .maybeSingle()) as any;

    let user = existingUser;
    if (!user) {
      const { data: newUser } = await (admin
        .from("utilisateurs_auth_v2" as any)
        .insert({
          id: userId,
          email: validEmail,
          pseudo: validEmail.split("@")[0],
          role: "customer",
          actif: true,
          migrated_from_supabase_id: userId,
        })
        .select("id, pseudo, role")
        .single()) as any;
      user = newUser;
    }

    const token = generateJWT(userId, user?.role || "customer");

    await logAuditEvent({
      user_id: userId,
      action: "user_login",
      resource_type: "auth",
      status: "success",
      ip_address: ip,
      details: { method: "email_password", email },
    });

    return NextResponse.json({
      succes: true,
      token,
      user: { id: userId, email: validEmail, pseudo: user?.pseudo },
    });
  } catch (err: any) {
    return NextResponse.json({ erreur: err.message }, { status: 500 });
  }
}
