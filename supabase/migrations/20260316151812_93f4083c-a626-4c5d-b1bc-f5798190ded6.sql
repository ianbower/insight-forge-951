
CREATE TABLE public.maturity_dashboard_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.maturity_dashboards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region TEXT,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  tier TEXT,
  description TEXT,
  dimension_scores JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  tech_stack JSONB DEFAULT '[]',
  key_use_cases TEXT[] DEFAULT '{}',
  investment_level TEXT,
  ai_leader TEXT,
  sources JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maturity_dashboard_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entities for accessible dashboards"
  ON public.maturity_dashboard_entities FOR SELECT TO authenticated
  USING (dashboard_id IN (
    SELECT id FROM maturity_dashboards
    WHERE owner_id = auth.uid() OR has_global_access(auth.uid())
      OR (project_id IS NOT NULL AND can_access_project(auth.uid(), project_id))
  ));

CREATE POLICY "Users can insert entities for own dashboards"
  ON public.maturity_dashboard_entities FOR INSERT TO authenticated
  WITH CHECK (dashboard_id IN (
    SELECT id FROM maturity_dashboards WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owners can update entities"
  ON public.maturity_dashboard_entities FOR UPDATE TO authenticated
  USING (dashboard_id IN (
    SELECT id FROM maturity_dashboards
    WHERE owner_id = auth.uid() OR has_global_access(auth.uid())
  ));

CREATE POLICY "Owners can delete entities"
  ON public.maturity_dashboard_entities FOR DELETE TO authenticated
  USING (dashboard_id IN (
    SELECT id FROM maturity_dashboards
    WHERE owner_id = auth.uid() OR has_global_access(auth.uid())
  ));
