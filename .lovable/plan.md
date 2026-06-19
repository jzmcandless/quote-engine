Add an optional `showHeader` prop to `QuoteWizard` (defaults to `true`) and conditionally render the "Extended Warranty Quote" title + subheading block. When the form is embedded via the web component (`<quote-wizard>`), read a `hide-header` HTML attribute and pass `showHeader={false}` so the title and subheading are suppressed.

Technical details:
- `src/components/quote/QuoteWizard.tsx`: Add `showHeader?: boolean` to props (default true). Wrap the header `<div>` in a conditional.
- `src/widget.tsx`: Read `this.hasAttribute('hide-header')` and pass the inverse as `showHeader` prop to `<QuoteWizard />`.
- No changes needed to `src/pages/Index.tsx` — it continues to show the header by default.