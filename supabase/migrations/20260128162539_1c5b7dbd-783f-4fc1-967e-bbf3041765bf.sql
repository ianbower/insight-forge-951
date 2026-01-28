-- Create chat_folders table
CREATE TABLE public.chat_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own folders
CREATE POLICY "Users can manage their own folders"
ON public.chat_folders
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add folder_id to chat_sessions
ALTER TABLE public.chat_sessions
ADD COLUMN folder_id UUID REFERENCES public.chat_folders(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_chat_folders_updated_at
BEFORE UPDATE ON public.chat_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();