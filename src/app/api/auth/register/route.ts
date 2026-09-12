// API: Inscription - Pseudo + PIN + Choix récupération

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pseudo, pin, recovery_method, email, phrase, code, role } = body;

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

    // Validate role
    if (!["customer", "vendor", "livreur"].includes(role || "customer")) {
      return NextResponse.json(
        { erreur: "Rôle invalide" },
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

    // 3. Hash le PIN (SHA256)
    const pinHash = crypto
      .createHash("sha256")
      .update(pin)
      .digest("hex");

    // 4. Générer le code de récupération
    const recoveryCode = crypto.randomBytes(8).toString("hex").toUpperCase();
    const recoveryCodeHash = crypto
      .createHash("sha256")
      .update(recoveryCode)
      .digest("hex");

    // 5. Préparer les données utilisateur
    const userData: any = {
      pseudo,
      pin_hash: pinHash,
      recovery_method: recovery_method,
      role: role || "customer", // Add role (default: customer)
      actif: true,
    };

    // Ajouter les champs spécifiques à la méthode de récupération
    if (recovery_method === "email") {
      userData.email = email || null;
    } else if (recovery_method === "phrase") {
      userData.phrase_hash = crypto
        .createHash("sha256")
        .update(phrase || "")
        .digest("hex");
      userData.phrase_first_letter = (phrase || "")[0]?.toUpperCase() || "";
      userData.phrase_word_count = (phrase || "").split(/\s+/).length;
    } else if (recovery_method === "code") {
      userData.recovery_code_hash = recoveryCodeHash;
    }

    // 6. Insérer l'utilisateur
    const { data: newUser, error: insertError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .insert([userData])
      .select("id")
      .single()) as any;

    if (insertError || !newUser) {
      console.error("Insert Error:", insertError);
      return NextResponse.json(
        { erreur: "Erreur inscription" },
        { status: 500 }
      );
    }

    // 7. Retourner le code de récupération
    return NextResponse.json(
      {
        succes: true,
        user_id: newUser.id,
        recovery_code: recovery_method === "code" ? recoveryCode : undefined, // À afficher une seule fois!
        message: "Inscription réussie!",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
