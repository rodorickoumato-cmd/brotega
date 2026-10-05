// Vérifie que l'appelant est admin (JWT cookie auth_token).
// Renvoie une réponse d'erreur à retourner telle quelle, ou null si autorisé.

import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt-secure";

export function exigerAdmin(req: NextRequest): NextResponse | null {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
  }

  let payload: ReturnType<typeof verifyJWT> = null;
  try {
    payload = verifyJWT(token);
  } catch (err) {
    console.error("[ADMIN-GUARD] JWT verification error:", err);
  }
  if (!payload || payload.role !== "admin") {
    return NextResponse.json(
      { erreur: "Accès refusé - admin seulement" },
      { status: 403 }
    );
  }

  return null;
}
