
-- Allow anonymous users to look up their recipient record by token
CREATE POLICY "Anyone can look up recipient by token"
  ON public.assessment_recipients FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update their own recipient status (started, completed)
CREATE POLICY "Anyone can update recipient status by token"
  ON public.assessment_recipients FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to view the assessment instance linked to their recipient
CREATE POLICY "Anon can view assessment instances"
  ON public.assessment_instances FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view assessment dimensions
CREATE POLICY "Anon can view assessment dimensions"
  ON public.assessment_dimensions FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view assessment questions
CREATE POLICY "Anon can view assessment questions"
  ON public.assessment_questions FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view assessment templates (needed for template name)
CREATE POLICY "Anon can view assessment templates"
  ON public.assessment_templates FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to insert responses
CREATE POLICY "Anon can submit responses"
  ON public.assessment_responses FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to view their own responses (for resuming)
CREATE POLICY "Anon can view responses"
  ON public.assessment_responses FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update their responses
CREATE POLICY "Anon can update responses"
  ON public.assessment_responses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
