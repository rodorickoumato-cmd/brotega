// API: Connexion - Pseudo + PIN

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function generateJWT(userId: string, expiresIn = "30d"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      user_id: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    })
  );

  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "secret")
    .update(`${header}.${payload}`)
    .digest("base64");

  return `${header}.${payload}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pseudo, pin } = body;

    // 1. Validation
    if (!pseudo || !pin) {
      return NextResponse.json(
        { erreur: "Pseudo et PIN requis" },
        { status: 400 }
      );
    }

    // 2. Chercher l'utilisateur par pseudo
    const admin = createAdminClient();
    const { data: user, error: fetchError } = await (admin
      .from("utilisateurs_auth_v2")
      .select("*")
      .eq("pseudo", pseudo)
      .single()) as any;

    if (fetchError || !user) {
      console.error("User not found:", fetchError);
      return NextResponse.json(
        { erreur: "Pseudo ou PIN incorrect" },
        { status: 401 }
      );
    }

    // 3. Vérifier le PIN (hash SHA256)
    const pinHash = crypto
      .createHash("sha256")
      .update(pin)
      .digest("hex");

    if (user.pin_hash !== pinHash) {
      return NextResponse.json(
        { erreur: "Pseudo ou PIN incorrect" },
        { status: 401 }
      );
    }

    // 4. Générer JWT
    const token = generateJWT(user.id);

    // 5. Enregistrer session
    const deviceId = req.headers.get("user-agent")?.substring(0, 255) || "unknown";
    await (admin
      .from("user_sessions" as any)
      .upsert({
        user_id: user.id,
        token_hash: crypto.createHash("sha256").update(token).digest("hex"),
        device_id: deviceId,
        ip_address: req.ip || "unknown",
        user_agent: req.headers.get("user-agent"),
      })) as any;

    // 6. Logger la tentative réussie
    await (admin
      .from("recovery_attempts" as any)
      .insert({
        user_id: user.id,
        action: "login",
        success: true,
        ip_address: req.ip,
        user_agent: req.headers.get("user-agent"),
      })) as any;

    // 7. Mettre à jour last_login_at
    await (admin
      .from("utilisateurs_auth_v2" as any)
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id)) as any;

    // 8. Retourner le token
    return NextResponse.json(
      {
        succes: true,
        token,
        user: {
          id: user.id,
          pseudo: user.pseudo,
          recovery_method: user.recovery_method,
        },
        message: "Connecté avec succès!",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
