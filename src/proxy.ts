import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes nécessitant une simple authentification
const ROUTES_AUTH = ["/compte", "/checkout", "/vendor", "/messages"];
// Routes avec contrôle de rôle strict
const ROUTES_ROLES: Record<string, string[]> = {
  "/admin":   ["admin"],
  "/livreur": ["livreur", "admin"],
};

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  const loginUrl = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  };

  // ── Couche 1 : authentification requise ───────────────────────
  const estProtegee = ROUTES_AUTH.some((r) => pathname.startsWith(r));
  if (estProtegee && !user) return loginUrl();

  // ── Couche 2 : contrôle de rôle (admin, livreur) ──────────────
  const entreeRole = Object.entries(ROUTES_ROLES).find(([prefix]) =>
    pathname.startsWith(prefix)
  );
  if (entreeRole) {
    if (!user) return loginUrl();

    // Rôle lu depuis le JWT (app_metadata) — aucune requête DB en middleware
    // Fallback DB pour les comptes créés avant cette architecture (période de transition)
    let roleUtilisateur = (user.app_metadata?.role as string) ?? "";
    if (!roleUtilisateur) {
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      roleUtilisateur = profil?.role ?? "";
    }

    const rolesAutorises = entreeRole[1];
    if (!rolesAutorises.includes(roleUtilisateur)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── Redirige utilisateur connecté hors des pages auth ─────────
  if (user && (pathname === "/auth/login" || pathname === "/auth/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
