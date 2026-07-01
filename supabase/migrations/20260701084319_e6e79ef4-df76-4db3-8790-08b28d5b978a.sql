INSERT INTO public.user_roles (user_id, role) VALUES
  ('ac66fe02-4267-424d-ac2f-c227069215f4', 'super_admin'),
  ('ac66fe02-4267-424d-ac2f-c227069215f4', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;