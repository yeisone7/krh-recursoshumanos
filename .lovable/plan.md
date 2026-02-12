

# Modulo de Pre-Liquidacion de Nomina

## Resumen

Crear un modulo completo de **Pre-Liquidacion de Nomina** que, dado un rango de fechas (periodo), cruce la informacion de turnos asignados, horarios administrativos, festivos, incapacidades, vacaciones y permisos para generar automaticamente un reporte con los 10 conceptos solicitados por empleado, ademas de una configuracion de parametros laborales por empresa.

---

## Parte 1: Configuracion de Parametros Laborales (CRUD)

Se creara una tabla `payroll_labor_config` con los parametros configurables por empresa:

| Parametro | Descripcion | Valor por defecto (Colombia) |
|---|---|---|
| Jornada laboral maxima semanal | Horas maximas semanales permitidas | 47 (Ley 2101/2021, baja a 46 en 2025, 44 en 2026, 42 en 2027) |
| Jornada laboral diaria ordinaria | Horas de una jornada estandar | 8 |
| Unidad de visualizacion | Horas o Dias | Horas |
| Inicio jornada nocturna | Hora desde la cual aplica recargo nocturno | 21:00 |
| Fin jornada nocturna | Hora hasta la cual aplica recargo nocturno | 06:00 |
| Recargo Extra Diurna Ordinaria (HEDO) | Porcentaje | 25% |
| Recargo Extra Nocturna Ordinaria (HENO) | Porcentaje | 75% |
| Recargo Nocturno (RN) | Porcentaje | 35% |
| Recargo Extra Diurna Dominical/Festiva (HEDF) | Porcentaje | 100% |
| Recargo Extra Nocturna Dominical/Festiva (HENF) | Porcentaje | 150% |
| Recargo Nocturno Festivo (RNF) | Porcentaje | 110% |
| Recargo Dominical/Festivo trabajado | Porcentaje | 75% |

Esta configuracion sera accesible desde una nueva pestana en la pagina de Jornadas o desde Configuracion.

---

## Parte 2: Tabla de Novedades de Nomina

Se creara una tabla `payroll_novelties` para registrar novedades manuales que no provienen automaticamente del sistema:

| Campo | Tipo | Descripcion |
|---|---|---|
| id | UUID | PK |
| company_id | UUID | FK empresas |
| employee_id | UUID | FK empleado |
| novelty_date | date | Fecha de la novedad |
| novelty_type | enum | jornada, hedo, heno, hedf, henf, rn, rnf, dominical_trabajado, festivo_trabajado, descanso_remunerado |
| hours | numeric | Horas o fraccion |
| notes | text | Observaciones |
| source | text | 'manual' o 'auto' |
| created_by / created_at | - | Auditoria |

Esto permite hacer CRUD de novedades puntuales que el sistema no pueda inferir automaticamente.

---

## Parte 3: Logica de Pre-Liquidacion (Motor de Calculo)

Para un periodo dado (ej: 1-15 Feb o 1-28 Feb), el motor recorrera dia a dia cada empleado y determinara:

1. **Jornada Laboral**: Dias/horas efectivamente trabajados segun turno asignado o horario administrativo.
2. **Dominical Trabajado**: Si el empleado tiene turno asignado un domingo (no festivo) y no es dia de descanso.
3. **Festivo Trabajado**: Si el empleado tiene turno asignado en un dia que esta en la tabla `company_holidays`.
4. **Descanso Remunerado**: Dias de descanso dentro del ciclo (turnos con `is_rest_day = true`) + domingos para administrativos.
5. **HEDO / HENO / HEDF / HENF / RN / RNF**: Se cruzan con los registros aprobados de `overtime_records` y/o novedades manuales de `payroll_novelties`.

**Validacion critica**: La suma de Jornada + Descanso Remunerado + Incapacidades + Vacaciones + Permisos no debe superar los dias del periodo. El sistema alertara si hay inconsistencias.

**Conceptos adicionales recomendados** (para robustez):
- **Incapacidades**: Dias de incapacidad en el periodo (cruce con `employee_incapacities`).
- **Vacaciones**: Dias de vacaciones en el periodo (cruce con `vacation_requests` aprobadas).
- **Permisos**: Dias de permiso en el periodo (cruce con `leave_requests` aprobadas).
- **Ausentismo sin justificar**: Dias sin turno, sin novedad y sin ausencia registrada.

---

## Parte 4: Interfaz de Usuario

### 4a. Nueva pagina: Pre-Liquidacion (`/pre-liquidacion`)

- **Selector de periodo**: Fecha inicio y fecha fin (quincenas o mensual).
- **Boton "Calcular"**: Ejecuta el motor de calculo en el frontend.
- **Tabla de resultados** con columnas:

| Empleado | Jornada | Dom. Trab. | Fest. Trab. | Desc. Rem. | HEDO | HENO | HEDF | HENF | RN | RNF | Incap. | Vac. | Perm. | Total Dias |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **Filtros**: Por centro de operacion, area, modalidad (admin/turnos).
- **Exportar a Excel**: Genera archivo .xlsx con el detalle.
- **Indicador de validacion**: Alerta visual si algun empleado supera la jornada maxima legal.

### 4b. Pestana de Configuracion Laboral (en Jornadas)

- Formulario para editar los parametros de la tabla `payroll_labor_config`.
- Valores por defecto segun legislacion colombiana precargados.

### 4c. CRUD de Novedades

- Pestana o seccion dentro de Pre-Liquidacion para agregar/editar/eliminar novedades manuales por empleado y fecha.

---

## Parte 5: Navegacion

- Agregar ruta `/pre-liquidacion` en `App.tsx`.
- Agregar enlace en el menu lateral (Sidebar) bajo la seccion de Nomina o despues de "Horas Extra".

---

## Detalles Tecnicos

### Base de datos (2 migraciones)

**Migracion 1 - `payroll_labor_config`:**
```sql
CREATE TABLE payroll_labor_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  max_weekly_hours NUMERIC NOT NULL DEFAULT 46,
  daily_hours NUMERIC NOT NULL DEFAULT 8,
  display_unit TEXT NOT NULL DEFAULT 'hours', -- 'hours' | 'days'
  night_start TIME NOT NULL DEFAULT '21:00',
  night_end TIME NOT NULL DEFAULT '06:00',
  surcharge_hedo INTEGER NOT NULL DEFAULT 25,
  surcharge_heno INTEGER NOT NULL DEFAULT 75,
  surcharge_rn INTEGER NOT NULL DEFAULT 35,
  surcharge_hedf INTEGER NOT NULL DEFAULT 100,
  surcharge_henf INTEGER NOT NULL DEFAULT 150,
  surcharge_rnf INTEGER NOT NULL DEFAULT 110,
  surcharge_dominical INTEGER NOT NULL DEFAULT 75,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id)
);
-- RLS policies
```

**Migracion 2 - `payroll_novelties`:**
```sql
CREATE TABLE payroll_novelties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID NOT NULL REFERENCES employees_v2(id),
  novelty_date DATE NOT NULL,
  novelty_type TEXT NOT NULL, -- enum via check
  hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS policies + indexes
```

### Archivos nuevos

| Archivo | Proposito |
|---|---|
| `src/pages/PreLiquidacion.tsx` | Pagina principal del modulo |
| `src/hooks/usePayrollConfig.ts` | Hook CRUD para `payroll_labor_config` |
| `src/hooks/usePayrollNovelties.ts` | Hook CRUD para `payroll_novelties` |
| `src/hooks/usePreLiquidation.ts` | Motor de calculo de pre-liquidacion |
| `src/types/payroll.ts` | Tipos TypeScript del modulo |
| `src/components/payroll/PayrollConfigDialog.tsx` | Formulario de configuracion laboral |
| `src/components/payroll/NoveltyFormDialog.tsx` | Formulario CRUD de novedades |
| `src/components/payroll/PreLiquidationTable.tsx` | Tabla de resultados |
| `src/components/payroll/PreLiquidationExport.tsx` | Exportacion a Excel |
| `src/components/payroll/index.ts` | Barrel exports |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Agregar ruta `/pre-liquidacion` |
| `src/components/layout/Sidebar.tsx` | Agregar enlace al menu |

### Secuencia de implementacion

1. Migraciones de base de datos (tablas + RLS)
2. Tipos TypeScript (`payroll.ts`)
3. Hooks de datos (`usePayrollConfig`, `usePayrollNovelties`)
4. Motor de calculo (`usePreLiquidation`)
5. Componentes UI (Config, Novedades, Tabla, Export)
6. Pagina principal (`PreLiquidacion.tsx`)
7. Integracion en navegacion (App.tsx + Sidebar)

