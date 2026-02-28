
# Vista de Cumplimiento de Capacitaciones por Centro de Operacion

## Objetivo
Crear una nueva vista dentro del modulo de Capacitaciones que muestre, por cada Centro de Operacion, que empleados han completado cada capacitacion y cuales faltan por completarla. Seria una "Matriz de Cumplimiento".

## Estructura de la Vista

```text
+-----------------------------------------------+
| Cumplimiento por Centro                        |
+-----------------------------------------------+
| [Filtro: Centro de Operacion] [Filtro: Curso]  |
+-----------------------------------------------+
| Centro: Canacol                                |
|   Curso: BPM                                   |
|     Completaron (3/5)  ████████░░░░  60%       |
|     + Yeison Escobar    - 15 Feb 2026          |
|     + Maria Lopez       - 10 Feb 2026          |
|     + Juan Perez        - 08 Feb 2026          |
|     Pendientes (2/5)                            |
|     - Carlos Ruiz                               |
|     - Ana Martinez                              |
|                                                 |
|   Curso: Charla 5 min                          |
|     Completaron (5/5)  ████████████  100%      |
|     ...                                         |
+-----------------------------------------------+
```

## Funcionalidad
- Filtros por Centro de Operacion y por Curso
- Barra de progreso visual por curso dentro de cada centro
- Lista de empleados que completaron (con fecha)
- Lista de empleados pendientes
- Indicadores de porcentaje de cumplimiento
- Exportar a Excel (opcional, usando la libreria xlsx ya instalada)

## Implementacion Tecnica

### 1. Nueva pagina: `src/pages/capacitaciones/Cumplimiento.tsx`
- Obtiene la lista de centros de operacion (hook `useOperationCenters`)
- Obtiene empleados activos por centro (query a `employees_v2` + `employee_work_info`)
- Obtiene completions (hook `useTrainingCompletions`)
- Cruza los datos: por cada centro y curso, compara empleados del centro vs completions con `operator_cedula` o `employee_id`
- Renderiza la matriz usando el componente TreeView existente o un layout de acordeon simple

### 2. Nuevo hook: `src/hooks/useTrainingCompliance.ts`
- Query que obtiene empleados activos agrupados por centro de operacion (via `employee_work_info.operation_center_id`)
- Query que obtiene todas las completions con su token y centro asociado
- Logica de cruce: para cada par (centro, curso), determina completados vs pendientes comparando por `document_number` / `operator_cedula`

### 3. Registrar ruta en `src/App.tsx`
- Agregar ruta `/capacitaciones/cumplimiento`

### 4. Agregar acceso desde la pagina principal de Capacitaciones
- Nuevo boton en "Acciones Rapidas" de `src/pages/Capacitaciones.tsx` con icono de checklist

### 5. Agregar enlace en el Sidebar
- Agregar entrada en el submenu de Capacitaciones en `src/components/layout/Sidebar.tsx`

## Logica de Cruce de Datos
1. Por cada centro de operacion, obtener los empleados activos asignados
2. Por cada curso publicado, obtener las completions donde el token pertenece a ese centro O donde el `employee_id` corresponde a un empleado de ese centro
3. Comparar: empleados del centro vs empleados que tienen completion para ese curso (match por `document_number` = `operator_cedula` o por `employee_id`)
4. Los que no tienen match son "pendientes"

## Archivos a crear/modificar
- **Crear**: `src/pages/capacitaciones/Cumplimiento.tsx` -- pagina principal
- **Crear**: `src/hooks/useTrainingCompliance.ts` -- hook de datos
- **Modificar**: `src/App.tsx` -- agregar ruta
- **Modificar**: `src/pages/Capacitaciones.tsx` -- boton de acceso rapido
- **Modificar**: `src/components/layout/Sidebar.tsx` -- enlace en submenu
