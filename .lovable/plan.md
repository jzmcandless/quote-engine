# Enable make/model URL prefill

## Problem

The `StepVehicle` component already contains logic that reads the last two URL path segments, slugifies them (strips non-alphanumerics, lowercase), and matches them against the active makes/models loaded from the database. That means `/ford/f-150`, `/ford/c-max`, `/ford/e250-350`, `/ford/transit-van-wagon`, and `/ford/e-150-250` are all designed to resolve to real rows such as `Ford / F-150`, `Ford / C-Max`, `Ford / E250/350`, `Ford / Transit Van/Wagon`, and `Ford / E-150/250`.

However, `src/App.tsx` only registers these routes:

- `/`
- `/admin/login`
- `/admin`
- `*` → `NotFound`

Any two-segment path like `/ford/f-150` matches the `*` catch-all and renders the 404 page, so the wizard never mounts and the prefill code never runs.

## Change

Add a route in `src/App.tsx` that renders the same `Index` page for two-segment marketing URLs, placed above the catch-all and below the admin routes so it does not shadow them:

```tsx
<Route path="/:make/:model" element={<Index />} />
```

No changes are needed inside `StepVehicle` — its existing `window.location.pathname` parsing already handles all five example slugs correctly. Admin routes (`/admin`, `/admin/login`) continue to match first because they are more specific.

## Verification

After the route is added, drive the running preview with Playwright for each of the five URLs, wait for the makes query to resolve, and screenshot the Vehicle step. Confirm the Make and Model selects show the expected pre-filled values:

| URL | Expected Make | Expected Model |
| --- | --- | --- |
| `/ford/f-150` | Ford | F-150 |
| `/ford/c-max` | Ford | C-Max |
| `/ford/e250-350` | Ford | E250/350 |
| `/ford/transit-van-wagon` | Ford | Transit Van/Wagon |
| `/ford/e-150-250` | Ford | E-150/250 |

## Out of scope

- The pre-existing `create_quote_session` 404 (`gen_random_bytes` missing) seen in network logs is unrelated to prefill and is tracked separately.
- No SEO/meta changes, no new pages, no styling changes.
