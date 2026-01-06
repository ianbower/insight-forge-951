-- Create storage bucket for tool canvas images
INSERT INTO storage.buckets (id, name, public) VALUES ('tool-images', 'tool-images', true);

-- Allow public read access to tool images
CREATE POLICY "Tool images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'tool-images');

-- Allow anyone to upload tool images (will add auth later)
CREATE POLICY "Anyone can upload tool images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tool-images');

-- Allow anyone to delete their tool images
CREATE POLICY "Anyone can delete tool images"
ON storage.objects FOR DELETE
USING (bucket_id = 'tool-images');

-- Create custom_tools table
CREATE TABLE public.custom_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Custom',
  canvas_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_tools ENABLE ROW LEVEL SECURITY;

-- Public tools are readable by everyone
CREATE POLICY "Anyone can read public custom tools"
ON public.custom_tools FOR SELECT
USING (is_public = true OR created_by IS NULL);

-- Anyone can create custom tools
CREATE POLICY "Anyone can create custom tools"
ON public.custom_tools FOR INSERT
WITH CHECK (true);

-- Anyone can update custom tools (will refine with auth later)
CREATE POLICY "Anyone can update custom tools"
ON public.custom_tools FOR UPDATE
USING (true);

-- Anyone can delete custom tools (will refine with auth later)
CREATE POLICY "Anyone can delete custom tools"
ON public.custom_tools FOR DELETE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_custom_tools_updated_at
BEFORE UPDATE ON public.custom_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();