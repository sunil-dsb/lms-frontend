import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Backend origin (rewrite proxy keeps Set-Cookie on the page origin).
// Tolerates a bare `host:port` (no scheme) — env files on the team mix
// `http://192.168.0.153:8000` and `192.168.0.153:8000`, and Next rejects a
// destination that doesn't start with `/`, `http://` or `https://`.
// A bare public hostname gets https:// — the production backend 301s plain
// HTTP to HTTPS, and the rewrite would hand that redirect to the browser,
// which then calls the backend cross-origin instead of through this proxy.
const LOCAL_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

function normalizeOrigin(raw: string | undefined, fallback: string): string {
  const v = (raw ?? fallback).trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(v)) return v;
  return `${LOCAL_HOST.test(v) ? 'http' : 'https'}://${v}`;
}

const BACKEND_ORIGIN = normalizeOrigin(
  process.env.BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE ??
    process.env.NEXT_PUBLIC_API_URL,
  'http://localhost:8000',
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  experimental: {
    // react-icons is a large CJS barrel imported in ~40 files; scoping the
    // import transform to it shrinks the server + client bundles for every
    // admin/employee page that renders icons.
    optimizePackageImports: ['react-icons'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);