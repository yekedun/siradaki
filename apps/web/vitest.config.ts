import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: {
    // Next.js'in SWC automatic JSX transform'unu vitest'te de etkinleştir
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@berber/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@berber/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
