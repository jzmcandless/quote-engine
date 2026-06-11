
-- Lock down Realtime: remove quote_sessions PII broadcast
ALTER PUBLICATION supabase_realtime DROP TABLE public.quote_sessions;

-- Restrict SECURITY DEFINER admin/cron functions to service_role only
REVOKE EXECUTE ON FUNCTION public.sweep_quote_sessions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_abandon_notified(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_quote_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_abandon_notified(uuid) TO service_role;

-- Tighten overly permissive INSERT policy on custom_quote_requests
DROP POLICY IF EXISTS "Anyone can submit a custom quote request" ON public.custom_quote_requests;
CREATE POLICY "Anyone can submit a custom quote request"
ON public.custom_quote_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(first_name) BETWEEN 1 AND 100
  AND length(last_name) BETWEEN 1 AND 100
  AND length(email) BETWEEN 5 AND 255
  AND email LIKE '%_@_%.__%'
  AND length(phone) BETWEEN 5 AND 30
);
