
# Plan: Mostrar nombre de usuario en lugar del ID en Seguridad y Roles

## Resumen

Actualmente la tabla de usuarios muestra solo el UUID truncado porque no existe una tabla que almacene el nombre del usuario. Se necesita crear una estructura que permita guardar y mostrar el nombre completo y email de cada usuario.

## Arquitectura de la Solución

```text
+------------------+     +-------------------+     +---------------+
|   auth.users     |---->|  user_profiles    |---->|  UsersTable   |
|   (interno)      |     |  (nueva tabla)    |     |  (UI)         |
+------------------+     +-------------------+     +---------------+
        |                        |
        |                        v
        |               +-------------------+
        +-------------->| employee_user_links|
                        | (vinculo opcional)|
                        +-------------------+
                                |
                                v
                        +-------------------+
                        |   employees_v2    |
                        | (nombre completo) |
                        +-------------------+
```

## Cambios Propuestos

### 1. Base de datos - Nueva tabla `user_profiles`

Se creara una tabla publica para almacenar la informacion basica del usuario:

- `id`: UUID, clave primaria, referencia a `auth.users(id)`
- `full_name`: Nombre completo del usuario
- `display_name`: Nombre corto para mostrar
- `avatar_url`: URL del avatar (redundante con metadata pero util)
- `created_at`, `updated_at`: Timestamps

**Politicas RLS:**
- Los usuarios pueden leer todos los perfiles (necesario para mostrar nombres en la tabla de admin)
- Los usuarios solo pueden actualizar su propio perfil
- Admins pueden insertar perfiles para nuevos usuarios

**Trigger automatico:**
- Al crear un usuario via invitacion, se creara automaticamente un registro en `user_profiles`

### 2. Hook `useAdminUsers.ts`

Modificar la consulta para:
1. Obtener datos de `user_profiles` (nombre, email)
2. Como fallback, obtener datos de `employee_user_links` si el usuario esta vinculado a un empleado
3. Mostrar el UUID solo si no hay ninguna informacion disponible

**Interface actualizada:**
```typescript
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;       // NUEVO
  display_name: string;    // NUEVO  
  avatar_url?: string;     // NUEVO
  // ... resto de campos
}
```

### 3. Componente `UsersTable.tsx`

Actualizar la columna "Usuario" para mostrar:
- Avatar del usuario (si existe)
- Nombre completo o display_name
- Email debajo del nombre
- Badge "(Tu)" si es el usuario actual

**Antes:**
```
[41] 41f81714...
     (Tu)
```

**Despues:**
```
[Avatar] Yeison Escobar
         yeisone7@gmail.com (Tu)
```

### 4. Edge Function `invite-user`

Modificar para crear el perfil del usuario automaticamente al aceptar la invitacion, extrayendo el nombre del email o usando valores por defecto.

## Detalles Tecnicos

### Migracion SQL

```sql
-- Crear tabla user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_user_profiles_full_name ON public.user_profiles(full_name);

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Politicas
CREATE POLICY "Users can read all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert profiles"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Trigger para updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Logica de obtencion de nombre

La prioridad para mostrar el nombre sera:
1. `user_profiles.full_name` si existe
2. Nombre del empleado vinculado (first_name + last_name) via `employee_user_links`
3. Parte del email antes del @ como fallback
4. UUID truncado como ultimo recurso

### Archivos a modificar

1. **Nueva migracion SQL** - Crear tabla `user_profiles`
2. **`src/hooks/useAdminUsers.ts`** - Agregar consulta a `user_profiles` y logica de fallback
3. **`src/components/admin/UsersTable.tsx`** - Mostrar nombre, email y avatar
4. **`supabase/functions/invite-user/index.ts`** - Crear perfil al invitar usuario (opcional)

## Beneficios

- Los administradores podran identificar usuarios por nombre en lugar de UUID
- Mejor experiencia de usuario en la gestion de roles
- Base para futuras funcionalidades de perfil de usuario
- Compatible con el sistema existente de vinculos empleado-usuario
