
CREATE OR REPLACE FUNCTION public.sweep_quote_sessions()
RETURNS TABLE(newly_abandoned_id uuid, email text, first_name text, last_name text, vehicle jsonb, current_step int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.quote_sessions
  WHERE status = 'abandoned'
    AND last_activity_at < now() - interval '365 days';

  RETURN QUERY
  WITH updated AS (
    UPDATE public.quote_sessions q
    SET status = 'abandoned'
    WHERE q.status = 'in_progress'
      AND q.last_activity_at < now() - interval '30 minutes'
    RETURNING q.id, q.email, q.first_name, q.last_name, q.vehicle, q.current_step, q.abandoned_notified_at
  )
  SELECT u.id, u.email, u.first_name, u.last_name, u.vehicle, u.current_step
  FROM updated u
  WHERE u.email IS NOT NULL AND u.email <> '' AND u.abandoned_notified_at IS NULL;
END;
$$;
