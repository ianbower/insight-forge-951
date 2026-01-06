-- Add new columns for enhanced step details
ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS notes_json jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS deliverables jsonb DEFAULT '[]'::jsonb;

-- Add step_id column to tool_data for step-scoped tool data
ALTER TABLE public.tool_data 
ADD COLUMN IF NOT EXISTS step_id uuid REFERENCES public.project_tasks(id) ON DELETE SET NULL;