
ALTER TABLE public.client_portal_tokens 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.client_portal_tokens.settings IS 'Portal customisation: logos, visible sections, branding';
