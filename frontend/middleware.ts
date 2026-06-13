import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_HUB_PATHS = new Set([
  '/hub/login',
  '/hub/register',
  '/hub/forgot-password',
  '/hub/reset-password',
  '/hub/verify-email',
]);

const PROTECTED_PREFIXES = [
  '/hub/admin',
  '/hub/elections',
  '/hub/vault',
  '/hub/wallet',
  '/hub/profile',
  '/hub/dashboard',
  '/hub/notifications',
  '/hub/messages',
];

function isPublicHubPath(pathname: string): boolean {
  if (PUBLIC_HUB_PATHS.has(pathname)) return true;
  if (/^\/hub\/elections\/[^/]+\/results\/?$/.test(pathname)) return true;
  return false;
}

function requiresHubAuth(pathname: string): boolean {
  if (!pathname.startsWith('/hub')) return false;
  if (isPublicHubPath(pathname)) return false;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!requiresHubAuth(pathname)) {
    return NextResponse.next();
  }

  if (!request.cookies.get('nacos_hub')?.value) {
    const login = new URL('/hub/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/hub/:path*'],
};
