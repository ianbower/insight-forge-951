-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can upload tool images to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own tool images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own tool images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own tool images" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload tool images to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tool-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own tool images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tool-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own files (for private bucket with signed URLs)
CREATE POLICY "Users can read their own tool images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tool-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own tool images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tool-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);