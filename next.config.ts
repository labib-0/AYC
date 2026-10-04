import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/orders",
        destination: "/dashboard/orders",
        permanent: false,
      },
      {
        source: "/account",
        destination: "/profile",
        permanent: false,
      },
      {
        source: "/addresses",
        destination: "/dashboard/addresses",
        permanent: false,
      },
      {
        source: "/quotations",
        destination: "/dashboard/quotes",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
    const apiBase = rawApiUrl.replace(/\/api\/v1\/?$/, "/api").replace(/\/$/, "");
    return [
      {
        source: "/ayc/api/:path*",
        destination: `${apiBase}/:path*`,
      },
      {
        source: "/ayc/storage/:path*",
        destination: "/storage/:path*",
      },
    ];
  },
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ayaanclothing.com",
      },
      {
        protocol: "https",
        hostname: "www.ayaanclothing.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3000",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
