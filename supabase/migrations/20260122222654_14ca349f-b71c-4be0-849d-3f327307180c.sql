-- Phase 1: Role System Foundation

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'practice_leader', 'engagement_lead', 'member');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user has any elevated role
CREATE OR REPLACE FUNCTION public.has_elevated_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'practice_leader', 'engagement_lead')
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-assign 'member' role on profile creation
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- Phase 2: Chat Persistence Tables

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'expert_ai',
  persona TEXT,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on chat tables
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only access their own chat sessions
CREATE POLICY "Users can manage their own chat sessions"
  ON public.chat_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: Users can access messages in their own sessions
CREATE POLICY "Users can manage messages in their own sessions"
  ON public.chat_messages FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Trigger to update chat_sessions updated_at
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 3: Project Ownership & Membership

-- Add ownership columns to projects
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add ownership columns to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create project_members table for flexible assignment
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_in_project TEXT NOT NULL DEFAULT 'member',
  can_manage BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS for project_members
CREATE POLICY "Users can view their project memberships"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND can_manage = true)
  );

CREATE POLICY "Project managers and admins can manage members"
  ON public.project_members FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND can_manage = true)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND can_manage = true)
  );

-- Update project RLS policies for membership-based access
DROP POLICY IF EXISTS "Allow public read access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public insert access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public update access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public delete access to projects" ON public.projects;

CREATE POLICY "Users can view accessible projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Elevated users can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'practice_leader')
    OR public.has_role(auth.uid(), 'engagement_lead')
  );

CREATE POLICY "Project owners and managers can update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid() AND can_manage = true
    )
  );

CREATE POLICY "Admins and owners can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Phase 4: Custom Tools Ownership

-- Add owner_id to custom_tools (keep created_by for backward compatibility)
ALTER TABLE public.custom_tools 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Add visibility column
ALTER TABLE public.custom_tools 
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';

-- Update custom_tools RLS policies
DROP POLICY IF EXISTS "Anyone can read public custom tools" ON public.custom_tools;
DROP POLICY IF EXISTS "Anyone can create custom tools" ON public.custom_tools;
DROP POLICY IF EXISTS "Anyone can update custom tools" ON public.custom_tools;
DROP POLICY IF EXISTS "Anyone can delete custom tools" ON public.custom_tools;

CREATE POLICY "Users can view accessible custom tools"
  ON public.custom_tools FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR visibility = 'public' 
    OR (visibility = 'team' AND auth.uid() IS NOT NULL)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated users can create custom tools"
  ON public.custom_tools FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update their custom tools"
  ON public.custom_tools FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners can delete their custom tools"
  ON public.custom_tools FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Assign existing users the member role if they don't have any role
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'member'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
)
ON CONFLICT (user_id, role) DO NOTHING;