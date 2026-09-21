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
      // Email/password incorrect
      await logAuditEvent({
        user_id: "anonymous",
        action: "user_login",
        resource_type: "auth",
        status: "failure",
        ip_address: ip,
        details: { reason: "invalid_credentials", email },
      });
      return NextResponse.json({
        erreur: "Email ou mot de passe incorrect",
        password_reset_available: true,
      }, { status: 401 });
    }

    const userId = authData.user.id;
    const admin = createAdminClient();

    // ✅ Vérifier si user a DÉJÀ Pseudo+PIN
    const { data: existingUser } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id, pseudo, pin_hash, role")
      .eq("id", userId)
      .maybeSingle()) as any;

    // ✅ Si user n'existe pas encore OU n'a pas de Pseudo+PIN
    if (!existingUser || !existingUser.pseudo) {
      // Créer entrée vide (email seulement)
      if (!existingUser) {
        await (admin
          .from("utilisateurs_auth_v2" as any)
          .insert({
            id: userId,
            email: validEmail,
            role: "customer",
            actif: true,
            migrated_from_supabase_id: userId,
            has_dual_auth: false,
          })) as any;
      }

      // Générer JWT temporaire
      const tempToken = generateJWT(userId, "customer");

      await logAuditEvent({
        user_id: userId,
        action: "user_login",
        resource_type: "auth",
        status: "success",
        ip_address: ip,
        details: { method: "email_password", email, setup_required: true },
      });

      // Proposer création Pseudo+PIN
      return NextResponse.json({
        succes: true,
        token: tempToken,
        user: { id: userId, email: validEmail },
        setup_pseudo_pin_required: true,
        message: "Créez un Pseudo+PIN pour plus de sécurité",
      });
    }

    // ✅ User a déjà Pseudo+PIN → connexion normale
    const token = generateJWT(userId, existingUser.role || "customer");

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
      user: { id: userId, email: validEmail, pseudo: existingUser.pseudo, role: existingUser.role },
    });
  } catch (err: any) {
    return NextResponse.json({ erreur: err.message }, { status: 500 });
  }
}
