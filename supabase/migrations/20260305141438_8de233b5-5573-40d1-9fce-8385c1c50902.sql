
CREATE OR REPLACE FUNCTION public.has_elevated_role(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('super_admin', 'admin', 'partner', 'account_lead', 'delivery_lead', 'practice_leader', 'engagement_lead')
  )
$$;
