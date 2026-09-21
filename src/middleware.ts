import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PATHS = ['/admin'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ✅ Routes admin: vérifier JWT + rôle
  if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login-dual', request.url));
    }

    // Token existe → laisser passer
    // Vérification du rôle se fera côté component
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
