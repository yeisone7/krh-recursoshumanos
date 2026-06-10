-- Grant super-admin access to maopantoja17@gmail.com when the auth user exists.

INSERT INTO public.super_admins (user_id)
SELECT id
FROM auth.users
WHERE lower(email) = lower('maopantoja17@gmail.com')
ON CONFLICT (user_id) DO NOTHING;
