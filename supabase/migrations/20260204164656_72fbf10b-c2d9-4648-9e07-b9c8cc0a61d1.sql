-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view accessible custom tools" ON public.custom_tools;

-- Create a new SELECT policy that also checks is_public
CREATE POLICY "Users can view accessible custom tools" 
ON public.custom_tools
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() 
  OR visibility = 'public' 
  OR is_public = true
  OR (visibility = 'team' AND auth.uid() IS NOT NULL)
  OR has_role(auth.uid(), 'admin')
);