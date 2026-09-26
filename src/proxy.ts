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

  const adminAppUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_ADMIN_APP_URL)
    : null;

  const isAdminHost =
    request.headers.get('x-admin-app') === 'true' ||
    request.headers.get('x-is-admin-host') === '1' ||
    currentHost === 'admin.localhost' ||
    currentHost.startsWith('admin.') ||
    (adminAppUrl && adminAppUrl.hostname !== 'localhost' && currentHost === adminAppUrl.hostname) ||
    (adminAppUrl && adminAppUrl.port && (url.port === adminAppUrl.port || hostname.includes(`:${adminAppUrl.port}`))) ||
    url.port === '3001' ||
    hostname.includes(':3001');

  // Customer origin isolation: if request is on customer origin and targets /admin, redirect to dedicated admin app
  if (!isAdminHost && (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))) {
    const adminOrigin = adminAppUrl ? adminAppUrl.origin : `http://${url.hostname}:3001`;
    const cleanPath = url.pathname.replace(/^\/admin/, '') || '/';
    const redirectUrl = new URL(cleanPath, adminOrigin);
    redirectUrl.search = url.search;
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminHost) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-is-admin-host', '1');
    requestHeaders.set('x-admin-app', 'true');

    // If on admin domain and accessing /login, rewrite to /admin/login
    if (url.pathname === '/login') {
      url.pathname = '/admin/login';
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }

    // Preserve authentication and static paths without /admin prefix
    if (
      !url.pathname.startsWith('/admin') &&
      !url.pathname.startsWith('/api')
    ) {
      url.pathname = url.pathname === '/' ? '/admin' : `/admin${url.pathname}`;
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
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
