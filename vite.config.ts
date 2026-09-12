import { defineConfig } from "vitest/config";

export default defineConfig({
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  test: { include: ["tests/unit/**/*.test.{ts,tsx,mjs}"], environment: "node" },
});
