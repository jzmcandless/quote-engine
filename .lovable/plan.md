# Robust URL prefill for Make / Model

The current prefill in `src/components/quote/StepVehicle.tsx` normalizes the URL segment by replacing `-`/`_` with spaces and then does a case-insensitive equality check against the DB value. That breaks for real-world names:

- `/ford/c-max` → normalized `"c max"` ≠ DB `"C-Max"`
- `/ford/transit-van-wagon` → normalized `"transit van wagon"` ≠ DB `"Transit Van/Wagon"` (URL can't carry a `/`)

## Fix

Switch the match to a "slug-equivalent" comparison that ignores every non-alphanumeric character on both sides.

```ts
const slug = (s: string) =>
  decodeURIComponent(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
```

Examples after `slug()`:

| URL segment            | slug            | DB value             | DB slug         | Match |
|------------------------|-----------------|----------------------|-----------------|-------|
| `c-max`                | `cmax`          | `C-Max`              | `cmax`          | yes   |
| `transit-van-wagon`    | `transitvanwagon` | `Transit Van/Wagon`| `transitvanwagon` | yes |
| `continental`          | `continental`   | `Continental`        | `continental`   | yes   |
| `lincoln`              | `lincoln`       | `Lincoln`            | `lincoln`       | yes   |

## Changes in `src/components/quote/StepVehicle.tsx`

1. Replace the `norm` helper (which collapsed `-`/`_` to spaces) with the `slug` helper above.
2. Store the raw URL segments as hints (no pre-normalization needed), then in the makes and models load effects, match with `list.find(v => slug(v) === slug(hint))`.
3. Keep everything else (fallback to no-op when no match, clearing hint after apply, the two-segment path requirement) unchanged.

No changes needed in `QuoteWizard.tsx`, `widget.tsx`, build configs, or other steps — model/drivetrain/fuel logic already flows from a matched model.

## Verification

- Load the built widget in `dist-widget/test.html` at paths `/ford/c-max` and `/ford/transit-van-wagon` via Playwright and confirm the Make and Model selects show `Ford` and `C-Max` / `Transit Van/Wagon` on first render (assuming those rows exist in `vehicles`).
- Sanity check the previously working `/lincoln/continental` still prefills.
