-- Fix storage security for tool-images bucket
-- Make bucket private and add proper RLS policies

-- 1. Change bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'tool-images';

-- 2. Drop existing permissive policies
DROP POLICY IF EXISTS "Tool images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload tool images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete tool images" ON storage.objects;

-- 3. Create secure SELECT policy - authenticated users can view images in their folder or if they're admin
CREATE POLICY "Authenticated users can view tool images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tool-images' 
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_elevated_role(auth.uid())
  )
);

-- 4. Create secure INSERT policy - users can only upload to their own folder
CREATE POLICY "Authenticated users can upload tool images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tool-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Create secure UPDATE policy - users can only update their own files
CREATE POLICY "Users can update their own tool images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tool-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Create secure DELETE policy - users can only delete their own files or admins can delete any
CREATE POLICY "Users can delete their own tool images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tool-images'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR public.has_role(auth.uid(), 'admin')
  )
);