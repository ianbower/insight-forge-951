-- Create exchange rates table
CREATE TABLE public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  rates JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read exchange rates
CREATE POLICY "Anyone can read exchange rates"
ON public.exchange_rates
FOR SELECT
USING (true);

-- Only system can insert/update (via edge function with service role)
-- No INSERT/UPDATE policies for regular users

-- Create index on fetched_at for efficient queries
CREATE INDEX idx_exchange_rates_fetched_at ON public.exchange_rates(fetched_at DESC);