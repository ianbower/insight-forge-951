-- Team Members Table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  level TEXT NOT NULL DEFAULT 'Consultant',
  role TEXT NOT NULL DEFAULT 'Analyst',
  skills JSONB DEFAULT '[]'::jsonb,
  hourly_rate NUMERIC,
  availability_percentage INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Team Assignments Table
CREATE TABLE public.project_team_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  role_in_project TEXT NOT NULL DEFAULT 'Team Member',
  allocation_percentage INTEGER NOT NULL DEFAULT 100,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, team_member_id)
);

-- Project Milestones Table
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Risks Table
CREATE TABLE public.project_risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Operational',
  likelihood TEXT NOT NULL DEFAULT 'Medium',
  impact TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  mitigation_plan TEXT,
  owner_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Issues Table
CREATE TABLE public.project_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  resolution TEXT,
  owner_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  raised_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_resolution_date DATE,
  resolved_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Suggested Team Structures (Reference Data)
CREATE TABLE public.suggested_team_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_type TEXT NOT NULL,
  structure_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_duration_weeks INTEGER,
  max_duration_weeks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_team_structures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members (public read, authenticated write)
CREATE POLICY "Anyone can view team members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert team members" ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update team members" ON public.team_members FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete team members" ON public.team_members FOR DELETE USING (true);

-- RLS Policies for project_team_assignments
CREATE POLICY "Anyone can view project assignments" ON public.project_team_assignments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert assignments" ON public.project_team_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update assignments" ON public.project_team_assignments FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete assignments" ON public.project_team_assignments FOR DELETE USING (true);

-- RLS Policies for project_milestones
CREATE POLICY "Anyone can view milestones" ON public.project_milestones FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert milestones" ON public.project_milestones FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update milestones" ON public.project_milestones FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete milestones" ON public.project_milestones FOR DELETE USING (true);

-- RLS Policies for project_risks
CREATE POLICY "Anyone can view risks" ON public.project_risks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert risks" ON public.project_risks FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update risks" ON public.project_risks FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete risks" ON public.project_risks FOR DELETE USING (true);

-- RLS Policies for project_issues
CREATE POLICY "Anyone can view issues" ON public.project_issues FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert issues" ON public.project_issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update issues" ON public.project_issues FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete issues" ON public.project_issues FOR DELETE USING (true);

-- RLS Policies for suggested_team_structures
CREATE POLICY "Anyone can view team structures" ON public.suggested_team_structures FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage structures" ON public.suggested_team_structures FOR ALL USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_project_team_assignments_project ON public.project_team_assignments(project_id);
CREATE INDEX idx_project_team_assignments_member ON public.project_team_assignments(team_member_id);
CREATE INDEX idx_project_milestones_project ON public.project_milestones(project_id);
CREATE INDEX idx_project_risks_project ON public.project_risks(project_id);
CREATE INDEX idx_project_issues_project ON public.project_issues(project_id);

-- Add update timestamp triggers
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_risks_updated_at
  BEFORE UPDATE ON public.project_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_issues_updated_at
  BEFORE UPDATE ON public.project_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample suggested team structures
INSERT INTO public.suggested_team_structures (project_type, structure_json, min_duration_weeks, max_duration_weeks) VALUES
('Strategy', '[{"level": "Partner", "count": 1, "role": "Engagement Lead", "skills": ["Strategy", "Client Management"]}, {"level": "Director", "count": 1, "role": "Project Director", "skills": ["Strategy", "Team Leadership"]}, {"level": "Manager", "count": 2, "role": "Workstream Lead", "skills": ["Analysis", "Presentation"]}, {"level": "Consultant", "count": 3, "role": "Team Member", "skills": ["Research", "Analysis"]}, {"level": "Analyst", "count": 2, "role": "Support", "skills": ["Data Analysis", "Research"]}]', 8, 16),
('Operations', '[{"level": "Partner", "count": 1, "role": "Engagement Lead", "skills": ["Operations", "Process Improvement"]}, {"level": "Director", "count": 1, "role": "Project Director", "skills": ["Operations", "Change Management"]}, {"level": "Manager", "count": 2, "role": "Workstream Lead", "skills": ["Process Design", "Implementation"]}, {"level": "Consultant", "count": 4, "role": "Team Member", "skills": ["Process Mapping", "Analysis"]}, {"level": "Analyst", "count": 3, "role": "Support", "skills": ["Data Analysis", "Documentation"]}]', 12, 24),
('Digital Transformation', '[{"level": "Partner", "count": 1, "role": "Engagement Lead", "skills": ["Digital Strategy", "Technology"]}, {"level": "Director", "count": 2, "role": "Project Director", "skills": ["Technology", "Change Management"]}, {"level": "Manager", "count": 3, "role": "Workstream Lead", "skills": ["Agile", "Product Management"]}, {"level": "Consultant", "count": 5, "role": "Team Member", "skills": ["Technical", "UX Design"]}, {"level": "Analyst", "count": 4, "role": "Support", "skills": ["Development", "Testing"]}]', 16, 52);