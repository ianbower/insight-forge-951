-- Drop the existing check constraint and recreate it with "completed" as a valid status
ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_status_check;

-- Add new check constraint that includes "completed"
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed'));