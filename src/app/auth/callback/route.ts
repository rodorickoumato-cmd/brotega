import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code      = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type      = searchParams.get("type") as "email" | "recovery" | "magiclink" | null;
  const next      = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  // ── Flux PKCE (code d'autorisation) ──────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=lien_expire`, origin)
      );
    }
    // Pour la réinitialisation de mot de passe, aller directement à la page reset
    if (type === "recovery" || next.includes("reset-password")) {
      return NextResponse.redirect(new URL("/auth/reset-password", origin));
    }
    return NextResponse.redirect(new URL(next, origin));
  }

  // ── Flux OTP (token_hash) ─────────────────────────────────────────────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=lien_expire`, origin)
      );
    }
    if (type === "recovery") {
      return NextResponse.redirect(new URL("/auth/reset-password", origin));
    }
    return NextResponse.redirect(new URL(next, origin));
  }

  // Aucun paramètre valide → retour login
  return NextResponse.redirect(new URL("/auth/login?error=lien_invalide", origin));
}
