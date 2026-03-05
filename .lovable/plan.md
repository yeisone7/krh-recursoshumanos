

## Plan: Hacer Jornadas Responsivo para Móvil

### Archivos a modificar

#### 1. `src/pages/Jornadas.tsx`
- **Header**: Botones de acción con solo íconos en móvil (ocultar texto con `hidden sm:inline`)
- **TabsList**: Mostrar solo íconos en móvil, texto completo en desktop
- **Barra de búsqueda**: `w-full sm:w-64`
- **Tablas de Horarios/Turnos/Ciclos**: Envolver en `overflow-x-auto`, ocultar columnas menos importantes en móvil con `hidden sm:table-cell`
- **Altura del contenedor**: Ajustar `h-[calc(100vh-3rem)]` para mobile

#### 2. `src/components/schedules/ShiftCalendar.tsx`
- **Filtros superiores**: Apilar verticalmente en móvil — navegación de periodo en una fila, filtros (modo, vista, centro) en la siguiente, cada uno `w-full sm:w-auto`
- **Leyenda**: Ocultar en móvil con `hidden sm:flex`, o mostrar versión compacta
- **Grid del calendario**: Ya tiene `overflow-auto` y columna sticky `left-0` — solo reducir el ancho de la columna de empleado de `w-56` a `w-32 sm:w-56` y truncar nombres
- **Celdas**: Reducir ancho de `w-10` a `w-8 sm:w-10` en móvil
- **Select de centro**: `w-full sm:w-48`

### Resumen de cambios
Todos los cambios son ajustes de clases Tailwind responsivas. No se modifica lógica de negocio. Tiempo estimado: ~15 minutos de implementación.

