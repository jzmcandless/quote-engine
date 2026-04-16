

## Plan: Bundle Quote Wizard as an Embeddable Web Component

### Overview
Create a standalone JavaScript bundle that registers a `<quote-wizard>` custom element (web component). This can be dropped into any Webflow page via a single `<script>` tag and a custom HTML element — no iframe needed.

### How it works in Webflow
Once built and published, you add two lines to your Webflow page (via custom code embed or site-level custom code):

```text
<script src="https://your-published-url.lovable.app/widget.js"></script>
<quote-wizard></quote-wizard>
```

The widget renders inside a Shadow DOM so its styles don't conflict with Webflow's styles.

### Technical changes

**1. Create `src/widget.tsx`** — the web component entry point
- Imports React, ReactDOM, the `QuoteWizard` component, and the CSS
- Defines a class extending `HTMLElement` that:
  - Creates a Shadow DOM in `connectedCallback`
  - Injects the app's CSS into the shadow root (via a `<style>` tag with the bundled CSS)
  - Renders `<QuoteWizard />` inside the shadow root
- Registers it as `customElements.define('quote-wizard', ...)`

**2. Create `vite.config.widget.ts`** — a separate Vite build config
- Entry: `src/widget.tsx`
- Output: `dist-widget/widget.js` as an IIFE bundle (single file, no chunks)
- Inlines CSS into the JS bundle so only one file is needed
- Uses the same aliases and plugins as the main config

**3. Add a build script to `package.json`**
- `"build:widget": "vite build --config vite.config.widget.ts"`

**4. No changes to existing app code**
- The main app continues to work as-is
- The widget build is a separate output that reuses the same components

### Considerations
- Shadow DOM isolates the widget's Tailwind styles from Webflow
- The Supabase client works as-is since it uses the published project's anon key
- The widget JS file can be served from the published Lovable URL or copied to a CDN
- Font imports (DM Sans, Inter) will need to be added to the Webflow site's `<head>` or loaded inside the shadow root

