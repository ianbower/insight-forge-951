-- Allow authenticated users to look up other users' profiles by email for project invitations
-- This is safe because it only exposes basic profile info needed for collaboration

-- Drop the restrictive select policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows viewing all profiles for authenticated users
-- This is needed for project member invitations and collaboration features
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep the restrictive update policy - users can only update their own
-- (This already exists, just documenting)

-- Add a foreign key relationship hint for the project_members query
-- Note: We use user_id from profiles to match with project_members.user_id
COMMENT ON TABLE public.profiles IS 'User profile information. user_id references auth.users.id';