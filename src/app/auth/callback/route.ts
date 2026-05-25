import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "recovery" | "magiclink" | null;
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  }

  // Pour le reset de mot de passe, toujours rediriger vers la page dédiée
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/auth/reset-password", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
