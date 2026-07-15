
-- 1. Add token + computation columns to quote_sessions
ALTER TABLE public.quote_sessions
  ADD COLUMN IF NOT EXISTS write_token_hash bytea,
  ADD COLUMN IF NOT EXISTS token_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS computed_input_hash text;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Lock down old broad RPC and direct table writes from anon
REVOKE EXECUTE ON FUNCTION public.upsert_quote_session(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_quote_session(text, jsonb) TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.quote_sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.quote_sessions FROM authenticated;

-- Tighten custom_quote_requests: server-only inserts (edge function uses service role)
REVOKE INSERT ON public.custom_quote_requests FROM anon, authenticated;
GRANT ALL ON public.custom_quote_requests TO service_role;

-- 3. create_quote_session: server-generated session id + high-entropy write token.
CREATE OR REPLACE FUNCTION public.create_quote_session(
  p_user_agent text DEFAULT NULL,
  p_referrer text DEFAULT NULL
) RETURNS TABLE(session_id text, write_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id text := gen_random_uuid()::text;
  v_token text := encode(gen_random_bytes(32), 'base64');
  v_hash bytea := digest(v_token, 'sha256');
BEGIN
  INSERT INTO public.quote_sessions (
    session_id, status, current_step, write_token_hash, token_created_at,
    user_agent, referrer, last_activity_at
  ) VALUES (
    v_session_id, 'in_progress', 1, v_hash, now(),
    p_user_agent, p_referrer, now()
  );
  session_id := v_session_id;
  write_token := v_token;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_quote_session(text, text) TO anon, authenticated;

-- 4. Internal helper: verify token in constant time
CREATE OR REPLACE FUNCTION public.verify_quote_session_token(
  p_session_id text,
  p_token text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored bytea;
  v_status text;
  v_created timestamptz;
  v_provided bytea := digest(p_token, 'sha256');
  v_ok boolean;
BEGIN
  SELECT write_token_hash, status, token_created_at
    INTO v_stored, v_status, v_created
    FROM public.quote_sessions WHERE session_id = p_session_id;
  IF v_stored IS NULL THEN RETURN false; END IF;
  -- constant-time compare via encoded string equality on fixed-length digests
  v_ok := (encode(v_stored, 'hex') = encode(v_provided, 'hex'));
  IF NOT v_ok THEN RETURN false; END IF;
  IF v_created IS NULL OR v_created < now() - interval '24 hours' THEN RETURN false; END IF;
  IF v_status IN ('completed_purchase','completed_custom_request','completed_ineligible','abandoned') THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_quote_session_token(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_quote_session_token(text, text) TO service_role;

-- 5. patch_quote_session: anon-callable, strict allowlist, requires write token
CREATE OR REPLACE FUNCTION public.patch_quote_session(
  p_session_id text,
  p_write_token text,
  p_patch jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored bytea;
  v_status text;
  v_created timestamptz;
  v_provided bytea := digest(coalesce(p_write_token,''), 'sha256');
  v_current_step int;
  v_vehicle jsonb;
  v_details jsonb;
  v_coverage jsonb;
  v_first text;
  v_last text;
  v_email text;
  v_phone text;
  v_ua text;
  v_ref text;
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) < 8 THEN
    RAISE EXCEPTION 'invalid session_id';
  END IF;

  SELECT write_token_hash, status, token_created_at
    INTO v_stored, v_status, v_created
    FROM public.quote_sessions WHERE session_id = p_session_id;

  IF v_stored IS NULL THEN
    RAISE EXCEPTION 'session not found';
  END IF;
  IF encode(v_stored, 'hex') <> encode(v_provided, 'hex') THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  IF v_created IS NULL OR v_created < now() - interval '24 hours' THEN
    RAISE EXCEPTION 'session expired';
  END IF;
  IF v_status IN ('completed_purchase','completed_custom_request','completed_ineligible','abandoned') THEN
    RAISE EXCEPTION 'session locked';
  END IF;

  -- Whitelist only. Silently ignore any other keys.
  v_current_step := NULLIF(p_patch->>'current_step','')::int;
  v_vehicle := p_patch->'vehicle';
  v_details := p_patch->'additional_details';
  v_coverage := p_patch->'coverage';
  v_first := p_patch->>'first_name';
  v_last := p_patch->>'last_name';
  v_email := p_patch->>'email';
  v_phone := p_patch->>'phone';
  v_ua := p_patch->>'user_agent';
  v_ref := p_patch->>'referrer';

  -- Sanitize coverage: keep only identifier fields, drop any client-provided price/surcharges
  IF v_coverage IS NOT NULL THEN
    v_coverage := jsonb_build_object(
      'planId', v_coverage->>'planId',
      'planName', v_coverage->>'planName',
      'yearsCovered', COALESCE((v_coverage->>'yearsCovered')::numeric, 0),
      'mileageCovered', COALESCE((v_coverage->>'mileageCovered')::numeric, 0),
      'deductible', v_coverage->>'deductible'
    );
  END IF;

  UPDATE public.quote_sessions SET
    current_step = GREATEST(COALESCE(v_current_step, current_step), current_step),
    vehicle = COALESCE(v_vehicle, vehicle),
    additional_details = COALESCE(v_details, additional_details),
    coverage = COALESCE(v_coverage, coverage),
    first_name = COALESCE(v_first, first_name),
    last_name = COALESCE(v_last, last_name),
    email = COALESCE(v_email, email),
    phone = COALESCE(v_phone, phone),
    user_agent = COALESCE(v_ua, user_agent),
    referrer = COALESCE(v_ref, referrer),
    last_activity_at = now()
  WHERE session_id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.patch_quote_session(text, text, jsonb) TO anon, authenticated;

-- 6. apply_quote_computation: server-only, writes authoritative computed fields
CREATE OR REPLACE FUNCTION public.apply_quote_computation(
  p_session_id text,
  p_vehicle_class text,
  p_is_eligible boolean,
  p_ineligible_message text,
  p_price numeric,
  p_surcharges jsonb,
  p_coverage jsonb,
  p_input_hash text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quote_sessions SET
    vehicle_class = p_vehicle_class,
    is_eligible = p_is_eligible,
    ineligible_message = p_ineligible_message,
    price = p_price,
    surcharges = COALESCE(p_surcharges, '[]'::jsonb),
    coverage = COALESCE(p_coverage, coverage),
    computed_at = now(),
    computed_input_hash = p_input_hash,
    last_activity_at = now()
  WHERE session_id = p_session_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_quote_computation(text, text, boolean, text, numeric, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_quote_computation(text, text, boolean, text, numeric, jsonb, jsonb, text) TO service_role;

-- 7. complete_quote_session: server-only, marks a session completed
CREATE OR REPLACE FUNCTION public.complete_quote_session(
  p_session_id text,
  p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('completed_purchase','completed_custom_request','completed_ineligible') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.quote_sessions SET status = p_status, last_activity_at = now()
  WHERE session_id = p_session_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_quote_session(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_quote_session(text, text) TO service_role;
