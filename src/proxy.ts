import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const ROUTES_AUTH    = ["/compte", "/checkout", "/vendor/register"];
const ROUTES_VENDEUR = ["/vendor/dashboard", "/vendor/abonnement", "/vendor/wallet"];
const ROUTES_LIVREUR = ["/livreur"];
const ROUTES_ADMIN   = ["/admin"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Redirige vers login si non connecté sur route protégée
  const estProtegee = [
    ...ROUTES_AUTH,
    ...ROUTES_VENDEUR,
    ...ROUTES_LIVREUR,
    ...ROUTES_ADMIN,
  ].some((r) => pathname.startsWith(r));

  if (estProtegee && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const needsRole =
      ROUTES_VENDEUR.some((r) => pathname.startsWith(r)) ||
      ROUTES_LIVREUR.some((r) => pathname.startsWith(r)) ||
      ROUTES_ADMIN.some((r) => pathname.startsWith(r));

    if (needsRole) {
      const { data: profil } = await supabase
        .from("utilisateurs")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profil?.role;

      if (ROUTES_VENDEUR.some((r) => pathname.startsWith(r)) && role !== "vendeur" && role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      if (ROUTES_LIVREUR.some((r) => pathname.startsWith(r)) && role !== "livreur" && role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      if (ROUTES_ADMIN.some((r) => pathname.startsWith(r)) && role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    // Vendeur qui accède à /vendor/register → dashboard
    if (pathname === "/vendor/register") {
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role === "vendeur") {
        return NextResponse.redirect(new URL("/vendor/dashboard", request.url));
      }
    }

    // Utilisateur connecté sur page auth → accueil
    if (pathname === "/auth/login" || pathname === "/auth/register") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
