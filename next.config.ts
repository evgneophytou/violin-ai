import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=()'
  },
  {
    // Content Security Policy
    // Allow self, inline styles (for Tailwind), and necessary external resources
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for some libraries
      "style-src 'self' 'unsafe-inline'", // Tailwind requires inline styles
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://*.googleapis.com",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join('; ')
  },
];

const nextConfig: NextConfig = {
  // Configuration for heavy client-only libraries
  // TensorFlow.js modules are loaded dynamically at runtime in pose-detector.ts
  // to avoid SSR issues with Turbopack
  
  // Enable standalone output for Docker deployments
  output: 'standalone',
  
  // Externalize server-only packages to prevent bundling in client
  serverExternalPackages: ['pg', '@prisma/adapter-pg'],
  
  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  
  // Enable compression
  compress: true,
  
  // Optimize package imports for better bundle size
  experimental: {
    optimizePackageImports: [
      '@google/generative-ai',
      'recharts',
      'lucide-react',
      'date-fns',
    ],
  },
};

export default nextConfig;
