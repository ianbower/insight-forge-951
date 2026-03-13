
-- Allow portal token holders (anon) to view team assignments and members for portal projects
CREATE POLICY "Portal token holders can view team assignments"
  ON public.project_team_assignments FOR SELECT
  TO anon
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.client_id IN (
        SELECT client_id FROM client_portal_tokens WHERE is_active = true
      )
    )
  );

CREATE POLICY "Portal token holders can view team members"
  ON public.team_members FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT team_member_id FROM project_team_assignments
      WHERE project_id IN (
        SELECT p.id FROM projects p
        WHERE p.client_id IN (
          SELECT client_id FROM client_portal_tokens WHERE is_active = true
        )
      )
    )
  );

-- Allow portal token holders to view risks for portal projects
CREATE POLICY "Portal token holders can view project risks"
  ON public.project_risks FOR SELECT
  TO anon
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.client_id IN (
        SELECT client_id FROM client_portal_tokens WHERE is_active = true
      )
    )
  );

-- Allow portal token holders to view issues for portal projects
CREATE POLICY "Portal token holders can view project issues"
  ON public.project_issues FOR SELECT
  TO anon
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.client_id IN (
        SELECT client_id FROM client_portal_tokens WHERE is_active = true
      )
    )
  );
