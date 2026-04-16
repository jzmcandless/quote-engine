
CREATE TABLE public.custom_quote_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  vin TEXT,
  vehicle_year INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a custom quote request"
ON public.custom_quote_requests
FOR INSERT
WITH CHECK (true);
