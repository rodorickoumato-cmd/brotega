import { NextResponse, type NextRequest } from "next/server";

// Routes nécessitant une authentification
const ROUTES_AUTH = ["/compte", "/checkout", "/vendor", "/messages", "/reclamation"];
// Routes avec contrôle de rôle strict
const ROUTES_ROLES: Record<string, string[]> = {
  "/admin":   ["admin"],
  "/livreur": ["livreur", "admin"],
};

// Décoder le JWT payload sans vérifier la signature (OK en middleware)
function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

    // Vérifier l'expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expiré
    }

    return payload;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Vérifier le token JWT custom (Pseudo+PIN auth) ────────────
  const token = request.cookies.get("auth_token")?.value;
  const isAuthenticated = !!token;
  const jwtPayload = token ? decodeJWTPayload(token) : null;
  const userRole = jwtPayload?.role || "customer";

  const loginUrl = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  };

  // ── Couche 1 : authentification requise ───────────────────────
  const estProtegee = ROUTES_AUTH.some((r) => pathname.startsWith(r));
  if (estProtegee && !isAuthenticated) return loginUrl();

  // ── Couche 2 : contrôle de rôle ──────────────────────────────
  const entreeRole = Object.entries(ROUTES_ROLES).find(([prefix]) =>
    pathname.startsWith(prefix)
  );
  if (entreeRole) {
    if (!isAuthenticated) return loginUrl();

    const [, requiredRoles] = entreeRole;
    if (!requiredRoles.includes(userRole)) {
      // Accès refusé - rediriger vers page d'erreur ou home
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── Redirige utilisateur connecté hors des pages auth ─────────
  if (isAuthenticated && (pathname === "/auth/login" || pathname === "/auth/register")) {
    // Rediriger vers le dashboard approprié selon le rôle
    if (userRole === "vendor") return NextResponse.redirect(new URL("/vendor/dashboard", request.url));
    if (userRole === "livreur") return NextResponse.redirect(new URL("/livreur", request.url));
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
