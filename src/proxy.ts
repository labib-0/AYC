import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy (formerly Middleware) — Next.js 16+
 *
 * Handles subdomain-based admin routing:
 *   admin.localhost  →  /admin/*
 *   admin.*          →  /admin/*
 *
 * The function MUST be named `proxy` (or be the default export)
 * per the Next.js 16 file convention.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Remove port if present for consistent checking
  const currentHost = hostname.replace(`:${url.port}`, '');

  const adminDomainEnv = process.env.NEXT_PUBLIC_ADMIN_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_ADMIN_APP_URL).hostname
    : '';

  const isAdminHost =
    currentHost === 'admin.localhost' ||
    currentHost.startsWith('admin.') ||
    (adminDomainEnv && currentHost === adminDomainEnv) ||
    url.port === '3001' ||
    hostname.includes(':3001');

  if (isAdminHost) {
    // If on admin domain and accessing /login, rewrite to /admin/login
    if (url.pathname === '/login') {
      url.pathname = '/admin/login';
      return NextResponse.rewrite(url);
    }

    // Preserve authentication and static paths without /admin prefix
    if (
      !url.pathname.startsWith('/admin') &&
      !url.pathname.startsWith('/api')
    ) {
      url.pathname = url.pathname === '/' ? '/admin' : `/admin${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}


export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
