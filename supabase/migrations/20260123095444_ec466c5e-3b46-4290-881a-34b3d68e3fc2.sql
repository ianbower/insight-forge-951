-- Create a function to get all projects for team assignment purposes
-- This allows elevated users to see all projects when managing team assignments
CREATE OR REPLACE FUNCTION public.get_projects_for_assignment()
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  start_date date,
  end_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user has elevated role, return all projects
  IF has_elevated_role(auth.uid()) THEN
    RETURN QUERY
    SELECT p.id, p.name, p.status, p.start_date, p.end_date
    FROM projects p
    WHERE p.status IN ('Active', 'Planning', 'On Hold', 'Proposed')
    ORDER BY p.name;
  ELSE
    -- Otherwise, return only projects user has access to
    RETURN QUERY
    SELECT p.id, p.name, p.status, p.start_date, p.end_date
    FROM projects p
    WHERE p.status IN ('Active', 'Planning', 'On Hold', 'Proposed')
      AND (
        p.owner_id = auth.uid()
        OR p.created_by = auth.uid()
        OR p.id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
      )
    ORDER BY p.name;
  END IF;
END;
$$;