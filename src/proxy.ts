import { NextResponse, type NextRequest } from "next/server";

// Routes nécessitant une authentification
const ROUTES_AUTH = ["/compte", "/checkout", "/vendor", "/messages", "/reclamation"];
// Routes avec contrôle de rôle strict (admin, livreur)
const ROUTES_ROLES: Record<string, string[]> = {
  "/admin":   ["admin"],
  "/livreur": ["livreur", "admin"],
};

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Vérifier le token JWT custom (Pseudo+PIN auth) ────────────
  const token = request.cookies.get("auth_token")?.value;
  const isAuthenticated = !!token;

  const loginUrl = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  };

  // ── Couche 1 : authentification requise ───────────────────────
  const estProtegee = ROUTES_AUTH.some((r) => pathname.startsWith(r));
  if (estProtegee && !isAuthenticated) return loginUrl();

  // ── Couche 2 : contrôle de rôle (admin, livreur) ──────────────
  // NOTE: Avec le nouveau système Pseudo+PIN, on n'a pas de rôles
  // Cette logique peut être restaurée plus tard si besoin
  /*
  const entreeRole = Object.entries(ROUTES_ROLES).find(([prefix]) =>
    pathname.startsWith(prefix)
  );
  if (entreeRole) {
    if (!isAuthenticated) return loginUrl();
    // TODO: Implémenter rôles pour le système Pseudo+PIN si nécessaire
  }
  */

  // ── Redirige utilisateur connecté hors des pages auth ─────────
  if (isAuthenticated && (pathname === "/auth/login" || pathname === "/auth/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
