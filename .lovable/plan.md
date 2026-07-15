
## Root cause

Every `create_quote_session` RPC is returning 404 with:

> `function gen_random_bytes(integer) does not exist`

Because the session can't be created, `initSession()` fails, `getSessionCredentials()` returns null, and `StepEligibility.checkEligibility()` hits its catch/fallback branch:

```ts
onResult(false, "Unable to check eligibility right now. Please try again.", null);
```

So the UI shows *every* vehicle as ineligible. The problem is not the eligibility logic itself — it's that the pgcrypto functions (`gen_random_bytes`, `digest`) used by our SECURITY DEFINER helpers are not resolvable under the function's fixed `search_path = public`. On Lovable Cloud, pgcrypto lives in the `extensions` schema, which isn't on the function's search_path.

The same issue affects `verify_quote_session_token` and `patch_quote_session` (they both call `digest(...)`), so even if a session existed, compute/patch calls would fail too.

## Fix (single new timestamped migration)

1. Ensure the extension is available:
   ```sql
   create extension if not exists pgcrypto with schema extensions;
   ```
2. `CREATE OR REPLACE` the three affected functions with the same bodies, changing every `gen_random_bytes(...)` → `extensions.gen_random_bytes(...)` and `digest(...)` → `extensions.digest(...)`. Keep `SECURITY DEFINER` and `SET search_path = public` (schema-qualifying is safer than widening search_path).
   - `public.create_quote_session`
   - `public.patch_quote_session`
   - `public.verify_quote_session_token`
3. Re-assert existing EXECUTE grants (anon+authenticated+service_role for create/patch; service_role only for verify) so the replacement doesn't reset privileges.

No table, RLS, or policy changes. No frontend changes. No data migration. Existing sessions (if any) are unaffected — token hashes remain valid because `digest('sha256')` returns the same bytes regardless of which schema hosts the function.

## Verification after apply

- Reload the quote flow; confirm `POST /rpc/create_quote_session` returns 200 with `{session_id, write_token}`.
- Walk through steps 1→3 for a known-eligible vehicle and confirm the eligibility screen shows "Your Vehicle Qualifies!".
- Check `supabase edge_function_logs` for `quote-compute` — no `unauthorized` responses.

## Manual configuration required

None. The migration handles everything; pgcrypto is already available on Lovable Cloud, we're just ensuring it and schema-qualifying calls.
