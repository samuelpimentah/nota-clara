import type { NextConfig } from 'next';
const staticHost = process.env.NEXT_PUBLIC_STATIC_HOST === 'true';
const config: NextConfig = {
  ...(staticHost ? { output: 'export', trailingSlash: true, basePath: process.env.PAGES_BASE_PATH || '', images: { unoptimized: true } } : {}),
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_BASE_PATH: staticHost ? process.env.PAGES_BASE_PATH || '' : '' },
  ...(staticHost ? {} : { async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  } }),
};
export default config;
