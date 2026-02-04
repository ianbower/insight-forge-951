-- Add sections_json column to custom_tools to store the interactive canvas sections
ALTER TABLE public.custom_tools 
ADD COLUMN IF NOT EXISTS sections_json JSONB DEFAULT NULL;

-- Add a comment to describe the column
COMMENT ON COLUMN public.custom_tools.sections_json IS 'Stores the interactive canvas sections with their shapes, positions, labels, and colors';