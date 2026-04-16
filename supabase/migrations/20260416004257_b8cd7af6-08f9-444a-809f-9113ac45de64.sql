
CREATE TABLE public.surcharges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  surcharge_type text NOT NULL,
  mileage_threshold integer,
  amount numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.surcharges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read surcharges" ON public.surcharges FOR SELECT USING (true);

CREATE POLICY "Admins manage surcharges" ON public.surcharges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_surcharges_plan_type ON public.surcharges(plan_id, surcharge_type);
