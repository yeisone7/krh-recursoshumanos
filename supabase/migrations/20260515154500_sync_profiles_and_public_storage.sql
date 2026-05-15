-- Sincronización de perfiles de usuario con metadata de Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, display_name)
  VALUES (
    new.id,
    COALESCE(
      (new.raw_user_meta_data->>'full_name')::text, 
      ( (new.raw_user_meta_data->>'first_name')::text || ' ' || (new.raw_user_meta_data->>'last_name')::text ), 
      ''
    ),
    COALESCE(
      (new.raw_user_meta_data->>'first_name')::text, 
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    display_name = EXCLUDED.display_name,
    updated_at = now();
  
  RETURN new;
END;
$$;

-- Triggers para perfiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas de Storage para Registro de Empleados
-- Permitir subida pública al bucket de avatars (necesario para links de registro sin login)
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Anyone can update avatars"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
