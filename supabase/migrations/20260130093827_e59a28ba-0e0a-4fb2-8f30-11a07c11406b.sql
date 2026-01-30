-- Fix overly permissive RLS policies on core business tables
-- Restrict SELECT access to authenticated users with proper access control

-- =====================================================
-- 1. FIX clients TABLE - Restrict to authenticated users
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public insert access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public update access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public delete access to clients" ON public.clients;

CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated users can create clients"
ON public.clients FOR INSERT
WITH CHECK (has_elevated_role(auth.uid()));

CREATE POLICY "Elevated users can update clients"
ON public.clients FOR UPDATE
USING (has_elevated_role(auth.uid()));

CREATE POLICY "Elevated users can delete clients"
ON public.clients FOR DELETE
USING (has_elevated_role(auth.uid()));

-- =====================================================
-- 2. FIX team_members TABLE - Restrict sensitive data
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can delete team members" ON public.team_members;

CREATE POLICY "Authenticated users can view team members"
ON public.team_members FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated users can create team members"
ON public.team_members FOR INSERT
WITH CHECK (has_elevated_role(auth.uid()));

CREATE POLICY "Elevated users can update team members"
ON public.team_members FOR UPDATE
USING (has_elevated_role(auth.uid()));

CREATE POLICY "Elevated users can delete team members"
ON public.team_members FOR DELETE
USING (has_elevated_role(auth.uid()));

-- =====================================================
-- 3. FIX project_team_assignments TABLE - Restrict to project access
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view project assignments" ON public.project_team_assignments;
DROP POLICY IF EXISTS "Authenticated users can insert assignments" ON public.project_team_assignments;
DROP POLICY IF EXISTS "Authenticated users can update assignments" ON public.project_team_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete assignments" ON public.project_team_assignments;

CREATE POLICY "Users can view accessible project assignments"
ON public.project_team_assignments FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Project managers can create assignments"
ON public.project_team_assignments FOR INSERT
WITH CHECK (can_manage_project(project_id));

CREATE POLICY "Project managers can update assignments"
ON public.project_team_assignments FOR UPDATE
USING (can_manage_project(project_id));

CREATE POLICY "Project managers can delete assignments"
ON public.project_team_assignments FOR DELETE
USING (can_manage_project(project_id));

-- =====================================================
-- 4. FIX activity_feed TABLE - Restrict to project access
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to activity_feed" ON public.activity_feed;
DROP POLICY IF EXISTS "Allow public insert access to activity_feed" ON public.activity_feed;

CREATE POLICY "Users can view accessible activity"
ON public.activity_feed FOR SELECT
USING (
  project_id IS NULL -- Global activities visible to all authenticated users
  OR project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can create activity"
ON public.activity_feed FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 5. FIX tool_data TABLE - Restrict to project access
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to tool_data" ON public.tool_data;
DROP POLICY IF EXISTS "Allow public insert access to tool_data" ON public.tool_data;
DROP POLICY IF EXISTS "Allow public update access to tool_data" ON public.tool_data;
DROP POLICY IF EXISTS "Allow public delete access to tool_data" ON public.tool_data;

CREATE POLICY "Users can view tool data for accessible projects"
ON public.tool_data FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert tool data for accessible projects"
ON public.tool_data FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update tool data for accessible projects"
ON public.tool_data FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete tool data for accessible projects"
ON public.tool_data FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- =====================================================
-- 6. FIX project_tasks TABLE - Restrict to project access
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Allow public insert access to project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Allow public update access to project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Allow public delete access to project_tasks" ON public.project_tasks;

CREATE POLICY "Users can view tasks for accessible projects"
ON public.project_tasks FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert tasks for accessible projects"
ON public.project_tasks FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update tasks for accessible projects"
ON public.project_tasks FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete tasks for accessible projects"
ON public.project_tasks FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- =====================================================
-- 7. FIX project_deliverables TABLE - Restrict to project access
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "Authenticated users can insert deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "Authenticated users can update deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "Authenticated users can delete deliverables" ON public.project_deliverables;

CREATE POLICY "Users can view deliverables for accessible projects"
ON public.project_deliverables FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert deliverables for accessible projects"
ON public.project_deliverables FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update deliverables for accessible projects"
ON public.project_deliverables FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete deliverables for accessible projects"
ON public.project_deliverables FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- =====================================================
-- 8. FIX project_milestones TABLE - Restrict to project access
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Authenticated users can insert milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Authenticated users can update milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Authenticated users can delete milestones" ON public.project_milestones;

CREATE POLICY "Users can view milestones for accessible projects"
ON public.project_milestones FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert milestones for accessible projects"
ON public.project_milestones FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update milestones for accessible projects"
ON public.project_milestones FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete milestones for accessible projects"
ON public.project_milestones FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- =====================================================
-- 9. FIX project_risks TABLE - Restrict to project access
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view risks" ON public.project_risks;
DROP POLICY IF EXISTS "Authenticated users can insert risks" ON public.project_risks;
DROP POLICY IF EXISTS "Authenticated users can update risks" ON public.project_risks;
DROP POLICY IF EXISTS "Authenticated users can delete risks" ON public.project_risks;

CREATE POLICY "Users can view risks for accessible projects"
ON public.project_risks FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert risks for accessible projects"
ON public.project_risks FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update risks for accessible projects"
ON public.project_risks FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete risks for accessible projects"
ON public.project_risks FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- =====================================================
-- 10. FIX project_issues TABLE - Restrict to project access
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view issues" ON public.project_issues;
DROP POLICY IF EXISTS "Authenticated users can insert issues" ON public.project_issues;
DROP POLICY IF EXISTS "Authenticated users can update issues" ON public.project_issues;
DROP POLICY IF EXISTS "Authenticated users can delete issues" ON public.project_issues;

CREATE POLICY "Users can view issues for accessible projects"
ON public.project_issues FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert issues for accessible projects"
ON public.project_issues FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update issues for accessible projects"
ON public.project_issues FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete issues for accessible projects"
ON public.project_issues FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- =====================================================
-- 11. FIX assessment_* TABLES - Restrict based on project/instance access
-- =====================================================

-- assessment_templates - Authenticated users can view
DROP POLICY IF EXISTS "Allow all access to assessment_templates" ON public.assessment_templates;

CREATE POLICY "Authenticated users can view assessment templates"
ON public.assessment_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated users can create assessment templates"
ON public.assessment_templates FOR INSERT
WITH CHECK (has_elevated_role(auth.uid()));

CREATE POLICY "Elevated users can update assessment templates"
ON public.assessment_templates FOR UPDATE
USING (has_elevated_role(auth.uid()));

CREATE POLICY "Elevated users can delete assessment templates"
ON public.assessment_templates FOR DELETE
USING (has_elevated_role(auth.uid()));

-- assessment_dimensions - Authenticated users can view
DROP POLICY IF EXISTS "Allow all access to assessment_dimensions" ON public.assessment_dimensions;

CREATE POLICY "Authenticated users can view assessment dimensions"
ON public.assessment_dimensions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated users can manage assessment dimensions"
ON public.assessment_dimensions FOR ALL
USING (has_elevated_role(auth.uid()))
WITH CHECK (has_elevated_role(auth.uid()));

-- assessment_questions - Authenticated users can view
DROP POLICY IF EXISTS "Allow all access to assessment_questions" ON public.assessment_questions;

CREATE POLICY "Authenticated users can view assessment questions"
ON public.assessment_questions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated users can manage assessment questions"
ON public.assessment_questions FOR ALL
USING (has_elevated_role(auth.uid()))
WITH CHECK (has_elevated_role(auth.uid()));

-- assessment_instances - Restrict to project access
DROP POLICY IF EXISTS "Allow all access to assessment_instances" ON public.assessment_instances;

CREATE POLICY "Users can view accessible assessment instances"
ON public.assessment_instances FOR SELECT
USING (
  project_id IS NULL -- Non-project instances visible to authenticated
  OR project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Elevated users can manage assessment instances"
ON public.assessment_instances FOR ALL
USING (has_elevated_role(auth.uid()))
WITH CHECK (has_elevated_role(auth.uid()));

-- assessment_recipients - Allow token-based access for external respondents
DROP POLICY IF EXISTS "Allow all access to assessment_recipients" ON public.assessment_recipients;

CREATE POLICY "Users can view recipients for accessible instances"
ON public.assessment_recipients FOR SELECT
USING (
  assessment_instance_id IN (
    SELECT id FROM assessment_instances WHERE
      project_id IS NULL
      OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid())
      OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Elevated users can manage recipients"
ON public.assessment_recipients FOR ALL
USING (has_elevated_role(auth.uid()))
WITH CHECK (has_elevated_role(auth.uid()));

-- assessment_responses - Restrict to accessible instances
DROP POLICY IF EXISTS "Allow all access to assessment_responses" ON public.assessment_responses;

CREATE POLICY "Users can view responses for accessible instances"
ON public.assessment_responses FOR SELECT
USING (
  assessment_instance_id IN (
    SELECT id FROM assessment_instances WHERE
      project_id IS NULL
      OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid())
      OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

-- Allow anonymous responses for assessments (token-based access handled in application)
CREATE POLICY "Anyone can submit assessment responses"
ON public.assessment_responses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own responses"
ON public.assessment_responses FOR UPDATE
USING (
  assessment_instance_id IN (
    SELECT id FROM assessment_instances WHERE
      project_id IS NULL
      OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid())
      OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

-- assessment_benchmarks - Authenticated users can view
DROP POLICY IF EXISTS "Allow all access to assessment_benchmarks" ON public.assessment_benchmarks;

CREATE POLICY "Authenticated users can view benchmarks"
ON public.assessment_benchmarks FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated users can manage benchmarks"
ON public.assessment_benchmarks FOR ALL
USING (has_elevated_role(auth.uid()))
WITH CHECK (has_elevated_role(auth.uid()));

-- project_assessments - Restrict to project access
DROP POLICY IF EXISTS "Allow all access to project_assessments" ON public.project_assessments;

CREATE POLICY "Users can view project assessments for accessible projects"
ON public.project_assessments FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can manage project assessments for accessible projects"
ON public.project_assessments FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid() OR created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- =====================================================
-- 12. FIX suggested_team_structures TABLE - Restrict to authenticated
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view team structures" ON public.suggested_team_structures;
DROP POLICY IF EXISTS "Authenticated users can manage structures" ON public.suggested_team_structures;

CREATE POLICY "Authenticated users can view team structures"
ON public.suggested_team_structures FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated users can manage team structures"
ON public.suggested_team_structures FOR ALL
USING (has_elevated_role(auth.uid()))
WITH CHECK (has_elevated_role(auth.uid()));