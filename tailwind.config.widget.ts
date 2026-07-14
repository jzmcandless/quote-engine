import type { Config } from "tailwindcss";
import baseConfig from "./tailwind.config";

// Widget-specific Tailwind config: same theme as the main app, but with
// an explicit content list that always includes every source file the
// widget bundle could reach. Guarantees all utilities used by the widget
// are emitted into the compiled CSS that gets inlined into widget.js.
export default {
  ...baseConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "./src/widget.tsx",
    "./src/widget.css",
  ],
  corePlugins: {
    ...(baseConfig.corePlugins ?? {}),
    preflight: true,
  },
} satisfies Config;
