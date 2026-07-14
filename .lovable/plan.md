## Goal

Make the standalone widget (`dist-widget/widget.js`) render with the correct Tailwind/theme styling when embedded via Shadow DOM on an external site (e.g. Webflow), not only in the Lovable preview.

## Root causes

1. `src/index.css` defines theme variables only under `:root` and `.dark`. Inside a Shadow DOM, `:root` selectors don't cascade into the shadow tree, so `hsl(var(--primary))` resolves to nothing and Tailwind color utilities appear unstyled.
2. Tailwind's Preflight targets `html`/`body`, which don't exist inside the shadow root, so base resets are effectively lost.
3. `src/components/ui/select|popover|dropdown-menu|dialog` use Radix `Portal`, which renders into `document.body` — outside the shadow root — so those popovers lose all styling. Same for the Sonner `<Toaster />`.
4. The current build already imports `@/index.css?inline`, but Tailwind's `content` glob is fine; the real gap is scoping (item 1) and portal targeting (item 3), plus verifying the built bundle actually contains the utility CSS.

## Changes

### 1. New widget stylesheet: `src/widget.css`

- Same `@tailwind base/components/utilities` directives.
- Move the token block from `:root` → `:host, :root` so variables are defined at the shadow root.
- Move `.dark` overrides → `:host(.dark), .dark`.
- Replace the `body { @apply bg-background text-foreground }` base rule with `:host { @apply bg-background text-foreground; font-family: var(--font-body); display:block; }` so the shadow root itself carries theme background/typography.
- Keep the `* { @apply border-border }` and utility layers.

### 2. `src/widget.tsx`

- Import `@/widget.css?inline` instead of `@/index.css?inline`.
- After creating the shadow root, create a `<div data-portal-root>` inside the shadow and expose it via a React context (`ShadowRootContext`) so Radix portals + Sonner render inside the shadow tree.
- Pass `container={portalRoot}` on the Radix `Portal` wrappers via a new prop on our shadcn wrappers (see item 3).
- Configure `<Toaster />` in the widget tree to mount to the same in-shadow container (Sonner accepts a `toastOptions`/custom container via portalling into a wrapper element — render a `<div>` inside shadow and mount Sonner's `<Toaster />` there; if Sonner can't target a container, wrap it in a component that uses `createPortal(<Toaster/>, portalRoot)`).

### 3. Minimal shadcn wrapper updates (widget-only impact, no visual change in main app)

- `src/components/ui/select.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `dialog.tsx`: read the portal container from a new `ShadowRootContext` (default `undefined` = current behavior) and pass it as `container` on the Radix `Portal`. In the main app the context is not provided, so behavior is unchanged.

### 4. `vite.config.widget.ts`

- Keep `cssCodeSplit: false` and IIFE output.
- Add an explicit `css: { postcss: { plugins: [tailwindcss(tailwindWidgetConfig), autoprefixer()] } }` block so the widget build always uses a Tailwind config whose `content` explicitly lists the widget entry + all `src/**/*.{ts,tsx}` (independent of any future changes to the main app config). This guarantees every utility used by the widget is emitted.
- Confirm `?inline` import path so CSS ends up embedded inside `widget.js` and no separate `style.css` is emitted. Result stays a single file: `dist-widget/widget.js`.

### 5. `tailwind.config.widget.ts` (new)

- Re-exports the existing theme from `tailwind.config.ts` but sets `content: ['./src/**/*.{ts,tsx}', './src/widget.tsx']` and `corePlugins: { preflight: true }`. Same tokens/colors as the main app.

## Verification

- `npm run build:widget` (existing script that runs `vite build --config vite.config.widget.ts`).
- Confirm `dist-widget/` contains only `widget.js` (plus static assets already there) and that the JS bundle string-contains `--primary:` and `.bg-primary` (proof CSS + tokens are inlined).
- Write `dist-widget/test.html`:
  ```html
  <!doctype html><html><body>
    <quote-wizard></quote-wizard>
    <script src="./widget.js"></script>
  </body></html>
  ```
- Serve `dist-widget/` with a static server and load `test.html` in headless Chromium via Playwright. Screenshot at 1280×1800 and assert:
  - Primary button has computed `background-color` in the teal range (not transparent/black).
  - Card has non-transparent background and border.
  - Opening the Year `<Select>` shows a styled dropdown (portal is inside shadow, tokens resolve).
- Repeat with `hide-header` attribute to confirm the header-hidden embed path also styles correctly.

## Out of scope

- No changes to the main app's `src/index.css`, routes, or business logic.
- No new UI, no font swap, no dark-mode toggle inside the widget.
- Radix portal container plumbing is added only to the four wrappers actually used by the wizard steps; other shadcn primitives are left unchanged.
