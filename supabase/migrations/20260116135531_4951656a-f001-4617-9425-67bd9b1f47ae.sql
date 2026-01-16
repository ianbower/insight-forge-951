-- Assessment templates table
CREATE TABLE public.assessment_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Maturity',
  industry TEXT,
  framework_type TEXT, -- e.g., 'CMMI', 'COBIT', 'Custom'
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessment dimensions/categories within an assessment
CREATE TABLE public.assessment_dimensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_template_id UUID NOT NULL REFERENCES public.assessment_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) DEFAULT 1.0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessment questions
CREATE TABLE public.assessment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_template_id UUID NOT NULL REFERENCES public.assessment_templates(id) ON DELETE CASCADE,
  dimension_id UUID REFERENCES public.assessment_dimensions(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'likert', -- 'likert', 'multiple_choice', 'text', 'numeric'
  weight NUMERIC(5,2) DEFAULT 1.0,
  order_index INTEGER NOT NULL DEFAULT 0,
  scale_config JSONB, -- For likert: { min: 1, max: 5, labels: { 1: "Initial", 2: "Developing"... }, descriptions: {...} }
  options JSONB, -- For multiple choice
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessment instances (when an assessment is sent out)
CREATE TABLE public.assessment_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_template_id UUID NOT NULL REFERENCES public.assessment_templates(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'closed', 'archived'
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  allow_anonymous BOOLEAN NOT NULL DEFAULT false,
  settings JSONB, -- Additional settings like reminders, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessment recipients
CREATE TABLE public.assessment_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_instance_id UUID NOT NULL REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT, -- Role/department for segmentation
  industry TEXT, -- For industry filtering in benchmarks
  organization TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid(), -- Unique token for anonymous access
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'started', 'completed'
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE
);

-- Assessment responses
CREATE TABLE public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_instance_id UUID NOT NULL REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.assessment_recipients(id) ON DELETE SET NULL,
  question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  response_value JSONB NOT NULL, -- Flexible: number for likert, string for text, array for multi-select
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Benchmark data for comparisons
CREATE TABLE public.assessment_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_template_id UUID REFERENCES public.assessment_templates(id) ON DELETE SET NULL,
  dimension_id UUID REFERENCES public.assessment_dimensions(id) ON DELETE SET NULL,
  benchmark_type TEXT NOT NULL, -- 'industry_standard', 'ai_research', 'internal_historical', 'peer'
  industry TEXT,
  framework TEXT, -- e.g., 'CMMI', 'COBIT'
  source TEXT, -- Where the benchmark came from
  score_percentile_25 NUMERIC(5,2),
  score_percentile_50 NUMERIC(5,2), -- Median
  score_percentile_75 NUMERIC(5,2),
  score_average NUMERIC(5,2),
  sample_size INTEGER,
  data_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project assessment assignments (like tool_data for tools)
CREATE TABLE public.project_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assessment_instance_id UUID NOT NULL REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  notes_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assessments ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (adjust based on auth requirements)
CREATE POLICY "Allow all access to assessment_templates" ON public.assessment_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to assessment_dimensions" ON public.assessment_dimensions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to assessment_questions" ON public.assessment_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to assessment_instances" ON public.assessment_instances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to assessment_recipients" ON public.assessment_recipients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to assessment_responses" ON public.assessment_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to assessment_benchmarks" ON public.assessment_benchmarks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to project_assessments" ON public.project_assessments FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_assessment_dimensions_template ON public.assessment_dimensions(assessment_template_id);
CREATE INDEX idx_assessment_questions_template ON public.assessment_questions(assessment_template_id);
CREATE INDEX idx_assessment_questions_dimension ON public.assessment_questions(dimension_id);
CREATE INDEX idx_assessment_instances_template ON public.assessment_instances(assessment_template_id);
CREATE INDEX idx_assessment_instances_project ON public.assessment_instances(project_id);
CREATE INDEX idx_assessment_recipients_instance ON public.assessment_recipients(assessment_instance_id);
CREATE INDEX idx_assessment_recipients_token ON public.assessment_recipients(token);
CREATE INDEX idx_assessment_responses_instance ON public.assessment_responses(assessment_instance_id);
CREATE INDEX idx_assessment_responses_question ON public.assessment_responses(question_id);
CREATE INDEX idx_assessment_benchmarks_template ON public.assessment_benchmarks(assessment_template_id);
CREATE INDEX idx_assessment_benchmarks_industry ON public.assessment_benchmarks(industry);
CREATE INDEX idx_project_assessments_project ON public.project_assessments(project_id);