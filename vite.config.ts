// vite.config.ts — builds the kundali plugin UI as an IIFE that registers
// itself on window.__TELE_PLUGIN_UI__["kundali-match"]. Loaded by tele's
// PluginSlot at runtime via <script src="/api/applications/<uuid>/ui.js">.
//
// IMPORTANT: kundali stays on npm (not pnpm) and lives OUTSIDE the tele
// workspace by design — the plugin must build standalone from arbitrary
// repos. React is shared via window.React (set by tele's PluginSlot BEFORE
// script injection), so react/react-dom are Rollup externals here — never
// bundled.
//
// JSX runtime: classic (jsxRuntime: "classic"). Reason: the modern
// "automatic" runtime emits React.jsx/React.jsxs calls, but those helpers
// don't exist on the main `react` namespace — only on `react/jsx-runtime`,
// which we cannot externalize to window.React. Classic emits
// React.createElement(...), which IS on window.React. Bundle-size cost is
// negligible.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react({ jsxRuntime: "classic" })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/ui.tsx"),
      name: "KundaliPluginUI",
      formats: ["iife"],
      fileName: () => "ui.js",
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    outDir: "dist",
  },
});
