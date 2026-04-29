
-- quote_sessions table
CREATE TABLE public.quote_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'in_progress',
  current_step int NOT NULL DEFAULT 1,
  vehicle jsonb,
  additional_details jsonb,
  coverage jsonb,
  vehicle_class text,
  is_eligible boolean,
  ineligible_message text,
  price numeric,
  surcharges jsonb,
  first_name text,
  last_name text,
  email text,
  phone text,
  user_agent text,
  referrer text,
  abandoned_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_sessions_status ON public.quote_sessions(status);
CREATE INDEX idx_quote_sessions_last_activity ON public.quote_sessions(last_activity_at);
CREATE INDEX idx_quote_sessions_email ON public.quote_sessions(email);
CREATE INDEX idx_quote_sessions_created ON public.quote_sessions(created_at DESC);

ALTER TABLE public.quote_sessions ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admins manage quote sessions"
  ON public.quote_sessions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public: no direct SELECT/UPDATE/DELETE. All public writes go through the RPC below.

-- Trigger: updated_at
CREATE TRIGGER trg_quote_sessions_updated_at
BEFORE UPDATE ON public.quote_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public RPC: upsert by session_id, scoped patch (no read of other rows)
CREATE OR REPLACE FUNCTION public.upsert_quote_session(
  p_session_id text,
  p_patch jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text := p_patch->>'status';
  v_current_step int := NULLIF(p_patch->>'current_step','')::int;
  v_vehicle jsonb := p_patch->'vehicle';
  v_additional_details jsonb := p_patch->'additional_details';
  v_coverage jsonb := p_patch->'coverage';
  v_vehicle_class text := p_patch->>'vehicle_class';
  v_is_eligible boolean := CASE WHEN p_patch ? 'is_eligible' THEN (p_patch->>'is_eligible')::boolean ELSE NULL END;
  v_ineligible_message text := p_patch->>'ineligible_message';
  v_price numeric := NULLIF(p_patch->>'price','')::numeric;
  v_surcharges jsonb := p_patch->'surcharges';
  v_first_name text := p_patch->>'first_name';
  v_last_name text := p_patch->>'last_name';
  v_email text := p_patch->>'email';
  v_phone text := p_patch->>'phone';
  v_user_agent text := p_patch->>'user_agent';
  v_referrer text := p_patch->>'referrer';
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) < 8 THEN
    RAISE EXCEPTION 'invalid session_id';
  END IF;

  INSERT INTO public.quote_sessions (
    session_id, status, current_step, vehicle, additional_details, coverage,
    vehicle_class, is_eligible, ineligible_message, price, surcharges,
    first_name, last_name, email, phone, user_agent, referrer, last_activity_at
  ) VALUES (
    p_session_id,
    COALESCE(v_status, 'in_progress'),
    COALESCE(v_current_step, 1),
    v_vehicle, v_additional_details, v_coverage,
    v_vehicle_class, v_is_eligible, v_ineligible_message, v_price, v_surcharges,
    v_first_name, v_last_name, v_email, v_phone, v_user_agent, v_referrer, now()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    status = COALESCE(EXCLUDED.status, public.quote_sessions.status),
    current_step = GREATEST(COALESCE(EXCLUDED.current_step, public.quote_sessions.current_step), public.quote_sessions.current_step),
    vehicle = COALESCE(EXCLUDED.vehicle, public.quote_sessions.vehicle),
    additional_details = COALESCE(EXCLUDED.additional_details, public.quote_sessions.additional_details),
    coverage = COALESCE(EXCLUDED.coverage, public.quote_sessions.coverage),
    vehicle_class = COALESCE(EXCLUDED.vehicle_class, public.quote_sessions.vehicle_class),
    is_eligible = COALESCE(EXCLUDED.is_eligible, public.quote_sessions.is_eligible),
    ineligible_message = COALESCE(EXCLUDED.ineligible_message, public.quote_sessions.ineligible_message),
    price = COALESCE(EXCLUDED.price, public.quote_sessions.price),
    surcharges = COALESCE(EXCLUDED.surcharges, public.quote_sessions.surcharges),
    first_name = COALESCE(EXCLUDED.first_name, public.quote_sessions.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.quote_sessions.last_name),
    email = COALESCE(EXCLUDED.email, public.quote_sessions.email),
    phone = COALESCE(EXCLUDED.phone, public.quote_sessions.phone),
    user_agent = COALESCE(EXCLUDED.user_agent, public.quote_sessions.user_agent),
    referrer = COALESCE(EXCLUDED.referrer, public.quote_sessions.referrer),
    last_activity_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_quote_session(text, jsonb) TO anon, authenticated;

-- Sweep function for abandoned + purge (called by edge function)
CREATE OR REPLACE FUNCTION public.sweep_quote_sessions()
RETURNS TABLE(newly_abandoned_id uuid, email text, first_name text, last_name text, vehicle jsonb, current_step int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Purge old abandoned (>365 days)
  DELETE FROM public.quote_sessions
  WHERE status = 'abandoned'
    AND last_activity_at < now() - interval '365 days';

  -- Mark abandoned and return newly abandoned rows that have an email and weren't yet notified
  RETURN QUERY
  WITH updated AS (
    UPDATE public.quote_sessions
    SET status = 'abandoned'
    WHERE status = 'in_progress'
      AND last_activity_at < now() - interval '30 minutes'
    RETURNING id, email, first_name, last_name, vehicle, current_step, abandoned_notified_at
  )
  SELECT id, email, first_name, last_name, vehicle, current_step
  FROM updated
  WHERE email IS NOT NULL AND email <> '' AND abandoned_notified_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sweep_quote_sessions() TO service_role;

CREATE OR REPLACE FUNCTION public.mark_abandon_notified(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.quote_sessions SET abandoned_notified_at = now() WHERE id = p_id;
$$;
GRANT EXECUTE ON FUNCTION public.mark_abandon_notified(uuid) TO service_role;
