import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

// DB-backed integration tests. Requires a Postgres migrated to head
// (DATABASE_URL; defaults to the local docker-compose database).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
