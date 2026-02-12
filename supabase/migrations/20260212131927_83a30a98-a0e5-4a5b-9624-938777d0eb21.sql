
-- Create LLM configuration table (singleton pattern - one active config)
CREATE TABLE public.llm_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'axet',
  model text,
  endpoint_url text NOT NULL DEFAULT 'https://axet.nttdata.com/flows/cloud/hackthon-be/v1/chat/completions',
  api_key_secret_name text,
  is_active boolean NOT NULL DEFAULT true,
  label text NOT NULL DEFAULT 'Default',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.llm_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage LLM config
CREATE POLICY "Admins can manage LLM config"
ON public.llm_config FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- All authenticated users can read LLM config (edge functions need this)
CREATE POLICY "Authenticated users can read LLM config"
ON public.llm_config FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Seed with existing Axet config as default
INSERT INTO public.llm_config (provider, model, endpoint_url, api_key_secret_name, is_active, label)
VALUES ('axet', NULL, 'https://axet.nttdata.com/flows/cloud/hackthon-be/v1/chat/completions', NULL, true, 'Axet LLM (Default)');

-- Trigger for updated_at
CREATE TRIGGER update_llm_config_updated_at
BEFORE UPDATE ON public.llm_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
