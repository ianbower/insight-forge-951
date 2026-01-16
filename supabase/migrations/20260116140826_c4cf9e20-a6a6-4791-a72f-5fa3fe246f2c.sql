-- Add unique constraint for upsert on assessment responses
ALTER TABLE public.assessment_responses
ADD CONSTRAINT assessment_responses_unique_response 
UNIQUE (assessment_instance_id, recipient_id, question_id);