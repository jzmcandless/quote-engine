
-- 1. Drop stale anon INSERT policy
DROP POLICY IF EXISTS "Anyone can submit a custom quote request" ON public.custom_quote_requests;

-- 2. Explicit deny-anon policies on quote_sessions
DROP POLICY IF EXISTS "Deny anon select on quote_sessions" ON public.quote_sessions;
DROP POLICY IF EXISTS "Deny anon insert on quote_sessions" ON public.quote_sessions;
DROP POLICY IF EXISTS "Deny anon update on quote_sessions" ON public.quote_sessions;
DROP POLICY IF EXISTS "Deny anon delete on quote_sessions" ON public.quote_sessions;
CREATE POLICY "Deny anon select on quote_sessions" ON public.quote_sessions FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert on quote_sessions" ON public.quote_sessions FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update on quote_sessions" ON public.quote_sessions FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon delete on quote_sessions" ON public.quote_sessions FOR DELETE TO anon USING (false);

-- 3. Deny-anon on custom_quote_requests
DROP POLICY IF EXISTS "Deny anon select on custom_quote_requests" ON public.custom_quote_requests;
DROP POLICY IF EXISTS "Deny anon insert on custom_quote_requests" ON public.custom_quote_requests;
DROP POLICY IF EXISTS "Deny anon update on custom_quote_requests" ON public.custom_quote_requests;
DROP POLICY IF EXISTS "Deny anon delete on custom_quote_requests" ON public.custom_quote_requests;
CREATE POLICY "Deny anon select on custom_quote_requests" ON public.custom_quote_requests FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert on custom_quote_requests" ON public.custom_quote_requests FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update on custom_quote_requests" ON public.custom_quote_requests FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon delete on custom_quote_requests" ON public.custom_quote_requests FOR DELETE TO anon USING (false);

-- Ensure admin-manage policy still exists on custom_quote_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='custom_quote_requests' AND policyname='Admins manage custom quote requests'
  ) THEN
    EXECUTE $p$CREATE POLICY "Admins manage custom quote requests" ON public.custom_quote_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role))$p$;
  END IF;
END$$;

-- 4. Reaffirm table grant matrix
REVOKE INSERT, UPDATE, DELETE ON public.quote_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.custom_quote_requests FROM anon, authenticated;
REVOKE SELECT ON public.quote_sessions FROM anon;
REVOKE SELECT ON public.custom_quote_requests FROM anon;
GRANT SELECT ON public.quote_sessions        TO authenticated;
GRANT SELECT ON public.custom_quote_requests TO authenticated;
GRANT ALL    ON public.quote_sessions        TO service_role;
GRANT ALL    ON public.custom_quote_requests TO service_role;

-- 5. Reaffirm function EXECUTE grants
REVOKE EXECUTE ON FUNCTION public.upsert_quote_session(text, jsonb)                                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_quote_computation(text,text,boolean,text,numeric,jsonb,jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_quote_session(text,text)                                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_quote_session_token(text,text)                                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sweep_quote_sessions()                                                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_abandon_notified(uuid)                                              FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.upsert_quote_session(text, jsonb)                                         TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_quote_computation(text,text,boolean,text,numeric,jsonb,jsonb,text)  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_quote_session(text,text)                                         TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_quote_session_token(text,text)                                     TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_quote_sessions()                                                    TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_abandon_notified(uuid)                                               TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_quote_session(text,text)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.patch_quote_session(text,text,jsonb)         FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_quote_session(text,text)              TO anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.patch_quote_session(text,text,jsonb)         TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
