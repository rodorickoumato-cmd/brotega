/**
 * MIDDLEWARE - JWT Signature Verification
 * ✅ Production-grade security:
 * - Verify JWT signature before accepting token
 * - Role-based access control
 * - Token expiration checking
 */

import { NextResponse, type NextRequest } from "next/server";
import { verifyJWT } from "@/lib/jwt-secure";

// Routes requiring authentication
const ROUTES_AUTH = ["/compte", "/checkout", "/vendor", "/messages", "/reclamation"];

// Routes with strict role control
const ROUTES_ROLES: Record<string, string[]> = {
  "/admin":   ["admin"],
  "/livreur": ["livreur", "admin"],
};

/**
 * ✅ CRITICAL: Verify JWT signature
 * Rejects tampered tokens and expired tokens
 */
function verifyAuthToken(token: string): any {
  try {
    const payload = verifyJWT(token);
    if (!payload) {
      console.warn("[MIDDLEWARE] JWT verification failed");
      return null;
    }
    return payload;
  } catch (err) {
    console.error("[MIDDLEWARE] JWT verification error:", err);
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ✅ GET TOKEN FROM COOKIE
  const token = request.cookies.get("auth_token")?.value;

  // ✅ VERIFY TOKEN SIGNATURE (CRITICAL)
  const jwtPayload = token ? verifyAuthToken(token) : null;
  const isAuthenticated = !!jwtPayload;
  const userRole = jwtPayload?.role || "customer";

  const loginUrl = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  };

  // ── LAYER 1: Authentication required ───────────────────────
  const isProtected = ROUTES_AUTH.some((r) => pathname.startsWith(r));
  if (isProtected && !isAuthenticated) {
    console.warn(`[MIDDLEWARE] Unauthenticated access attempt to ${pathname}`);
    return loginUrl();
  }

  // ── LAYER 2: Role-based access control ────────────────────
  const roleEntry = Object.entries(ROUTES_ROLES).find(([prefix]) =>
    pathname.startsWith(prefix)
  );
  if (roleEntry) {
    if (!isAuthenticated) {
      console.warn(`[MIDDLEWARE] Unauthenticated access attempt to ${pathname}`);
      return loginUrl();
    }

    const [, requiredRoles] = roleEntry;
    if (!requiredRoles.includes(userRole)) {
      console.warn(`[MIDDLEWARE] Access denied: user role ${userRole} not in ${requiredRoles.join(",")} for ${pathname}`);
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── LAYER 3: Redirect authenticated users away from auth pages
  if (isAuthenticated && (pathname === "/auth/login" || pathname === "/auth/register")) {
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
