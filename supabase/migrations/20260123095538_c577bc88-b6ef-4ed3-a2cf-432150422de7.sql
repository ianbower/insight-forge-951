-- Drop the problematic RLS policies on project_members
DROP POLICY IF EXISTS "Project managers and admins can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view their project memberships" ON public.project_members;

-- Create a security definer function to check if user can manage a project
CREATE OR REPLACE FUNCTION public.can_manage_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'admin') 
    OR EXISTS (SELECT 1 FROM projects WHERE id = _project_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM project_members WHERE project_id = _project_id AND user_id = auth.uid() AND can_manage = true)
$$;

-- Create a security definer function to check if user is member of a project (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id = _project_id AND user_id = auth.uid())
$$;

-- Recreate policies using the security definer functions
CREATE POLICY "Users can view their project memberships"
  ON public.project_members
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR can_manage_project(project_id)
  );

CREATE POLICY "Managers can insert project members"
  ON public.project_members
  FOR INSERT
  WITH CHECK (can_manage_project(project_id));

CREATE POLICY "Managers can update project members"
  ON public.project_members
  FOR UPDATE
  USING (can_manage_project(project_id));

CREATE POLICY "Managers can delete project members"
  ON public.project_members
  FOR DELETE
  USING (can_manage_project(project_id));