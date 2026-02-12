
# Unificar Horas Extra y Novedades Manuales

## Resumen

Reemplazar la vista "Horas Extra" (`/horas-extra`) y la pestana "Novedades Manuales" de Pre-Liquidacion con una unica vista principal llamada **"Novedades"** (`/novedades`) en el grupo Nomina del sidebar. La nueva vista adoptara la interfaz visual de Horas Extra (KPI cards, filtros, tabla con estados) pero operara sobre la tabla `payroll_novelties`.

---

## Cambios principales

### 1. Nueva pagina: Novedades (`src/pages/Novedades.tsx`)

Adoptara el layout de `HorasExtra.tsx`:
- **Header** con titulo "Novedades de Nomina" y botones "Exportar" + "Nueva Novedad"
- **4 KPI Cards**: Total registros, Total horas, Por tipo (distribucion), Novedades del periodo
- **Card de referencia**: Badges con los tipos de novedad disponibles (HEDO 25%, HENO 75%, etc.) tomados de la configuracion laboral
- **Filtros**: Buscador por empleado, selector de tipo de novedad, selector de periodo (fecha inicio/fin)
- **Tabla de resultados**: Empleado, Fecha, Tipo (badge), Horas, Notas, Fuente (manual/auto), Acciones (editar/eliminar)
- Reutilizara `NoveltyFormDialog` para crear/editar

### 2. Eliminar vista Horas Extra

- Eliminar `src/pages/HorasExtra.tsx`
- Remover la ruta `/horas-extra` de `App.tsx`
- Remover "Horas Extra" de `timeManagementNavItems` en `Sidebar.tsx`

### 3. Actualizar Pre-Liquidacion

- Eliminar la pestana "Novedades Manuales" y el sistema de Tabs
- La pagina mostrara directamente el contenido de Pre-Liquidacion sin tabs
- Remover imports y estado relacionado con novedades (noveltyOpen, editingNovelty, handleDeleteNovelty)

### 4. Actualizar Sidebar

- Agregar "Novedades" en `payrollNavItems` (grupo Nomina) con icono `Clock`
- Remover "Horas Extra" de `timeManagementNavItems` (grupo Tiempo)

### 5. Actualizar App.tsx

- Reemplazar import/ruta de `HorasExtra` por `Novedades` (`/novedades`)
- Remover ruta `/horas-extra`

---

## Detalles tecnicos

### Archivos nuevos
| Archivo | Proposito |
|---|---|
| `src/pages/Novedades.tsx` | Vista principal CRUD de novedades con UI estilo HorasExtra |

### Archivos modificados
| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Reemplazar ruta `/horas-extra` por `/novedades`, nuevo import |
| `src/components/layout/Sidebar.tsx` | Mover de timeManagement a payrollNavItems como "Novedades" |
| `src/pages/PreLiquidacion.tsx` | Eliminar Tabs y pestana de novedades, dejar solo contenido de pre-liquidacion |

### Archivos eliminados
| Archivo | Razon |
|---|---|
| `src/pages/HorasExtra.tsx` | Funcionalidad absorbida por Novedades |

### Datos y hooks reutilizados
- `usePayrollNovelties` (ya existente) para listar/filtrar novedades
- `useCreatePayrollNovelty`, `useUpdatePayrollNovelty`, `useDeletePayrollNovelty`
- `NoveltyFormDialog` (ya existente) para crear/editar
- `usePayrollConfig` para mostrar los porcentajes de recargo configurados

### Nota sobre overtime_records
La tabla `overtime_records` y el hook `useOvertime` seguiran existiendo ya que la pre-liquidacion los consulta directamente para el calculo. Sin embargo, la vista de gestion manual ahora sera unificada a traves de `payroll_novelties`.
