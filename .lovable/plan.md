

# Plan: Descargos por Token de Un Solo Uso

## Resumen
Agregar la opcion (opcional) de generar un enlace/token de un solo uso para que el empleado implicado en un proceso disciplinario pueda presentar sus descargos directamente a traves de una pagina publica. El descargo quedara registrado indicando que fue presentado via token.

## Cambios en Base de Datos

### Nueva tabla: `disciplinary_defense_tokens`
- `id` (UUID, PK)
- `process_id` (UUID, FK a disciplinary_processes)
- `company_id` (UUID)
- `token` (TEXT, UNIQUE) -- token UUID generado
- `employee_id` (UUID, FK a employees_v2)
- `expires_at` (TIMESTAMPTZ)
- `is_used` (BOOLEAN, default false)
- `used_at` (TIMESTAMPTZ, nullable)
- `created_by` (UUID) -- quien genero el token
- `created_at` (TIMESTAMPTZ, default now())

Se agregara una politica RLS para lectura publica (SELECT) filtrada por token, y para INSERT/UPDATE restringido a miembros de la empresa.

### Columna nueva en `disciplinary_defenses`
- `submitted_via_token` (BOOLEAN, default false) -- indica si el descargo fue enviado por el empleado a traves de un enlace

## Cambios en Frontend

### 1. Boton "Generar Enlace de Descargos" en el tab de Descargos
En `DisciplinaryDetailDialog.tsx`, junto al boton "Registrar Descargos", agregar un boton secundario "Enviar Enlace" que:
- Genera un token en la tabla `disciplinary_defense_tokens`
- Muestra un dialog con el enlace y codigo QR (reutilizando el patron de `QRCodeDialog`)
- El enlace apunta a `/descargos?token=XXX`

### 2. Nuevo componente: `GenerateDefenseTokenDialog.tsx`
Dialog que genera el token, muestra el enlace copiable y un QR. Similar al flujo de `GenerarAcceso` de capacitaciones.

### 3. Nueva pagina publica: `src/pages/DescargosPublico.tsx`
Pagina accesible sin autenticacion en la ruta `/descargos?token=XXX`. Flujo:
1. Valida el token (existe, no usado, no expirado)
2. Muestra informacion del caso (numero de radicado, fecha de los hechos, descripcion de los hechos)
3. Formulario para que el empleado escriba sus descargos
4. Al enviar: inserta en `disciplinary_defenses` con `submitted_via_token = true`, marca el token como usado, y registra en `disciplinary_timeline`

### 4. Indicador visual en descargos existentes
En la lista de descargos del detail dialog, mostrar un `Badge` "Via Enlace" cuando `submitted_via_token` sea true, para diferenciarlos de los registrados manualmente.

### 5. Hook: `useDefenseTokens` 
- `useGenerateDefenseToken(processId)` -- crea el token
- Logica de validacion y envio en la pagina publica (sin auth, consulta directa a Supabase con RLS publica)

### 6. Ruta en App.tsx
Agregar `<Route path="/descargos" element={<DescargosPublico />} />` como ruta publica (al mismo nivel que `/capacitacion`).

## Detalles Tecnicos

- El token expira en 72 horas por defecto
- RLS: SELECT publico filtrado por token; INSERT en defenses permitido via una funcion de base de datos segura (security definer) que valide el token antes de insertar
- Se creara una funcion `submit_defense_via_token` que recibe el token y el contenido, valida, inserta el descargo, marca el token como usado, y crea la entrada en timeline
- La pagina publica sigue el mismo patron visual de `AccesoPublico.tsx` (branding corporativo)

## Archivos a crear/modificar

| Archivo | Accion |
|---|---|
| Migracion SQL | Crear tabla + columna + funcion RPC + RLS |
| `src/pages/DescargosPublico.tsx` | Crear (pagina publica) |
| `src/components/disciplinary/GenerateDefenseTokenDialog.tsx` | Crear |
| `src/hooks/useDisciplinaryProcesses.ts` | Agregar hook para generar token |
| `src/components/disciplinary/DisciplinaryDetailDialog.tsx` | Agregar boton + badge |
| `src/types/disciplinary.ts` | Agregar tipo DisciplinaryDefenseToken + campo submitted_via_token |
| `src/App.tsx` | Agregar ruta `/descargos` |

