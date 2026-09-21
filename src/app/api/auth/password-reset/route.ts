import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateEmail, getClientIP } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    const body = await req.json();
    const { email } = body;

    const validEmail = validateEmail(email);
    if (!validEmail) {
      return NextResponse.json({ erreur: "Email invalide" }, { status: 400 });
    }

    // Rate limiting
    const rateLimitCheck = await checkRateLimit(ip, RATE_LIMITS.LOGIN);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({ erreur: "Trop de tentatives" }, { status: 429 });
    }

    // ✅ Envoyer email de réinitialisation via Supabase Auth
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(validEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://brotega-jmchwa47v-brotega.vercel.app"}/auth/update-password`,
    });

    if (error) {
      console.error("[PASSWORD-RESET] Supabase error:", error);
      // Ne pas révéler si l'email existe ou pas (sécurité)
      await logAuditEvent({
        user_id: "anonymous",
        action: "user_login",
        resource_type: "auth",
        status: "failure",
        ip_address: ip,
        details: { reason: "password_reset_failed", email },
      });
      return NextResponse.json({
        succes: true, // Retourner succès même si erreur (sécurité)
        message: "Un email de réinitialisation a été envoyé si le compte existe",
      });
    }

    await logAuditEvent({
      user_id: "anonymous",
      action: "user_login",
      resource_type: "auth",
      status: "success",
      ip_address: ip,
      details: { reason: "password_reset_email_sent", email },
    });

    return NextResponse.json({
      succes: true,
      message: "Email de réinitialisation envoyé! Vérifiez votre boîte mail.",
    });
  } catch (err: any) {
    console.error("[PASSWORD-RESET]", err);
    return NextResponse.json({ erreur: err.message }, { status: 500 });
  }
}
