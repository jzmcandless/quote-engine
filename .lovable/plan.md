
# Strict Server-Side Validation

Harden the three anonymous entry points — `patch_quote_session` RPC, `quote-compute` edge function, and `quote-submit` edge function — with explicit schema validation. Reject anything that doesn't match. Return only generic user-safe error messages.

## 1. Shared validation module (edge functions)

Create `supabase/functions/_shared/validate.ts` with zod schemas + helpers:

- **Body size guard**: cap `Content-Length` at 8 KB; read as text, `JSON.parse` inside try/catch.
- **Generic error helper**: `bad(status, code)` returning `{ error: <short slug> }`. Never surface Postgres errors or exception messages; log them server-side only.
- **Regex constants**: email (RFC-lite), phone digits/spaces/+/-/(), VIN alnum 11–17, session id uuid, write token base64 44 chars, plan id uuid, province from fixed list, deductible from fixed list.
- **Length caps**: name 100, email 255, phone 20, vin 17, street 200, city 100, message-derived fields bounded by their sources, all free-text fields ≤500.
- **Numeric caps**: year 1980–2100, mileage 0–1_000_000, yearsCovered 1–15, mileageCovered 1_000–500_000, price 0–1_000_000.
- **JSON depth / key count**: `assertShape(obj, {maxDepth:4, maxKeys:40, maxStringLen:1000})` walker used before zod parse.
- **Additional details allowlist**: only known keys — `mileage`, `purchase_timeframe`, `commercial_use`, `has_snowplow` — with per-key enums (`purchase_timeframe` ∈ {`Less than 12 months`, `Between 12 and 36 months`, `More than 36 months`}, yes/no fields ∈ {`Yes`,`No`}). Silently drop unknown keys, reject invalid types.
- **Reference validation helper**: `assertPlanActive(admin, planId)`, `assertVehicleExists(admin, {year,make,model,drivetrain,fuel_type})`, `assertCoveragePricingExists(...)`. Returns boolean; caller returns 422 with generic code on false.

## 2. `quote-compute` — explicit input schema

```
{
  session_id: uuid,
  write_token: base64 string 20–100 chars,
  vehicle: {
    year: int 1980–2100 | null,
    make: string 1–80,
    model: string 1–120,
    drivetrain: string 0–40,
    fuelType: string 0–40,
  },
  additional_details: {allowlisted keys only, values enums/ints},
  coverage?: {
    planId: uuid,
    planName: string 1–120,
    yearsCovered: int 1–15,
    mileageCovered: int 1000–500000,
    deductible: enum,
  }
}
```
- Reject `Content-Length > 8192` up front.
- Reject any extra top-level keys (zod `.strict()`).
- If `coverage` present: verify `plan_id` exists in `plans WHERE active=true`, and vehicle row exists in `vehicles WHERE active=true`. Missing → 422 `{error:"invalid_selection"}`.
- All other failures → 400 `{error:"invalid_request"}`, 401 `{error:"unauthorized"}`, 500 `{error:"server_error"}`.
- All exceptions caught; log with `console.error` including request id, respond generically.

## 3. `quote-submit` — explicit input schema

```
{
  session_id: uuid,
  write_token: base64 string 20–100 chars,
  kind: enum "purchase" | "custom_request",
  contact: {
    first_name: 1–100,
    last_name: 1–100,
    email: email 5–255,
    phone: 7–20 chars matching phone regex,
    vin?: 11–17 alnum | null,
    street_address?: 0–200 | null,
    city?: 0–100 | null,
    province?: fixed 13-value enum | null,
  }
}
```
- Strict `.strict()` on both objects.
- For `kind:"purchase"`: require session has `is_eligible=true` and `price` not null (already loaded from DB — no client price accepted).
- Generic error codes only.

## 4. RPC hardening: `patch_quote_session`

Replace the current permissive body with explicit per-field validation in PL/pgSQL:

- `current_step`: int 1–7.
- `vehicle`: must be a JSON object with only keys {`year`,`make`,`model`,`drivetrain`,`fuelType`}, each ≤120 chars, year int 1980–2100 or null.
- `additional_details`: object, at most 20 keys, each key ≤64 chars, each value ≤200 chars or int within bounds. Unknown keys allowed only inside a whitelist set; reject if any key contains non `[a-z0-9_]`.
- `coverage`: keys already narrowed; add length + numeric bounds and reject invalid deductible.
- Contact fields: length caps (`first_name`/`last_name` ≤100, `email` ≤255 and matches simple regex `^[^@\s]+@[^@\s]+\.[^@\s]+$`, `phone` ≤20 matching digits/`+`/`-`/space/`(`/`)`).
- `user_agent` ≤500, `referrer` ≤500.
- On any violation: `RAISE EXCEPTION 'invalid_input'` (single generic token, not a Postgres detail). Client library already surfaces only a generic toast.

## 5. RPC hardening: `create_quote_session`

- Cap `p_user_agent` to first 500 chars and `p_referrer` to first 500 chars before insert (no rejection — these are advisory).

## 6. Frontend impact

- No UX changes. `patchSession` already restricts keys client-side.
- `StepConfirm.tsx` already trims + length-limits inputs; keep as-is. Any user typing a bad email now gets a generic error toast instead of the previous silent server accept.
- No new dependencies expected: `zod` is already in the app; edge functions use `npm:zod@3` via `npm:` specifier.

## 7. Deliverables

- New file: `supabase/functions/_shared/validate.ts`.
- Edited: `supabase/functions/quote-compute/index.ts`, `supabase/functions/quote-submit/index.ts` — wire in validation, replace all error responses with generic codes, wrap the handler in try/catch.
- Migration: replace `patch_quote_session` body with strict validation; tighten `create_quote_session` for length-capped inputs. Keep signatures unchanged so the frontend doesn't move.

## 8. Non-goals

- No changes to admin, widget, UI, styling, or existing user data.
- No rate-limiting in this pass (call it out to the user as a follow-up if abuse is observed).
