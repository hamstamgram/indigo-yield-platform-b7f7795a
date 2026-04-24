import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { componentTagger } from "lovable-tagger";

const buildVersion = Date.now().toString();

export default defineConfig(({ mode }) => ({
  test: {
    exclude: ["tests/e2e/**", "node_modules/**", ".opencode/**", ".claude/worktrees/**"],
  },
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ["host.docker.internal", "localhost"],
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      // SECURITY: Removed 'unsafe-eval' - not needed for production React builds
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: http: wss: ws:; worker-src 'self' blob:; frame-ancestors 'none';",
    },
  },
  preview: {
    host: "::",
    port: 8080,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      // SECURITY: Removed 'unsafe-eval' - not needed for production React builds
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: http: wss: ws:; worker-src 'self' blob:; frame-ancestors 'none';",
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(mode === "production" ? buildVersion : "dev"),
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    process.env.ANALYZE === "true" &&
      visualizer({
        open: true,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      }),
    {
      name: "version-file",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.txt",
          source: buildVersion,
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    // SECURITY: Disable source maps in production to prevent code exposure
    sourcemap: process.env.NODE_ENV !== "production",
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (/@radix-ui\/react-/.test(id) || /class-variance-authority|clsx|tailwind-merge/.test(id)) {
              return "ui";
            }
            if (/react|react-dom|react-router-dom/.test(id)) {
              return "vendor";
            }
            if (/@supabase\/supabase-js/.test(id)) {
              return "supabase";
            }
            if (/recharts/.test(id)) {
              return "charts";
            }
            if (/jspdf|html2canvas|jspdf-autotable/.test(id)) {
              return "pdf";
            }
          }
          return null;
        },
      },
    },
  },
}));
