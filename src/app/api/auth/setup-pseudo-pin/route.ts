import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJWT } from "@/lib/jwt-secure";
import { validateEmail, validatePseudo, validatePIN, getClientIP } from "@/lib/validation";
import { hashPIN } from "@/lib/pin-secure";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    const body = await req.json();
    const { email, pseudo, pin } = body;

    // ✅ Validation
    const validEmail = validateEmail(email);
    const validPseudo = validatePseudo(pseudo);
    const validPIN = validatePIN(pin);

    if (!validEmail || !validPseudo || !validPIN) {
      return NextResponse.json({ erreur: "Données invalides" }, { status: 400 });
    }

    // ✅ Vérifier que l'email existe dans Supabase Auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
    }

    const userId = user.id;

    // ✅ Vérifier que c'est le même email
    if (user.email !== validEmail) {
      await logAuditEvent({
        user_id: userId,
        action: "user_login",
        resource_type: "auth",
        status: "failure",
        ip_address: ip,
        details: { reason: "email_mismatch", provided_email: validEmail, actual_email: user.email },
      });
      return NextResponse.json({ erreur: "Email ne correspond pas" }, { status: 403 });
    }

    // ✅ Hash le PIN
    const hashedPIN = await hashPIN(validPIN);

    // ✅ AJOUTER Pseudo+PIN au compte existant (MÊME user_id)
    const admin = createAdminClient();
    const { data: existingUser } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id, role")
      .eq("id", userId)
      .maybeSingle()) as any;

    let updatedUser;
    if (existingUser) {
      // Mise à jour: ajouter Pseudo+PIN
      const { data } = await (admin
        .from("utilisateurs_auth_v2" as any)
        .update({
          pseudo: validPseudo,
          pin_hash: hashedPIN,
          has_dual_auth: true,
        })
        .eq("id", userId)
        .select("id, pseudo, role, email")
        .single()) as any;
      updatedUser = data;
    } else {
      // Création: nouveau compte avec email/password existant
      const { data } = await (admin
        .from("utilisateurs_auth_v2" as any)
        .insert({
          id: userId,
          email: validEmail,
          pseudo: validPseudo,
          pin_hash: hashedPIN,
          role: "customer",
          actif: true,
          migrated_from_supabase_id: userId,
          has_dual_auth: true,
        })
        .select("id, pseudo, role, email")
        .single()) as any;
      updatedUser = data;
    }

    // ✅ Générer JWT
    const token = generateJWT(userId, updatedUser?.role || "customer");

    // ✅ Log
    await logAuditEvent({
      user_id: userId,
      action: "user_login",
      resource_type: "auth",
      status: "success",
      ip_address: ip,
      details: { method: "setup_pseudo_pin", pseudo: validPseudo },
    });

    return NextResponse.json({
      succes: true,
      token,
      user: {
        id: userId,
        email: validEmail,
        pseudo: validPseudo,
        role: updatedUser?.role,
      },
      message: "Pseudo+PIN ajouté avec succès!",
    });
  } catch (err: any) {
    console.error("[SETUP-PSEUDO-PIN]", err);
    return NextResponse.json({ erreur: err.message }, { status: 500 });
  }
}
