import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');


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