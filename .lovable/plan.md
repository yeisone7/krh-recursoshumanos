Plan para ajustar la vista **Jornadas** en móvil:

1. **Vista principal de Jornadas**
   - Reorganizar el encabezado y botones superiores para que en móvil no se amontonen.
   - Ajustar las pestañas de Calendario, Horarios, Turnos y Ciclos para que sean usables en pantallas pequeñas.
   - Mantener escritorio sin cambios visuales importantes.

2. **Listados de Horarios, Turnos y Ciclos**
   - En móvil, reemplazar las tablas compactadas por tarjetas tipo `MobileCardList`.
   - Mostrar en cada tarjeta la información clave: nombre, horario/duración, estado, días, descripción y acciones.
   - Conservar tabla en tablet/escritorio.

3. **Calendario de turnos**
   - Compactar controles superiores en móvil: periodo, selector 15d/Mes, modalidad y centro.
   - Evitar desbordes horizontales innecesarios fuera de la grilla del calendario.
   - Mantener la grilla con scroll horizontal interno, ya que el calendario por días lo requiere.
   - Hacer que la vista de pantalla completa también use padding y controles adecuados para móvil.

4. **Modales internos de Jornadas**
   - Revisar y ajustar estos modales para móvil:
     - Nuevo/editar horario administrativo.
     - Nuevo/editar turno operativo.
     - Nuevo/editar ciclo de rotación.
     - Generar turnos desde ciclo.
     - Generar ciclo a todos los empleados.
     - Exportar planilla de turnos.
   - Aplicar `max-h-[90vh]`, scroll nativo interno y botones apilables cuando falte espacio.
   - Evitar `ScrollArea` en formularios complejos, siguiendo el patrón del proyecto.

5. **Validación**
   - Ejecutar verificación TypeScript.
   - Revisar específicamente móvil de 390px de ancho, que coincide con tu vista actual.

Detalles técnicos:
- Archivos principales a modificar:
  - `src/pages/Jornadas.tsx`
  - `src/components/schedules/ShiftCalendar.tsx`
  - `src/components/schedules/ShiftFormDialog.tsx`
  - `src/components/schedules/ShiftCycleFormDialog.tsx`
  - `src/components/schedules/CycleGeneratorDialog.tsx`
  - `src/components/schedules/BulkCycleGeneratorDialog.tsx`
  - `src/components/schedules/ShiftReportExport.tsx`
- Reutilizar componentes existentes:
  - `MobileCardList`
  - `useIsMobile`
  - patrones de formularios con `overflow-y-auto` nativo.