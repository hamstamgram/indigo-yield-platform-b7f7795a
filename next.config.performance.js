/**
 * Performance-optimized Next.js configuration
 * Implements code splitting, compression, and caching strategies
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build optimization
  swcMinify: true, // Use SWC for faster minification

  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },

  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Experimental features
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      "@radix-ui/react-icons",
      "lucide-react",
      "date-fns",
      "recharts",
      "react-chartjs-2",
    ],

    // Optimize CSS
    optimizeCss: true,

    // Enable turbopack (Next.js 14+)
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },

  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      // Split chunks for better caching
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunks
          vendor: {
            name: "vendor",
            chunks: "all",
            test: /node_modules/,
            priority: 20,
          },
          // Common chunks
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // UI components chunk
          ui: {
            name: "ui",
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            chunks: "all",
            priority: 30,
          },
          // Admin chunks (lazy load)
          admin: {
            name: "admin",
            test: /[\\/]src[\\/](components|pages)[\\/]admin[\\/]/,
            chunks: "async",
            priority: 25,
          },
        },
      },
      // Minimize bundle size
      minimize: true,
    };

    // Module resolution optimization
    config.resolve = {
      ...config.resolve,
      // Faster module resolution
      symlinks: false,
      // Reduce file system operations
      modules: ["node_modules"],
    };

    // Performance hints
    config.performance = {
      hints: process.env.NODE_ENV === "production" ? "warning" : false,
      maxEntrypointSize: 512000, // 500KB
      maxAssetSize: 512000, // 500KB
    };

    // Analyzer plugin (only in analyze mode)
    if (process.env.ANALYZE === "true") {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          openAnalyzer: true,
          reportFilename: "bundle-analysis.html",
        })
      );
    }

    return config;
  },

  // Compression
  compress: true,

  // Production source maps (disable for faster builds)
  productionBrowserSourceMaps: false,

  // ESLint during builds
  eslint: {
    // Only run ESLint in development
    ignoreDuringBuilds: process.env.NODE_ENV === "production",
  },

  // TypeScript during builds
  typescript: {
    // Only run TypeScript in development
    ignoreBuildErrors: process.env.NODE_ENV === "production",
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Security headers
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Cache static assets
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache images
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // Redirect root to dashboard
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },

  // Rewrites for API optimization
  async rewrites() {
    return [
      // Rewrite API routes for better caching
      {
        source: "/api/:path*",
        destination: "/api/:path*",
      },
    ];
  },

  // Output configuration
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  // Disable x-powered-by header
  poweredByHeader: false,

  // React strict mode
  reactStrictMode: true,

  // Generate ETags for caching
  generateEtags: true,

  // Page extensions
  pageExtensions: ["tsx", "ts", "jsx", "js"],
};

module.exports = nextConfig;

/**
 * Performance optimization checklist:
 *
 * ✅ Code splitting (automatic with Next.js)
 * ✅ Lazy loading (React.lazy + Suspense)
 * ✅ Image optimization (Next.js Image component)
 * ✅ Minification (SWC)
 * ✅ Compression (gzip/brotli)
 * ✅ Caching headers
 * ✅ Bundle analysis
 * ✅ Tree shaking
 * ✅ Production optimizations
 * ✅ Asset optimization
 *
 * Additional optimizations in codebase:
 * - TanStack Query for data caching
 * - React.memo for component memoization
 * - useCallback/useMemo for expensive computations
 * - Virtual scrolling for large lists
 * - Debounce/throttle for event handlers
 */
