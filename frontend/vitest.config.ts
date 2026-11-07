import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    exclude: ["node_modules", "dist", ".next", "tests-e2e"],
    // antd's CSS-in-JS engine and portal-rendered overlays (Modal, Drawer,
    // notification) flake under parallel JSDOM workers — multiple style sheets
    // get injected into shared global state. Run files sequentially so antd
    // tokens, registries, and portal mounts stay isolated per file.
    fileParallelism: false,
  },
});
