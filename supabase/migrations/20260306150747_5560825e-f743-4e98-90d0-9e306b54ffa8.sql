
-- Add assessment_type to assessment_templates
ALTER TABLE public.assessment_templates 
ADD COLUMN IF NOT EXISTS assessment_type text NOT NULL DEFAULT 'standard';

-- Create assessment_items table for use cases / vendors / processes
CREATE TABLE public.assessment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_template_id uuid NOT NULL REFERENCES public.assessment_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  metadata_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add item_id to assessment_responses (nullable, for item-based assessments)
ALTER TABLE public.assessment_responses 
ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.assessment_items(id) ON DELETE CASCADE;

-- Enable RLS on assessment_items
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for assessment_items
CREATE POLICY "Anon can view assessment items"
  ON public.assessment_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can view assessment items"
  ON public.assessment_items FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated users can manage assessment items"
  ON public.assessment_items FOR ALL
  TO authenticated
  USING (has_elevated_role(auth.uid()))
  WITH CHECK (has_elevated_role(auth.uid()));

-- Drop the existing unique constraint on assessment_responses if it exists, then recreate with item_id
-- The existing upsert uses onConflict: "assessment_instance_id,recipient_id,question_id"
-- We need to update this to include item_id for item-based assessments
-- First check if the constraint exists and drop it
DO $$
BEGIN
  -- Drop existing unique index/constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'assessment_responses_instance_recipient_question_idx'
  ) THEN
    DROP INDEX public.assessment_responses_instance_recipient_question_idx;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create a unique index that includes item_id (using COALESCE for null item_id)
CREATE UNIQUE INDEX IF NOT EXISTS assessment_responses_instance_recipient_question_item_idx
  ON public.assessment_responses (assessment_instance_id, recipient_id, question_id, COALESCE(item_id, '00000000-0000-0000-0000-000000000000'));
