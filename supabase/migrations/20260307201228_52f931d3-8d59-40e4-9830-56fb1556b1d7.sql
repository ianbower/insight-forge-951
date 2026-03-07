ALTER TABLE public.assessment_responses DROP CONSTRAINT assessment_responses_unique_response;

CREATE UNIQUE INDEX assessment_responses_unique_response 
ON public.assessment_responses (assessment_instance_id, recipient_id, question_id, COALESCE(item_id, '00000000-0000-0000-0000-000000000000'::uuid));