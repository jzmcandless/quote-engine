
# Security Hardening Plan

Two focused changes: (1) move pricing/eligibility to the server, and (2) replace the publicly writable `upsert_quote_session` RPC with a session-id + write-token model that restricts what anonymous users may write.

Existing UX, admin panel, styling, and data are preserved. No table drops; only additive schema.

## 1. Server-authoritative pricing & eligibility

### New edge function: `quote-compute`
`supabase/functions/quote-compute/index.ts`, deployed with `verify_jwt = false`.

Request body (only raw inputs — never price, surcharges, eligibility, class, or status):
```
{
  session_id: string,
  write_token: string,
  vehicle: { year, make, model, drivetrain, fuelType },
  additional_details: { mileage, purchase_timeframe, commercial_use, has_snowplow, ... },
  coverage: { plan_id, years_covered, mileage_covered, deductible }
}
```

Server logic (uses service role):
1. Verify `session_id` + `write_token` via new `verify_quote_session_token(session_id, token_hash)` DB function (constant-time hash compare, SHA-256 of token).
2. Reject if session `status` ∈ (`completed_purchase`, `completed_custom_request`, `completed_ineligible`, `abandoned`) or older than 24h.
3. Look up `vehicles` row → `vehicle_class`.
4. Evaluate `eligibility_rules` + hard rules (mileage > 36 000, purchase timeframe > 36 months). If ineligible, persist and return `{ eligible: false, message }`.
5. Look up `coverage_pricing` row keyed by `(plan_id, vehicle_class, years_covered, mileage_covered, deductible, active=true)`. If missing → 422.
6. Compute surcharges from `surcharges` table (timeframe, commercial, snowplow-by-mileage).
7. Compute `final_price = price + deductible_cost + Σ surcharges`.
8. Persist authoritative fields via privileged RPC `apply_quote_computation(...)`: `vehicle_class`, `is_eligible`, `ineligible_message`, `price`, `surcharges`, `coverage`, plus a new `computed_at`, `computed_hash` (hash of inputs) to detect tampering.
9. Return the authoritative result to the client.

### New edge function: `quote-submit`
Server-side finalization (replaces client insert into `custom_quote_requests` and client-set `status = completed_*`):
- Verifies session + token.
- Re-runs the compute step (idempotent) and only then inserts into `custom_quote_requests` and sets `status = completed_purchase` / `completed_custom_request` / `completed_ineligible`.
- Only trusts server-computed price/surcharges when writing the request message.

### Frontend changes
- `StepQuote.tsx`: remove direct `coverage_pricing` + `surcharges` queries; call `quote-compute`; render returned price/surcharges.
- `StepEligibility.tsx`: remove client eligibility rule evaluation and vehicle-class lookup; call `quote-compute` (or a lightweight `quote-eligibility` sub-mode) to get `{ eligible, message, vehicleClass }`.
- `StepConfirm.tsx`: replace direct `custom_quote_requests` insert + `markCompleted` with call to `quote-submit`.
- `QuoteWizard.tsx` / `lib/quoteSession.ts`: stop sending `price`, `surcharges`, `vehicle_class`, `is_eligible`, `ineligible_message`, `status` in `patchSession` payloads.

## 2. Hardened anonymous session model

### Schema migration (additive, no data loss)
```sql
ALTER TABLE public.quote_sessions
  ADD COLUMN write_token_hash bytea,      -- SHA-256(token)
  ADD COLUMN token_created_at timestamptz,
  ADD COLUMN computed_at timestamptz,
  ADD COLUMN computed_input_hash text;
```
Existing rows without a hash remain readable/updatable only by service role; the browser cannot mutate them anymore.

### New RPCs (SECURITY DEFINER)
- `create_quote_session(p_user_agent, p_referrer) RETURNS TABLE(session_id text, write_token text)`
  - Server-generated `session_id` (`gen_random_uuid()`) and `write_token` (`encode(gen_random_bytes(32),'base64')`). Stores SHA-256 hash only. Returns raw token exactly once.
- `patch_quote_session(p_session_id, p_write_token, p_patch jsonb)`
  - Verifies token with `digest(...,'sha256')` + constant-time compare (`crypto_hash_sha256` via pgcrypto; compare with `= true` after `hmac`-style check).
  - Blocks patch when `status` is any completed/`abandoned` value, or session is older than 24h.
  - Applies **whitelist only**: `current_step`, `vehicle`, `additional_details`, `coverage` (identifiers only — `planId`, `yearsCovered`, `mileageCovered`, `deductible`, `planName`), `first_name`, `last_name`, `email`, `phone`, `user_agent`, `referrer`.
  - Silently ignores any other keys (price, surcharges, vehicle_class, is_eligible, ineligible_message, status, created_at, updated_at, abandoned_notified_at, last_activity_at, internal notes).
- `apply_quote_computation(p_session_id, ...)` — callable only by service role (revoke from anon/authenticated); used by edge functions.
- Keep `upsert_quote_session` for backward compat but **revoke EXECUTE from anon & authenticated**; only service role may call it.

### RLS
- `quote_sessions` remains no-select for anon (already the case). Confirm no anon SELECT policy exists.
- Grants: revoke direct table `INSERT/UPDATE` from anon; anon interacts only via the two RPCs above.

### Frontend session lib (`src/lib/quoteSession.ts`)
- On first load: call `create_quote_session`, store `{ session_id, write_token }` in `localStorage` (token treated as opaque bearer).
- All patches route through `patch_quote_session(session_id, write_token, patch)`.
- Heartbeat unchanged (empty patch).
- `markCompleted` removed; completion happens only through `quote-submit`.

## 3. Compatibility & manual steps

- **Data migration:** existing in-flight sessions (rows without `write_token_hash`) can no longer be updated by the browser; they remain intact and admin-visible. New sessions start on next page load — no user-visible break.
- **Edge functions:** auto-deployed. No manual Supabase steps.
- **Secrets:** no new secrets required. `SUPABASE_SERVICE_ROLE_KEY` is already available to edge functions.
- **Turnstile / GitHub / Cloudflare / hosting:** no changes required for this pass. (Turnstile bot-mitigation on `create_quote_session` can be added later if abuse appears.)
- **Admin panel:** unchanged — admins still read `quote_sessions` via existing policies.

## 4. Technical file list

- New: `supabase/functions/quote-compute/index.ts`, `supabase/functions/quote-submit/index.ts`
- New migration: token columns + RPCs + revokes
- Edited: `src/lib/quoteSession.ts`, `src/components/quote/QuoteWizard.tsx`, `StepEligibility.tsx`, `StepQuote.tsx`, `StepConfirm.tsx`, `src/types/quote.ts` (add token to session state; response type)

## 5. Out of scope (called out, not changed)

- No changes to admin auth, roles, CSV import, email templates, or widget build.
- `custom_quote_requests` insert policy: tightened to server-only via `quote-submit` (anon INSERT policy revoked in the same migration).
