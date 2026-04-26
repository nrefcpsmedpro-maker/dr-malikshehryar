import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const securedHeaders = [
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      {
        key: 'X-Robots-Tag',
        value: 'noindex, noarchive, nosnippet',
      },
    ];

    return [
      {
        source: '/courses/:courseId/lessons/:lessonId',
        headers: securedHeaders,
      },
      {
        source: '/api/video/:path*',
        headers: [
          ...securedHeaders,
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
