/**
 * DEBUG VERSION - Pour tester l'insertion
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPIN } from "@/lib/pin-secure";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pseudo, pin } = body;

    console.log('[REGISTER-DEBUG] Reçu:', { pseudo, pin });

    if (!pseudo || !pin) {
      return NextResponse.json({ erreur: "pseudo et pin requis" }, { status: 400 });
    }

    // Hash PIN
    const pinHash = await hashPIN(pin);
    console.log('[REGISTER-DEBUG] PIN hashé');

    // Admin client
    const admin = createAdminClient();
    console.log('[REGISTER-DEBUG] Admin client créé');

    // INSÉRER directement (sans vérifications)
    const userData = {
      pseudo,
      pin_hash: pinHash,
      role: "customer",
      recovery_method: "code",
      actif: true,
    };

    console.log('[REGISTER-DEBUG] Insertion data:', userData);

    const { data: newUser, error: insertError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .insert([userData])
      .select("id")
      .single()) as any;

    console.log('[REGISTER-DEBUG] Insert error:', insertError);
    console.log('[REGISTER-DEBUG] New user:', newUser);

    if (insertError) {
      return NextResponse.json({
        erreur: "❌ Erreur insertion",
        details: insertError.message,
        code: insertError.code,
        hint: insertError.hint,
      }, { status: 500 });
    }

    return NextResponse.json({
      succes: true,
      user_id: newUser.id,
      message: "✅ Insertion réussie!",
    });
  } catch (err: any) {
    console.error('[REGISTER-DEBUG] Exception:', err);
    return NextResponse.json({
      erreur: "❌ Exception",
      message: err.message,
    }, { status: 500 });
  }
}
