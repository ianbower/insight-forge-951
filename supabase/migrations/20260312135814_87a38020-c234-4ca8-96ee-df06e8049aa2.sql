
-- Allow anon to read clients that have active portal tokens
CREATE POLICY "Portal token holders can view client"
  ON public.clients FOR SELECT
  TO anon
  USING (
    id IN (SELECT client_id FROM public.client_portal_tokens WHERE is_active = true)
  );

-- Allow anon to read projects for clients with active portal tokens
CREATE POLICY "Portal token holders can view projects"
  ON public.projects FOR SELECT
  TO anon
  USING (
    client_id IN (SELECT client_id FROM public.client_portal_tokens WHERE is_active = true)
  );

-- Allow anon to read milestones for portal-visible projects
CREATE POLICY "Portal token holders can view milestones"
  ON public.project_milestones FOR SELECT
  TO anon
  USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE client_id IN (SELECT client_id FROM public.client_portal_tokens WHERE is_active = true)
    )
  );

-- Allow anon to read deliverables for portal-visible projects
CREATE POLICY "Portal token holders can view deliverables"
  ON public.project_deliverables FOR SELECT
  TO anon
  USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE client_id IN (SELECT client_id FROM public.client_portal_tokens WHERE is_active = true)
    )
  );

-- Allow anon to read assessment instances for portal-visible projects
CREATE POLICY "Portal token holders can view assessments"
  ON public.assessment_instances FOR SELECT
  TO anon
  USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE client_id IN (SELECT client_id FROM public.client_portal_tokens WHERE is_active = true)
    )
  );
