

## Plan: Ficha Técnica Analítica por Centro de Operación

### Resumen
Crear un componente de ficha técnica (detail sheet) al que se accede haciendo clic en una fila del catálogo de Centros. Se muestra como un dialog/drawer tipo analítica con toda la información consolidada del centro, incluyendo datos contractuales, desglose de empleados por cargo, turnos asignados e indicadores adicionales.

---

### Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/components/centers/CenterDetailSheet.tsx` | **Nuevo** — Componente principal de la ficha técnica |
| `src/hooks/useCenterDetail.ts` | **Nuevo** — Hook que agrega datos del centro (empleados por cargo, turnos, áreas) |
| `src/pages/Centros.tsx` | **Modificar** — Agregar estado y evento click en fila para abrir la ficha |

---

### Contenido de la Ficha Técnica

**Sección 1 — Información General (header card)**
- Código (N° de Contrato)
- Nombre del Centro de Operación
- Cliente Principal
- Ciudad / Departamento
- Dirección
- Teléfono
- Responsable
- Estado (Activo/Inactivo)

**Sección 2 — Información Contractual**
- Fecha Inicio del Contrato
- Fecha Terminación Comercial del Contrato
- Días restantes para vencimiento (badge con color semáforo)
- Nota

**Sección 3 — Empleados por Cargo (tabla/gráfico)**
- Consulta `employee_work_info` filtrando por `operation_center_id` + `is_current = true`
- Agrupa por `position_name` y muestra cantidad
- Total de empleados
- Mini gráfico de barras horizontales (recharts) con distribución por cargo

**Sección 4 — Turnos del Centro**
- Consulta `employee_time_config` → join con `shift_cycles` y `work_schedules` para empleados del centro
- Lista de turnos/horarios únicos que se usan en ese centro
- Cantidad de empleados por turno/horario

**Sección 5 — Indicadores Adicionales**
- Áreas operativas presentes en el centro (desde `employee_work_info.area_id`)
- Contratos por vencer en el centro (empleados cuyo contrato vence pronto)
- Tasa de ocupación vs. capacidad (si aplica)

---

### Diseño Visual
- Se abre como `Sheet` (drawer lateral derecho) de ancho amplio (~600px)
- Secciones con Cards internas y separadores
- Gráfico de barras horizontal con recharts para distribución de cargos
- Badge de semáforo para días restantes del contrato del centro
- Estilo coherente con el dashboard de analítica existente

### Implementación del Hook `useCenterDetail`
- Recibe `centerId`
- Ejecuta queries en paralelo:
  1. Empleados del centro con `position_name` (agrupación client-side)
  2. Time configs de esos empleados para extraer turnos/horarios únicos
  3. Áreas únicas presentes
- Retorna datos agregados listos para renderizar

### Interacción en `Centros.tsx`
- Click en la fila de la tabla → abre el Sheet con la ficha del centro seleccionado
- El botón de edición y switch siguen funcionando igual (stopPropagation)

