-- Add layout_json column to runbook_templates for storing step layout templates
ALTER TABLE public.runbook_templates 
ADD COLUMN IF NOT EXISTS step_layouts JSONB DEFAULT '{}'::jsonb;

-- Add layout_json column to project_tasks for project-specific customizations
ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS layout_json JSONB DEFAULT NULL;

-- Comment explaining the structure
COMMENT ON COLUMN public.runbook_templates.step_layouts IS 'JSON object mapping step numbers to their layout configurations';
COMMENT ON COLUMN public.project_tasks.layout_json IS 'Custom layout for this step, overrides runbook template if present';