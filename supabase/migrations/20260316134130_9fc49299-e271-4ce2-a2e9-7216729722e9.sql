
-- Create maturity_dashboards table
CREATE TABLE public.maturity_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  topic text NOT NULL,
  industry text,
  assessment_instance_id uuid REFERENCES public.assessment_instances(id) ON DELETE SET NULL,
  assessment_template_id uuid REFERENCES public.assessment_templates(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  hero_style text NOT NULL DEFAULT 'navy',
  maturity_bands jsonb DEFAULT '[{"label":"Foundational","min":0,"max":2},{"label":"Scaling","min":2,"max":4},{"label":"Leading","min":4,"max":5}]'::jsonb,
  recommended_moves jsonb DEFAULT '[]'::jsonb,
  snapshot_metrics jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create maturity_dashboard_capabilities table
CREATE TABLE public.maturity_dashboard_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.maturity_dashboards(id) ON DELETE CASCADE,
  name text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  target_score numeric,
  source_type text NOT NULL DEFAULT 'ai_research',
  source_detail text,
  owner text,
  summary text,
  dimension_id uuid REFERENCES public.assessment_dimensions(id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maturity_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maturity_dashboard_capabilities ENABLE ROW LEVEL SECURITY;

-- RLS for maturity_dashboards: owner or project members or global access
CREATE POLICY "Users can view own or accessible dashboards"
  ON public.maturity_dashboards FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR has_global_access(auth.uid())
    OR (project_id IS NOT NULL AND can_access_project(auth.uid(), project_id))
  );

CREATE POLICY "Users can create dashboards"
  ON public.maturity_dashboards FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners and admins can update dashboards"
  ON public.maturity_dashboards FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR has_global_access(auth.uid())
  );

CREATE POLICY "Owners and admins can delete dashboards"
  ON public.maturity_dashboards FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR has_global_access(auth.uid())
  );

-- RLS for capabilities: inherit from parent dashboard
CREATE POLICY "Users can view capabilities for accessible dashboards"
  ON public.maturity_dashboard_capabilities FOR SELECT TO authenticated
  USING (
    dashboard_id IN (
      SELECT id FROM public.maturity_dashboards
      WHERE owner_id = auth.uid()
        OR has_global_access(auth.uid())
        OR (project_id IS NOT NULL AND can_access_project(auth.uid(), project_id))
    )
  );

CREATE POLICY "Users can insert capabilities for own dashboards"
  ON public.maturity_dashboard_capabilities FOR INSERT TO authenticated
  WITH CHECK (
    dashboard_id IN (
      SELECT id FROM public.maturity_dashboards WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update capabilities"
  ON public.maturity_dashboard_capabilities FOR UPDATE TO authenticated
  USING (
    dashboard_id IN (
      SELECT id FROM public.maturity_dashboards
      WHERE owner_id = auth.uid() OR has_global_access(auth.uid())
    )
  );

CREATE POLICY "Owners can delete capabilities"
  ON public.maturity_dashboard_capabilities FOR DELETE TO authenticated
  USING (
    dashboard_id IN (
      SELECT id FROM public.maturity_dashboards
      WHERE owner_id = auth.uid() OR has_global_access(auth.uid())
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_maturity_dashboards_updated_at
  BEFORE UPDATE ON public.maturity_dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
