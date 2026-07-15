
# RLS + Grants Audit Pass

Review completed. All 11 public tables already have RLS enabled and admin access is DB-enforced via `has_role(auth.uid(),'admin')`. Service-role key is not present in frontend code. Two loose ends need a new migration.

## Findings (nothing to weaken)

- **RLS enabled on every public table** (11/11). ✓
- **`quote_sessions`**: only `Admins manage quote sessions` policy exists — no anon SELECT/INSERT/UPDATE/DELETE policy → default-deny for anon. ✓
- **`notification_recipients`, `csv_import_jobs`, `user_roles`**: admin-only ALL policy, no anon access. ✓
- **Config tables** (`vehicles`, `plans`, `coverage_pricing`, `surcharges`, `eligibility_rules`, `additional_vehicle_fields`): admin ALL + public SELECT — intentional; needed by the quote flow. Leave as-is.
- **All SECURITY DEFINER functions** have `SET search_path = public`. ✓
- **`has_role`** is SECURITY DEFINER with fixed search_path. ✓
- **Frontend never references `SERVICE_ROLE`** or `SUPABASE_SERVICE_ROLE_KEY`. ✓
- **Two issues to fix in this pass** (below).

## Issue 1 — stale anon INSERT policy on `custom_quote_requests`

The `Anyone can submit a custom quote request` policy still allows anon/authenticated `INSERT`. The prior migration already revoked the table `INSERT` grant from anon/authenticated, so the policy is currently unreachable, but it's misleading and must be removed now that submissions go through the service-role `quote-submit` edge function.

## Issue 2 — belt-and-braces explicit denies + grant reaffirmation

Add explicit deny policies on `quote_sessions` for anon (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) and idempotently re-apply the intended grant matrix so future audits show it plainly.

## New migration (single timestamped file)

```sql
-- 1. Drop stale anon INSERT policy on custom_quote_requests
DROP POLICY IF EXISTS "Anyone can submit a custom quote request" ON public.custom_quote_requests;

-- 2. Explicit deny-anon policies on quote_sessions (defensive; default-deny is
--    already in effect since no permissive policy targets anon)
CREATE POLICY "Deny anon select on quote_sessions"
  ON public.quote_sessions FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert on quote_sessions"
  ON public.quote_sessions FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update on quote_sessions"
  ON public.quote_sessions FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon delete on quote_sessions"
  ON public.quote_sessions FOR DELETE TO anon USING (false);

-- 3. Same for custom_quote_requests (anon must go through quote-submit)
CREATE POLICY "Deny anon select on custom_quote_requests"
  ON public.custom_quote_requests FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert on custom_quote_requests"
  ON public.custom_quote_requests FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update on custom_quote_requests"
  ON public.custom_quote_requests FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon delete on custom_quote_requests"
  ON public.custom_quote_requests FOR DELETE TO anon USING (false);

-- 4. Reaffirm the intended grant matrix (idempotent)
REVOKE INSERT, UPDATE, DELETE ON public.quote_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.custom_quote_requests FROM anon, authenticated;
GRANT  SELECT ON public.quote_sessions          TO authenticated;  -- admin RLS gate
GRANT  SELECT ON public.custom_quote_requests   TO authenticated;  -- admin RLS gate
GRANT  ALL    ON public.quote_sessions          TO service_role;
GRANT  ALL    ON public.custom_quote_requests   TO service_role;

-- 5. Reaffirm function EXECUTE grants
REVOKE EXECUTE ON FUNCTION public.upsert_quote_session(text, jsonb)             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_quote_computation(text,text,boolean,text,numeric,jsonb,jsonb,text)
                                                                                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_quote_session(text,text)              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_quote_session_token(text,text)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sweep_quote_sessions()                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_abandon_notified(uuid)                    FROM PUBLIC, anon, authenticated;

GRANT  EXECUTE ON FUNCTION public.upsert_quote_session(text, jsonb)              TO service_role;
GRANT  EXECUTE ON FUNCTION public.apply_quote_computation(text,text,boolean,text,numeric,jsonb,jsonb,text)
                                                                                 TO service_role;
GRANT  EXECUTE ON FUNCTION public.complete_quote_session(text,text)              TO service_role;
GRANT  EXECUTE ON FUNCTION public.verify_quote_session_token(text,text)          TO service_role;
GRANT  EXECUTE ON FUNCTION public.sweep_quote_sessions()                         TO service_role;
GRANT  EXECUTE ON FUNCTION public.mark_abandon_notified(uuid)                    TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_quote_session(text,text)                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.patch_quote_session(text,text,jsonb)           FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_quote_session(text,text)                TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.patch_quote_session(text,text,jsonb)           TO anon, authenticated;

-- has_role is used by RLS policies; must be callable by authenticated (RLS runs as caller).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
```

## Not changed (per the "do not weaken admin policies" rule)

- All `Admins manage …` policies untouched.
- All public config-table SELECT policies untouched (quote flow requires them).
- No changes to Edge Functions or frontend — service-role usage is already confined to `quote-compute`, `quote-submit`, and `sweep-abandoned-sessions`.

## Compatibility notes

- Purely additive/idempotent. No data loss.
- Anon submissions of `custom_quote_requests` via direct PostgREST already fail (grant was previously revoked); dropping the policy just cleans up. Legitimate submissions continue via the `quote-submit` edge function.
- No frontend, styling, or admin-panel changes required. No manual Supabase / Cloudflare / GitHub configuration.
