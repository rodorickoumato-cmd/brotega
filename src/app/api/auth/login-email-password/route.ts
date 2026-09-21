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

        // Chercher l'utilisateur dans Supabase Auth (legacy)
        const { data: legacyUsers, error: listError } = await (admin.auth.admin as any).listUsers({
          pageSize: 1,
        });

        // Chercher cet email spécifique dans la liste
        const legacyUser = legacyUsers?.find((u: any) => u.email === validEmail);

        if (legacyUser) {
          // Email existe dans Supabase Auth → vrai ancien user
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
            recovery_options: ["email", "phrase", "code"],
            message: "Utilisez les options de récupération du nouveau système",
          }, { status: 401 });
        }
      } catch (err) {
        console.error("[LOGIN-EMAIL-PASSWORD] Recovery check error:", err);
      }

      // Email n'existe pas ou erreur: retourner erreur générique
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
