

# Plan: Sistema de Roles y Permisos Dinámico

## Estado Actual

El sistema usa un enum `app_role` fijo con 5 valores (`admin`, `rrhh`, `psicologo`, `jefe_area`, `auditor`) y una tabla `user_roles` simple. Los permisos están hardcodeados en el frontend con checks como `isAdmin`, `isRRHH`. No existe parametrización de permisos granulares.

---

## Arquitectura Propuesta

```text
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   roles      │───▶│  role_permissions │◀───│   permissions    │
│  (catálogo)  │    │   (asignación)   │    │  (catálogo CRUD) │
└──────┬───────┘    └──────────────────┘    └──────────────────┘
       │                                          │
       ▼                                          │
┌──────────────┐                           ┌──────┴─────────┐
│ user_roles_v2│                           │    modules     │
│ (user↔role)  │                           │  (catálogo)    │
└──────────────┘                           └────────────────┘
```

---

## Fase 1 — Modelo de Datos (Migración SQL)

**Nuevas tablas:**

1. **`modules`** — Catálogo de módulos/submódulos del sistema
   - `id`, `code` (único), `name`, `parent_id` (self-ref para submódulos), `icon`, `sort_order`, `is_active`

2. **`permissions`** — Permisos parametrizados (módulo + acción)
   - `id`, `module_id` (FK → modules), `action` (enum: `view`, `create`, `update`, `delete`), `description`
   - Unique constraint en `(module_id, action)`

3. **`roles`** — Catálogo dinámico de roles (reemplaza el enum)
   - `id`, `company_id`, `name` (único por empresa), `description`, `is_active`, `is_system` (para el rol Administrador no eliminable), `created_by`, `created_at`, `updated_at`

4. **`role_permissions`** — Tabla pivote roles ↔ permisos
   - `id`, `role_id` (FK → roles), `permission_id` (FK → permissions)
   - Unique constraint en `(role_id, permission_id)`

5. **`user_roles_v2`** — Asignación usuario ↔ rol dinámico
   - `id`, `user_id` (FK → auth.users), `role_id` (FK → roles), `assigned_by`, `assigned_at`
   - Unique constraint en `(user_id, role_id)`

**Datos semilla:**
- Insertar todos los módulos del sistema (~25 módulos según el sidebar actual): Dashboard, Empleados, Contratos, Incapacidades, Dotación, Exámenes, Selección, Requisiciones, Centros, Jornadas, Disciplinarios, Vacaciones, Permisos, Novedades, Pre-liquidación, Capacitaciones, Evaluaciones, Organigrama, Cesantías, Calendario, Reportes, Analítica, Catálogos, Seguridad, Configuración.
- Generar permisos automáticos (4 acciones × N módulos).
- Crear el rol "Administrador" como `is_system = true` con todos los permisos.

**RLS:** Policies usando `has_role` function adaptada + company_id filtering.

**Función DB:** `check_user_permission(user_id, module_code, action)` — SECURITY DEFINER que verifica si el usuario tiene el permiso dado a través de alguno de sus roles activos.

---

## Fase 2 — Backend: Función de Verificación

Crear función SQL `check_user_permission(_user_id uuid, _module_code text, _action text)`:
- Busca en `user_roles_v2` → `roles` (activos) → `role_permissions` → `permissions` → `modules`
- Si el rol tiene `is_system = true`, retorna `true` siempre (Administrador)
- Si el rol está inactivo, ignora sus permisos

---

## Fase 3 — Hook y Context de Permisos

1. **`usePermissions` hook** — Al login, carga todos los permisos efectivos del usuario (unión de todos sus roles activos) y los cachea en el AuthContext.
   - Expone: `hasPermission(moduleCode, action)`, `canView(module)`, `canCreate(module)`, `canUpdate(module)`, `canDelete(module)`
   - Se refresca al cambiar roles

2. **Actualizar `AuthContext`** — Agregar `permissions` al contexto, reemplazar gradualmente `isAdmin`/`isRRHH` con `hasPermission()`

---

## Fase 4 — UI: Módulo de Roles (pestaña en Seguridad)

Reemplazar la pestaña "Roles" estática actual en `Seguridad.tsx` con:

1. **Lista de Roles** — Tabla/cards con nombre, descripción, estado, # usuarios, fecha creación. Botones: Crear, Editar, Eliminar (con validación de asignaciones), Activar/Desactivar. El rol "Administrador" solo permite editar descripción.

2. **Dialog Crear/Editar Rol** — Formulario con nombre, descripción.

3. **Vista de Permisos (Matriz)** — Al hacer clic en "Configurar Permisos" de un rol:
   - Tabla con módulos como filas (expandibles si tienen submódulos) y columnas: Ver, Crear, Modificar, Eliminar.
   - Checkboxes en cada celda.
   - Checkbox "Todos" por fila (módulo completo).
   - Deshabilitado para el rol Administrador (todos marcados).
   - Collapsible sections por categoría de módulos.

---

## Fase 5 — UI: Control de Acceso en Frontend

1. **Componente `<PermissionGate>`** — Wrapper que muestra/oculta children según permisos:
   ```tsx
   <PermissionGate module="empleados" action="create">
     <Button>Nuevo Empleado</Button>
   </PermissionGate>
   ```

2. **Sidebar dinámico** — Filtrar items del menú según `canView(module)`.

3. **Bloqueo de login sin rol** — Si el usuario no tiene roles en `user_roles_v2`, mostrar pantalla de "Cuenta pendiente de activación" en vez de la app.

---

## Fase 6 — Auditoría

Registrar en la tabla `audit_logs` existente:
- Creación/edición/eliminación de roles
- Cambios en permisos de un rol
- Asignación/remoción de roles a usuarios

---

## Archivos Principales a Crear/Modificar

| Archivo | Acción |
|---------|--------|
| Migración SQL (tables + seed + functions) | Crear |
| `src/hooks/useRoles.ts` | Crear |
| `src/hooks/usePermissions.ts` | Crear |
| `src/components/roles/RolesManager.tsx` | Crear |
| `src/components/roles/RoleFormDialog.tsx` | Crear |
| `src/components/roles/PermissionMatrix.tsx` | Crear |
| `src/components/auth/PermissionGate.tsx` | Crear |
| `src/contexts/AuthContext.tsx` | Modificar (agregar permisos) |
| `src/pages/Seguridad.tsx` | Modificar (nueva pestaña Roles) |
| `src/components/layout/Sidebar.tsx` | Modificar (filtrar por permisos) |

---

## Consideraciones

- La migración del enum `app_role` existente se hará de forma gradual: el nuevo sistema coexistirá inicialmente. Una vez estable, se puede deprecar el enum antiguo.
- Los permisos se cargan una vez al login y se refrescan solo al cambiar roles, optimizando rendimiento.
- El rol Administrador con `is_system = true` garantiza acceso total sin depender de permisos individuales.

