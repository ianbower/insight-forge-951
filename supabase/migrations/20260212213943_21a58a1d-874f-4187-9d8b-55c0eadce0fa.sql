
-- Create project_reports table to persist AI-generated reports
CREATE TABLE public.project_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Report',
  branding_json JSONB DEFAULT '{}'::jsonb,
  sections_json JSONB DEFAULT '[]'::jsonb,
  blocks_json JSONB DEFAULT '[]'::jsonb,
  images_json JSONB DEFAULT '[]'::jsonb,
  editor_mode TEXT NOT NULL DEFAULT 'sections',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies: same pattern as other project-scoped tables
CREATE POLICY "Users can view reports for accessible projects"
ON public.project_reports FOR SELECT
USING (
  (project_id IN (SELECT projects.id FROM projects WHERE projects.owner_id = auth.uid() OR projects.created_by = auth.uid()))
  OR (project_id IN (SELECT project_members.project_id FROM project_members WHERE project_members.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert reports for accessible projects"
ON public.project_reports FOR INSERT
WITH CHECK (
  (project_id IN (SELECT projects.id FROM projects WHERE projects.owner_id = auth.uid() OR projects.created_by = auth.uid()))
  OR (project_id IN (SELECT project_members.project_id FROM project_members WHERE project_members.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update reports for accessible projects"
ON public.project_reports FOR UPDATE
USING (
  (project_id IN (SELECT projects.id FROM projects WHERE projects.owner_id = auth.uid() OR projects.created_by = auth.uid()))
  OR (project_id IN (SELECT project_members.project_id FROM project_members WHERE project_members.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can delete reports for accessible projects"
ON public.project_reports FOR DELETE
USING (
  (project_id IN (SELECT projects.id FROM projects WHERE projects.owner_id = auth.uid() OR projects.created_by = auth.uid()))
  OR (project_id IN (SELECT project_members.project_id FROM project_members WHERE project_members.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_project_reports_updated_at
BEFORE UPDATE ON public.project_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
