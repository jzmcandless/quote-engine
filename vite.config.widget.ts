import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import tailwindWidgetConfig from "./tailwind.config.widget";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(tailwindWidgetConfig as Parameters<typeof tailwindcss>[0]),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: "dist-widget",
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, "src/widget.tsx"),
      name: "QuoteWizard",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        // Prevent Vite from emitting a separate style.css — widget.css
        // is imported with ?inline and gets embedded in the JS bundle.
        assetFileNames: "[name][extname]",
      },
    },
  },
});
