-- Crear tabla user_profiles para almacenar información visible del usuario
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para búsquedas por nombre
CREATE INDEX idx_user_profiles_full_name ON public.user_profiles(full_name);

-- Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer perfiles
CREATE POLICY "Users can read all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Política: Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Política: Admins pueden insertar perfiles para nuevos usuarios
CREATE POLICY "Admins can insert profiles"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Política: Usuarios pueden insertar su propio perfil (para onboarding)
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Trigger para actualizar updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();