-- Drop the existing status constraint and add updated one with more status options
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['Active'::text, 'Proposed'::text, 'Planning'::text, 'On Hold'::text, 'Complete'::text, 'Cancelled'::text]));