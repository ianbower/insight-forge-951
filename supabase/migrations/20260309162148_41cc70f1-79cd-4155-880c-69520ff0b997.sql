
-- Add super_admin role to demo user (they already have admin)
INSERT INTO public.user_roles (user_id, role)
VALUES ('ac66fe02-4267-424d-ac2f-c227069215f4', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also add partner role for has_global_access coverage
INSERT INTO public.user_roles (user_id, role)
VALUES ('ac66fe02-4267-424d-ac2f-c227069215f4', 'partner')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update can_manage_project to include super_admin
CREATE OR REPLACE FUNCTION public.can_manage_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    has_role(auth.uid(), 'admin') 
    OR is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM projects WHERE id = _project_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM project_members WHERE project_id = _project_id AND user_id = auth.uid() AND can_manage = true)
$$;
