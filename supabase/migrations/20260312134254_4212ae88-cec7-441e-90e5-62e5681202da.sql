
-- Vault folders for Data Room
CREATE TABLE public.vault_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.vault_folders(id) ON DELETE CASCADE,
  folder_type TEXT NOT NULL DEFAULT 'general',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vault folders" ON public.vault_folders
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create vault folders" ON public.vault_folders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update vault folders" ON public.vault_folders
  FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_global_access(auth.uid()));

CREATE POLICY "Creators can delete vault folders" ON public.vault_folders
  FOR DELETE TO authenticated USING (auth.uid() = created_by OR has_global_access(auth.uid()));

-- Vault documents for Data Room
CREATE TABLE public.vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size BIGINT NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  ai_summary TEXT,
  uploaded_by UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES public.vault_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vault documents" ON public.vault_documents
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vault documents" ON public.vault_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders and admins can update vault documents" ON public.vault_documents
  FOR UPDATE TO authenticated USING (auth.uid() = uploaded_by OR has_global_access(auth.uid()));

CREATE POLICY "Uploaders and admins can delete vault documents" ON public.vault_documents
  FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR has_global_access(auth.uid()));

-- Client portal tokens
CREATE TABLE public.client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elevated users can manage portal tokens" ON public.client_portal_tokens
  FOR ALL TO authenticated USING (has_elevated_role(auth.uid())) WITH CHECK (has_elevated_role(auth.uid()));

CREATE POLICY "Anyone can read active tokens" ON public.client_portal_tokens
  FOR SELECT TO anon USING (is_active = true);

-- Client feedback
CREATE TABLE public.client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  portal_token_id UUID REFERENCES public.client_portal_tokens(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON public.client_feedback
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated can submit feedback" ON public.client_feedback
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Elevated users can view feedback" ON public.client_feedback
  FOR SELECT TO authenticated USING (has_elevated_role(auth.uid()));
