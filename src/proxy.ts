import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { GEO_BLOCKED_HTML } from '@/lib/geo-block-page';

/**
 * Proxy (formerly Middleware) — Next.js 16+
 *
 * Handles subdomain-based admin routing:
 *   admin.localhost  →  /admin/*
 *   admin.*          →  /admin/*
 *
 * And enforces Bangladesh Customer Storefront Access Control via
 * authoritative internal Laravel GeoIP check.
 *
 * The function MUST be named `proxy` (or be the default export)
 * per the Next.js 16 file convention.
 */
export async function proxy(request: NextRequest) {
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

  const isPathAyc = url.pathname === '/ayc' || url.pathname.startsWith('/ayc/');
  const isPathAdmin = url.pathname === '/admin' || url.pathname.startsWith('/admin/');

  // Retired legacy /admin: explicitly return 404 Not Found (Do NOT redirect to /ayc)
  if (isPathAdmin) {
    url.pathname = '/_not-found';
    return NextResponse.rewrite(url, { status: 404 });
  }

  // If on explicit admin subdomain or port 3001 with unprefixed routes, rewrite to /ayc/*
  if (isExplicitAdminSubdomain || (isPort3001 && !isPathAyc)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-is-admin-host', '1');
    requestHeaders.set('x-admin-app', 'true');

    // If on admin domain and accessing /login, rewrite to /ayc
    if (url.pathname === '/login') {
      url.pathname = '/ayc';
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }

    // Preserve authentication and static paths without /ayc prefix
    if (
      !url.pathname.startsWith('/ayc') &&
      !url.pathname.startsWith('/api')
    ) {
      url.pathname = url.pathname === '/' ? '/ayc/dashboard' : `/ayc${url.pathname}`;
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

  // If this is an admin path or admin gateway, attach admin headers and proceed immediately
  // Admin panel is NEVER subject to storefront country restriction
  if (isPathAyc || isAdminGateway) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-is-admin-host', '1');
    requestHeaders.set('x-admin-app', 'true');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Skip static assets and non-storefront paths
  const pathname = url.pathname;
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/storage') ||
    pathname.startsWith('/_next') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.txt') ||
    pathname.endsWith('.xml') ||
    pathname.endsWith('.webmanifest')
  ) {
    return NextResponse.next();
  }

  // ── Explicit Route Scope Classification ────────────────────────────────
  // Customer operational and account service routes are buyer fulfillment services,
  // NOT public storefront browsing content. They remain accessible so international
  // buyers can track orders, inspect invoices, and access account services globally.
  const isCustomerServiceRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/rfq' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/order-access') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile');

  if (isCustomerServiceRoute) {
    return NextResponse.next();
  }

  // ── Customer Storefront Bangladesh Access Check ────────────────────────
  // Check if Bangladesh storefront blocking is active via internal Laravel API.
  // Storefront routes: /, /products, /products/*, /search, /privacy-policy, /terms-and-conditions
  try {
    const rawApiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
    const internalSecret =
      process.env.INTERNAL_API_SECRET ||
      (process.env.NODE_ENV === 'production' ? '' : 'ayc_internal_country_lock_secret_2026');

    // Extract client IP forwarded from trusted Nginx upstream.
    // Nginx sets X-Real-IP to $remote_addr (connection socket IP).
    // If evaluating X-Forwarded-For, extract the rightmost (most recent proxy) IP to prevent spoofing.
    const forwardedHeader = request.headers.get('x-forwarded-for');
    const forwardedLastIp = forwardedHeader ? forwardedHeader.split(',').pop()?.trim() : '';
    const clientIp = request.headers.get('x-real-ip') || forwardedLastIp || '';

    if (!clientIp) {
      // If no client IP can be established, allow access safely (fail open)
      return NextResponse.next();
    }

    const checkUrl = `${rawApiUrl}/internal/storefront/access-check`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'x-internal-secret': internalSecret,
        'x-internal-client-ip': clientIp,
        'accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.allowed === false) {
        return new NextResponse(GEO_BLOCKED_HTML, {
          status: 403,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store, no-cache, must-revalidate',
          },
        });
      }
    }
  } catch (err) {
    // Fail-safe: Always preserve normal storefront access if check fails or times out
    console.warn('[proxy] Storefront access check warning:', (err as Error)?.message);
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
