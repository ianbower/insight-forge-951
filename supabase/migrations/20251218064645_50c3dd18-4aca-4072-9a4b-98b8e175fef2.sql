-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create runbook_templates table
CREATE TABLE public.runbook_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry_focus TEXT,
  workflow_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consulting_tools table
CREATE TABLE public.consulting_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  configuration_schema JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Proposed' CHECK (status IN ('Active', 'Proposed', 'Complete')),
  runbook_id UUID REFERENCES public.runbook_templates(id),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_tasks table
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete')),
  assignee_id UUID,
  tool_link TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tool_data table
CREATE TABLE public.tool_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  tool_id UUID REFERENCES public.consulting_tools(id) ON DELETE CASCADE NOT NULL,
  content_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_feed table for team activity
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulting_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Create public read policies (for demo purposes - can be tightened later with auth)
CREATE POLICY "Allow public read access to clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to clients" ON public.clients FOR DELETE USING (true);

CREATE POLICY "Allow public read access to runbook_templates" ON public.runbook_templates FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to runbook_templates" ON public.runbook_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to runbook_templates" ON public.runbook_templates FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to consulting_tools" ON public.consulting_tools FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to consulting_tools" ON public.consulting_tools FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to projects" ON public.projects FOR DELETE USING (true);

CREATE POLICY "Allow public read access to project_tasks" ON public.project_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to project_tasks" ON public.project_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to project_tasks" ON public.project_tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to project_tasks" ON public.project_tasks FOR DELETE USING (true);

CREATE POLICY "Allow public read access to tool_data" ON public.tool_data FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to tool_data" ON public.tool_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to tool_data" ON public.tool_data FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to tool_data" ON public.tool_data FOR DELETE USING (true);

CREATE POLICY "Allow public read access to activity_feed" ON public.activity_feed FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to activity_feed" ON public.activity_feed FOR INSERT WITH CHECK (true);

-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_runbook_templates_updated_at BEFORE UPDATE ON public.runbook_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tool_data_updated_at BEFORE UPDATE ON public.tool_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();