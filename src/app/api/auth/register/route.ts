// API: Inscription - Pseudo + PIN + Choix récupération

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pseudo, pin, recovery_method, email, phrase, code } = body;

    // 1. Validation
    if (!pseudo || pseudo.length < 3 || pseudo.length > 50) {
      return NextResponse.json(
        { erreur: "Pseudo: 3-50 caractères" },
        { status: 400 }
      );
    }

    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { erreur: "PIN: 4-6 chiffres" },
        { status: 400 }
      );
    }

    if (!["email", "phrase", "code"].includes(recovery_method)) {
      return NextResponse.json(
        { erreur: "Méthode récupération invalide" },
        { status: 400 }
      );
    }

    // 2. Vérifier pseudo unique
    const admin = createAdminClient();
    const { data: existing } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id")
      .eq("pseudo", pseudo)
      .maybeSingle()) as any;

    if (existing) {
      return NextResponse.json(
        { erreur: "Ce pseudo est déjà utilisé" },
        { status: 409 }
      );
    }

    // 3. Appeler la fonction Supabase
    const { data: result, error: dbError } = await (admin.rpc(
      "register_user",
      {
        p_pseudo: pseudo,
        p_pin: pin,
        p_recovery_method: recovery_method,
        p_email: recovery_method === "email" ? email : null,
        p_phrase: recovery_method === "phrase" ? phrase : null,
        p_code: recovery_method === "code" ? code : null,
      }
    )) as any;

    if (dbError || !result || result.length === 0) {
      console.error("DB Error:", dbError);
      return NextResponse.json(
        { erreur: "Erreur inscription" },
        { status: 500 }
      );
    }

    const [{ user_id, recovery_code }] = result;

    // 4. Retourner le code de récupération
    return NextResponse.json(
      {
        succes: true,
        user_id,
        recovery_code: recovery_code, // À afficher une seule fois!
        message: "Inscription réussie!",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
