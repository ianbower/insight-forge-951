-- Add step_id column to project_deliverables to link deliverables to specific steps
ALTER TABLE public.project_deliverables 
ADD COLUMN step_id uuid REFERENCES public.project_tasks(id) ON DELETE SET NULL;

-- Create index for efficient lookups by step
CREATE INDEX idx_project_deliverables_step_id ON public.project_deliverables(step_id);

-- Comment to document the purpose
COMMENT ON COLUMN public.project_deliverables.step_id IS 'Links a project deliverable to a specific workflow step';