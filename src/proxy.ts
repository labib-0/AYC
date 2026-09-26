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

  // Dedicated admin subdomain (legacy or explicit subdomain host like admin.ayaanclothing.com or admin.localhost)
  const isExplicitAdminSubdomain =
    currentHost === 'admin.localhost' ||
    currentHost.startsWith('admin.') ||
    (adminAppUrl && adminAppUrl.hostname.startsWith('admin.') && currentHost === adminAppUrl.hostname);

  const isPort3001 = url.port === '3001' || hostname.includes(':3001');

  const isAdminGateway =
    request.headers.get('x-admin-app') === 'true' ||
    request.headers.get('x-is-admin-host') === '1' ||
    isPort3001;

  const isPathAdmin = url.pathname === '/admin' || url.pathname.startsWith('/admin/');

  // If on explicit admin subdomain or port 3001 with unprefixed routes, rewrite to /admin/*
  if (isExplicitAdminSubdomain || (isPort3001 && !isPathAdmin)) {
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

  // If this is an admin path or admin gateway, attach admin headers and proceed
  if (isPathAdmin || isAdminGateway) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-is-admin-host', '1');
    requestHeaders.set('x-admin-app', 'true');

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
