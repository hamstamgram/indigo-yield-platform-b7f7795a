import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [path.resolve(__dirname, "./tests/integration/yield-engine/setup.ts")],
    include: ["tests/integration/yield-engine/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 60000,
    hookTimeout: 60000,
    // Run tests sequentially to avoid DB conflicts
    sequence: {
      concurrent: false,
    },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
