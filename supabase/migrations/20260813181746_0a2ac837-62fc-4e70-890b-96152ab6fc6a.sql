CREATE OR REPLACE FUNCTION public.patch_quote_session(p_session_id text, p_write_token text, p_patch jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stored bytea;
  v_status text;
  v_created timestamptz;
  v_provided bytea;
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
  v_year int;
  v_key text;
  v_val jsonb;
  v_allowed_top text[] := ARRAY[
    'current_step','vehicle','additional_details','coverage',
    'first_name','last_name','email','phone','user_agent','referrer'
  ];
  v_allowed_vehicle text[] := ARRAY['year','make','model','drivetrain','fuelType'];
  v_allowed_details text[] := ARRAY['mileage','purchase_timeframe','commercial_use','has_snowplow'];
  v_allowed_coverage text[] := ARRAY['planId','planName','yearsCovered','mileageCovered','deductible'];
  v_allowed_deductibles text[] := ARRAY['$0','$50','$200','Disappearing'];
  v_allowed_timeframe text[] := ARRAY['Less than 12 months','Less than 12 months ago','Between 12 and 36 months','More than 36 months'];
BEGIN
  IF p_session_id IS NULL OR p_session_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  IF p_write_token IS NULL OR length(p_write_token) < 20 OR length(p_write_token) > 100
     OR p_write_token !~ '^[A-Za-z0-9+/=]+$' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  IF octet_length(p_patch::text) > 8192 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  v_provided := extensions.digest(p_write_token, 'sha256');

  SELECT write_token_hash, status, token_created_at
    INTO v_stored, v_status, v_created
    FROM public.quote_sessions WHERE session_id = p_session_id;

  IF v_stored IS NULL THEN RAISE EXCEPTION 'invalid_session'; END IF;
  IF encode(v_stored, 'hex') <> encode(v_provided, 'hex') THEN RAISE EXCEPTION 'invalid_session'; END IF;
  IF v_created IS NULL OR v_created < now() - interval '24 hours' THEN RAISE EXCEPTION 'invalid_session'; END IF;
  IF v_status IN ('completed_purchase','completed_custom_request','completed_ineligible','abandoned') THEN
    RAISE EXCEPTION 'invalid_session';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF NOT (v_key = ANY(v_allowed_top)) THEN
      RAISE EXCEPTION 'invalid_input';
    END IF;
  END LOOP;

  IF p_patch ? 'current_step' THEN
    IF jsonb_typeof(p_patch->'current_step') <> 'number' THEN RAISE EXCEPTION 'invalid_input'; END IF;
    v_current_step := (p_patch->>'current_step')::int;
    IF v_current_step < 1 OR v_current_step > 7 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  END IF;

  IF p_patch ? 'vehicle' THEN
    v_vehicle := p_patch->'vehicle';
    IF jsonb_typeof(v_vehicle) <> 'object' THEN RAISE EXCEPTION 'invalid_input'; END IF;
    FOR v_key IN SELECT jsonb_object_keys(v_vehicle) LOOP
      IF NOT (v_key = ANY(v_allowed_vehicle)) THEN RAISE EXCEPTION 'invalid_input'; END IF;
    END LOOP;
    IF v_vehicle ? 'year' AND jsonb_typeof(v_vehicle->'year') NOT IN ('number','null') THEN
      RAISE EXCEPTION 'invalid_input';
    END IF;
    IF jsonb_typeof(v_vehicle->'year') = 'number' THEN
      v_year := (v_vehicle->>'year')::int;
      IF v_year < 1980 OR v_year > 2100 THEN RAISE EXCEPTION 'invalid_input'; END IF;
    END IF;
    IF length(coalesce(v_vehicle->>'make','')) > 80
       OR length(coalesce(v_vehicle->>'model','')) > 120
       OR length(coalesce(v_vehicle->>'drivetrain','')) > 40
       OR length(coalesce(v_vehicle->>'fuelType','')) > 40 THEN
      RAISE EXCEPTION 'invalid_input';
    END IF;
    -- Drop empty/null keys so a blank client state cannot erase saved answers
    SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb) INTO v_vehicle
      FROM jsonb_each(v_vehicle) e
     WHERE jsonb_typeof(e.value) <> 'null'
       AND (jsonb_typeof(e.value) <> 'string' OR (e.value #>> '{}') <> '');
    IF v_vehicle = '{}'::jsonb THEN v_vehicle := NULL; END IF;
  END IF;

  IF p_patch ? 'additional_details' THEN
    v_details := p_patch->'additional_details';
    IF jsonb_typeof(v_details) <> 'object' THEN RAISE EXCEPTION 'invalid_input'; END IF;
    IF (SELECT count(*) FROM jsonb_object_keys(v_details)) > 20 THEN RAISE EXCEPTION 'invalid_input'; END IF;
    FOR v_key IN SELECT jsonb_object_keys(v_details) LOOP
      IF v_key !~ '^[a-z0-9_]{1,64}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
      IF NOT (v_key = ANY(v_allowed_details)) THEN RAISE EXCEPTION 'invalid_input'; END IF;
      v_val := v_details->v_key;
      IF jsonb_typeof(v_val) = 'string' AND length(v_val #>> '{}') > 200 THEN
        RAISE EXCEPTION 'invalid_input';
      END IF;
      IF v_key = 'purchase_timeframe' AND NOT ((v_val #>> '{}') = ANY(v_allowed_timeframe)) THEN
        RAISE EXCEPTION 'invalid_input';
      END IF;
      IF v_key IN ('commercial_use','has_snowplow') AND (v_val #>> '{}') NOT IN ('Yes','No') THEN
        RAISE EXCEPTION 'invalid_input';
      END IF;
      IF v_key = 'mileage' THEN
        IF jsonb_typeof(v_val) NOT IN ('number','string') THEN RAISE EXCEPTION 'invalid_input'; END IF;
        IF (v_val #>> '{}') !~ '^\d{1,7}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
      END IF;
    END LOOP;

    -- Normalize legacy timeframe wording
    IF (v_details->>'purchase_timeframe') = 'Less than 12 months ago' THEN
      v_details := jsonb_set(v_details, '{purchase_timeframe}', '"Less than 12 months"'::jsonb);
    END IF;

    SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb) INTO v_details
      FROM jsonb_each(v_details) e
     WHERE jsonb_typeof(e.value) <> 'null'
       AND (jsonb_typeof(e.value) <> 'string' OR (e.value #>> '{}') <> '');
    IF v_details = '{}'::jsonb THEN v_details := NULL; END IF;
  END IF;

  IF p_patch ? 'coverage' THEN
    v_coverage := p_patch->'coverage';
    IF jsonb_typeof(v_coverage) <> 'object' THEN RAISE EXCEPTION 'invalid_input'; END IF;
    FOR v_key IN SELECT jsonb_object_keys(v_coverage) LOOP
      IF NOT (v_key = ANY(v_allowed_coverage)) THEN RAISE EXCEPTION 'invalid_input'; END IF;
    END LOOP;
    IF (v_coverage ? 'planId') AND (v_coverage->>'planId') <> ''
       AND (v_coverage->>'planId') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RAISE EXCEPTION 'invalid_input';
    END IF;
    IF length(coalesce(v_coverage->>'planName','')) > 120 THEN RAISE EXCEPTION 'invalid_input'; END IF;
    IF (v_coverage ? 'yearsCovered') AND jsonb_typeof(v_coverage->'yearsCovered') = 'number' THEN
      IF (v_coverage->>'yearsCovered')::numeric < 0 OR (v_coverage->>'yearsCovered')::numeric > 15 THEN
        RAISE EXCEPTION 'invalid_input';
      END IF;
    END IF;
    IF (v_coverage ? 'mileageCovered') AND jsonb_typeof(v_coverage->'mileageCovered') = 'number' THEN
      IF (v_coverage->>'mileageCovered')::numeric < 0 OR (v_coverage->>'mileageCovered')::numeric > 500000 THEN
        RAISE EXCEPTION 'invalid_input';
      END IF;
    END IF;
    IF (v_coverage ? 'deductible') AND (v_coverage->>'deductible') <> ''
       AND NOT ((v_coverage->>'deductible') = ANY(v_allowed_deductibles)) THEN
      RAISE EXCEPTION 'invalid_input';
    END IF;
    v_coverage := jsonb_build_object(
      'planId', v_coverage->>'planId',
      'planName', v_coverage->>'planName',
      'yearsCovered', COALESCE((v_coverage->>'yearsCovered')::numeric, 0),
      'mileageCovered', COALESCE((v_coverage->>'mileageCovered')::numeric, 0),
      'deductible', v_coverage->>'deductible'
    );
    -- Drop empty strings, nulls and zeroed numbers so blank state cannot erase
    SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb) INTO v_coverage
      FROM jsonb_each(v_coverage) e
     WHERE jsonb_typeof(e.value) <> 'null'
       AND (jsonb_typeof(e.value) <> 'string' OR (e.value #>> '{}') <> '')
       AND (jsonb_typeof(e.value) <> 'number' OR (e.value #>> '{}')::numeric <> 0);
    IF v_coverage = '{}'::jsonb THEN v_coverage := NULL; END IF;
  END IF;

  v_first := NULLIF(p_patch->>'first_name', '');
  v_last := NULLIF(p_patch->>'last_name', '');
  v_email := NULLIF(p_patch->>'email', '');
  v_phone := NULLIF(p_patch->>'phone', '');
  v_ua := p_patch->>'user_agent';
  v_ref := p_patch->>'referrer';

  IF v_first IS NOT NULL AND length(v_first) > 100 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF v_last  IS NOT NULL AND length(v_last)  > 100 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF v_email IS NOT NULL THEN
    IF length(v_email) > 255 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'invalid_input';
    END IF;
  END IF;
  IF v_phone IS NOT NULL THEN
    IF length(v_phone) > 20 OR v_phone !~ '^[+0-9][0-9\s\-().]{5,19}$' THEN
      RAISE EXCEPTION 'invalid_input';
    END IF;
  END IF;
  IF v_ua IS NOT NULL THEN v_ua := left(v_ua, 500); END IF;
  IF v_ref IS NOT NULL THEN v_ref := left(v_ref, 500); END IF;

  UPDATE public.quote_sessions SET
    current_step = GREATEST(COALESCE(v_current_step, current_step), current_step),
    vehicle = CASE WHEN v_vehicle IS NULL THEN vehicle
                   ELSE COALESCE(vehicle, '{}'::jsonb) || v_vehicle END,
    additional_details = CASE WHEN v_details IS NULL THEN additional_details
                              ELSE COALESCE(additional_details, '{}'::jsonb) || v_details END,
    coverage = CASE WHEN v_coverage IS NULL THEN coverage
                    ELSE COALESCE(coverage, '{}'::jsonb) || v_coverage END,
    first_name = COALESCE(v_first, first_name),
    last_name = COALESCE(v_last, last_name),
    email = COALESCE(v_email, email),
    phone = COALESCE(v_phone, phone),
    user_agent = COALESCE(v_ua, user_agent),
    referrer = COALESCE(v_ref, referrer),
    last_activity_at = now()
  WHERE session_id = p_session_id;
END;
$function$;