ALTER TABLE public.quote_sessions
  ADD COLUMN IF NOT EXISTS base_price numeric,
  ADD COLUMN IF NOT EXISTS deductible_cost numeric;

CREATE OR REPLACE FUNCTION public.apply_quote_computation(p_session_id text, p_vehicle_class text, p_is_eligible boolean, p_ineligible_message text, p_price numeric, p_surcharges jsonb, p_coverage jsonb, p_input_hash text, p_base_price numeric DEFAULT NULL, p_deductible_cost numeric DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.quote_sessions SET
    vehicle_class = p_vehicle_class,
    is_eligible = p_is_eligible,
    ineligible_message = p_ineligible_message,
    price = p_price,
    base_price = p_base_price,
    deductible_cost = p_deductible_cost,
    surcharges = COALESCE(p_surcharges, '[]'::jsonb),
    coverage = COALESCE(p_coverage, coverage),
    computed_at = now(),
    computed_input_hash = p_input_hash,
    last_activity_at = now()
  WHERE session_id = p_session_id;
END;
$function$;