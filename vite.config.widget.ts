import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
    postcss: path.resolve(__dirname, "postcss.config.widget.cjs"),
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
        assetFileNames: "[name][extname]",
      },
    },
  },
});
