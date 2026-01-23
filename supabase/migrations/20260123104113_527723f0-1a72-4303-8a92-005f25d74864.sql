-- Drop and recreate the INSERT policy to allow authenticated users with elevated roles OR who are setting themselves as owner
DROP POLICY IF EXISTS "Elevated users can create projects" ON public.projects;

-- Create a more permissive insert policy that still checks for elevated roles
CREATE POLICY "Elevated users can create projects" 
ON public.projects 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'practice_leader'::app_role) OR 
  has_role(auth.uid(), 'engagement_lead'::app_role) OR
  (owner_id = auth.uid() AND created_by = auth.uid())
);