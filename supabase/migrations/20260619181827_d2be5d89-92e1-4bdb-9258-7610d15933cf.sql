
CREATE OR REPLACE FUNCTION public.upsert_quote_session(p_session_id text, p_patch jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_mileage int;
  v_timeframe text;
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) < 8 THEN
    RAISE EXCEPTION 'invalid session_id';
  END IF;

  -- Server-side eligibility enforcement: override client-supplied is_eligible
  -- if mileage or purchase timeframe violate the hard business rules.
  IF v_additional_details IS NOT NULL THEN
    v_mileage := NULLIF(v_additional_details->>'mileage','')::int;
    v_timeframe := v_additional_details->>'purchase_timeframe';

    IF v_mileage IS NOT NULL AND v_mileage > 36000 THEN
      v_is_eligible := false;
      v_ineligible_message := 'Vehicles with over 36,000 km are not eligible for coverage.';
      v_price := NULL;
    ELSIF v_timeframe = 'More than 36 months' THEN
      v_is_eligible := false;
      v_ineligible_message := 'Vehicles purchased more than 36 months ago are not eligible for coverage.';
      v_price := NULL;
    END IF;
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
$function$;
