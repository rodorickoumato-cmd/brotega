import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ROUTE DÉVELOPPEMENT UNIQUEMENT — ne fonctionne pas en production
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Non disponible en production" }, { status: 403 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:400px;margin:auto">
        <h2>Connexion Dev</h2>
        <form method="GET">
          <input name="email" type="email" placeholder="Votre email" required
            style="width:100%;padding:12px;font-size:16px;border:2px solid #ccc;border-radius:8px;margin-bottom:12px;box-sizing:border-box" />
          <button type="submit"
            style="width:100%;padding:14px;background:#E63946;color:white;font-weight:bold;font-size:16px;border:none;border-radius:8px;cursor:pointer">
            Se connecter sans email
          </button>
        </form>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: "http://localhost:3000/auth/callback" },
  });

  if (error || !data?.properties?.action_link) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px">
        <h2 style="color:red">Erreur</h2>
        <p>${error?.message ?? "Lien non généré"}</p>
        <a href="/api/dev-login">Réessayer</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return NextResponse.redirect(data.properties.action_link);
}
