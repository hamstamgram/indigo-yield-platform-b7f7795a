import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "./tests/setup.ts")],
    include: [
      "src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "tests/unit/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: [
      "node_modules",
      "dist",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "tests/integration/**",
      "tests/accessibility/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
