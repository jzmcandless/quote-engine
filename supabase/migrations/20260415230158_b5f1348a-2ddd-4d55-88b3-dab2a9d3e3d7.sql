
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policy: admins can manage user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Vehicles reference table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  vehicle_class TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, make, model)
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Admins manage vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Eligibility rules
CREATE TABLE public.eligibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT,
  model TEXT,
  min_year INTEGER,
  max_year INTEGER,
  max_mileage INTEGER,
  eligible BOOLEAN NOT NULL DEFAULT true,
  ineligible_message TEXT DEFAULT 'This vehicle is not eligible for coverage.',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eligibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read eligibility" ON public.eligibility_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage eligibility" ON public.eligibility_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Plans
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Coverage pricing matrix
CREATE TABLE public.coverage_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_class TEXT,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  years_covered INTEGER NOT NULL,
  mileage_covered INTEGER NOT NULL,
  deductible INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coverage_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pricing" ON public.coverage_pricing FOR SELECT USING (true);
CREATE POLICY "Admins manage pricing" ON public.coverage_pricing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Additional vehicle detail field definitions
CREATE TABLE public.additional_vehicle_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  required_for_eligibility BOOLEAN NOT NULL DEFAULT false,
  required_for_pricing BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.additional_vehicle_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fields" ON public.additional_vehicle_fields FOR SELECT USING (true);
CREATE POLICY "Admins manage fields" ON public.additional_vehicle_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CSV import jobs
CREATE TABLE public.csv_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  import_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  row_count INTEGER,
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.csv_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage imports" ON public.csv_import_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_eligibility_rules_updated_at BEFORE UPDATE ON public.eligibility_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coverage_pricing_updated_at BEFORE UPDATE ON public.coverage_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('csv-uploads', 'csv-uploads', false);
CREATE POLICY "Admins can upload CSVs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'csv-uploads' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can read CSVs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'csv-uploads' AND public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_vehicles_year_make ON public.vehicles(year, make);
CREATE INDEX idx_coverage_pricing_lookup ON public.coverage_pricing(vehicle_class, plan_id, years_covered, mileage_covered, deductible);
CREATE INDEX idx_eligibility_rules_make_model ON public.eligibility_rules(make, model);
