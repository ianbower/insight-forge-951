-- Add preferred_currency column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'USD';

-- Add a comment to document supported currencies
COMMENT ON COLUMN public.profiles.preferred_currency IS 'User preferred currency: USD, EUR, GBP, AUD, CAD, CHF, JPY, etc.';