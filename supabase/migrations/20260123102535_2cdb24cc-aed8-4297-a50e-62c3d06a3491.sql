-- Add new columns to projects table for enhanced project setup
ALTER TABLE public.projects 
ADD COLUMN project_type text NOT NULL DEFAULT 'time_materials' 
  CHECK (project_type IN ('time_materials', 'fixed_price', 'internal')),
ADD COLUMN budget_amount numeric NULL,
ADD COLUMN currency text DEFAULT 'USD',
ADD COLUMN sow_file_url text NULL,
ADD COLUMN sow_file_name text NULL,
ADD COLUMN description text NULL;

-- Create storage bucket for SOW documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for project documents
CREATE POLICY "Authenticated users can upload project docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view project docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their project docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

-- Create project_deliverables table for tracking project deliverables
CREATE TABLE public.project_deliverables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NULL,
  due_date date NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'deferred')),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on project_deliverables
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_deliverables
CREATE POLICY "Anyone can view deliverables"
ON public.project_deliverables FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert deliverables"
ON public.project_deliverables FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update deliverables"
ON public.project_deliverables FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete deliverables"
ON public.project_deliverables FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at on project_deliverables
CREATE TRIGGER update_project_deliverables_updated_at
BEFORE UPDATE ON public.project_deliverables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();