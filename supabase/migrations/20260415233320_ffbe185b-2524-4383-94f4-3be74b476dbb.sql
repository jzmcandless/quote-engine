
-- Change deductible from integer to text to support "Disappearing" option
ALTER TABLE public.coverage_pricing ALTER COLUMN deductible TYPE text USING deductible::text;

-- Add deductible_cost to store the surcharge/discount for each deductible option
ALTER TABLE public.coverage_pricing ADD COLUMN deductible_cost numeric DEFAULT 0;
