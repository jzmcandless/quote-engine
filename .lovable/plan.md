
## Goal
1. Reorder Step 1 fields so **Make → Model → Year** (year moves to third position).
2. Prefill **Make** and **Model** from the URL path (e.g. `/lincoln/continental` → Lincoln + Continental), so the user only has to pick the Year on that page.

## Why this order works
Make and Model don't depend on Year in the current data flow — the DB queries for models/drivetrains/fuel types already filter only by make/model. Year is only used later for eligibility and pricing. Moving Year to third has no functional impact on downstream steps.

## URL parsing
- Read `window.location.pathname`, take the **last two non-empty segments**, URL-decode them, and replace `-`/`_` with spaces.
- Match case-insensitively against the makes/models loaded from the database. Casing (`lincoln`, `Lincoln`), hyphens (`grand-marquis` → `Grand Marquis`), and encoded chars all resolve.
- If a segment doesn't match, the field stays empty and the user picks manually — nothing breaks on unrelated URLs like `/` or `/admin`.
- Works for the standalone site and the embedded `<quote-wizard>` web component (reads the host page's URL).

## Changes

**`src/components/quote/StepVehicle.tsx`**
- Reorder the JSX so the Selects render in this order: Make, Model, Year. (Drivetrain/Fuel Type stay after, as today.)
- Remove the `disabled={!vehicle.year}` on Make and the year-reset behavior on make change; Make is now always enabled. Year Select stays always enabled.
- Keep the existing chained resets (changing Make clears Model/drivetrain/fuel; changing Model clears drivetrain/fuel). Changing Year resets nothing else.
- Add URL prefill: on mount, parse the last two path segments into `{makeHint, modelHint}`.
  - In the "load makes" effect, after `setMakes(...)`, if `vehicle.make` is empty and `makeHint` matches an entry (case-insensitive), call `onChange({ ...vehicle, make: matched })`.
  - In the "load models" effect, after `setModels(...)`, if `vehicle.model` is empty and `modelHint` matches, call `onChange({ ...vehicle, model: matched })`.
  - Clear each hint after it is applied so later manual edits aren't overridden.
- `canProceed` unchanged (still requires year + make + model + drivetrain + fuel type).

**No changes** to `QuoteWizard.tsx`, `widget.tsx`, `Index.tsx`, `types/quote.ts`, or any downstream step — the `VehicleSelection` shape and required fields are the same.

## Out of scope
- Year prefill (not part of the URL scheme).
- Redirects, SEO metadata, or route registration based on `/{make}/{model}` — the app still serves the wizard at any path; parsing is best-effort.
- Fuzzy matching beyond case + hyphen/underscore normalization.
