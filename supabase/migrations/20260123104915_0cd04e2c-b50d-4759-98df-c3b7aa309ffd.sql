-- Add milestone_id column to project_deliverables for linking deliverables to milestones
ALTER TABLE public.project_deliverables 
ADD COLUMN milestone_id uuid REFERENCES public.project_milestones(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX idx_project_deliverables_milestone_id ON public.project_deliverables(milestone_id);