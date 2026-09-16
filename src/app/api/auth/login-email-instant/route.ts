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

    const validEmail = validateEmail(email);
    if (!validEmail) {
      return NextResponse.json({ erreur: "Email invalide" }, { status: 400 });
    }

    const rateLimitCheck = await checkRateLimit(ip, RATE_LIMITS.LOGIN);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({ erreur: "Trop de tentatives" }, { status: 429 });
    }

    const admin = createAdminClient();

    // Check if user exists
    const { data: existingUser } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id, pseudo, role, email")
      .eq("email", validEmail)
      .maybeSingle()) as any;

    if (existingUser) {
      const token = generateJWT(existingUser.id, existingUser.role || "customer");
      return NextResponse.json({
        succes: true,
        token,
        user: existingUser,
      });
    }

    // Create new user
    const userId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: newUser, error: createError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .insert({
        id: userId,
        email: validEmail,
        pseudo: validEmail.split("@")[0],
        pin_hash: "temp_no_pin",
        role: "customer",
        actif: true,
      })
      .select("id, pseudo, role, email")
      .single()) as any;

    if (createError || !newUser) {
      return NextResponse.json({ erreur: "Erreur création" }, { status: 500 });
    }

    const token = generateJWT(newUser.id, "customer");

    await logAuditEvent({
      user_id: newUser.id,
      action: "user_login",
      resource_type: "auth",
      status: "success",
      ip_address: ip,
      details: { method: "email_instant" },
    });

    return NextResponse.json({
      succes: true,
      token,
      user: newUser,
      message: "Connecté!",
    });
  } catch (err: any) {
    return NextResponse.json({ erreur: err.message }, { status: 500 });
  }
}
