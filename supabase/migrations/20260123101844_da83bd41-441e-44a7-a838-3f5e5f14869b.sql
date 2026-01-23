-- Add assignment_status column to project_team_assignments table
ALTER TABLE public.project_team_assignments 
ADD COLUMN assignment_status text NOT NULL DEFAULT 'confirmed' 
CHECK (assignment_status IN ('potential', 'confirmed'));