Plan para actualizar la vista 360:

1. Cambiar Dotación 360 a registros desplegables por entrega
   - La pestaña ya no listará cada artículo como tarjeta independiente.
   - Mostrará una tarjeta por entrega/registro, ordenada por fecha de entrega.
   - Cada tarjeta resumirá: fecha, cantidad de artículos, estado general y responsable/observaciones si existen.
   - Al desplegar, mostrará los artículos entregados en ese registro: nombre, tipo, talla, cantidad, vencimiento y alertas de vencido/por vencer.
   - Si hay registros antiguos sin `transaction_id`, se agruparán por fecha de entrega para no perder información.

2. Cambiar Exámenes 360 a registros desplegables por aplicación
   - En la pestaña Salud > Exámenes, se reemplazará la lista plana de exámenes por aplicaciones/registros.
   - Cada tarjeta resumirá: fecha, tipo de aplicación, proveedor, médico y número de exámenes incluidos.
   - Al desplegar, mostrará los exámenes realizados en ese registro: nombre, resultado, concepto, restricciones, vencimiento y documento si existe.
   - Se conservará compatibilidad con exámenes antiguos de `medical_exams` agrupándolos por fecha/tipo/proveedor cuando no provengan de una aplicación múltiple.

3. Ajustar datos cargados en Employee360
   - Actualizar `useEmployee360` para consultar también:
     - `dotation_delivery_transactions` + sus `dotation_deliveries`
     - `exam_delivery_transactions` + sus `exam_delivery_items`
   - Filtrar por el empleado actual y mantener el orden descendente por fecha.
   - Mantener los datos existentes para KPIs y compatibilidad.

4. Mantener diseño responsive
   - Usar `Accordion`/tarjetas plegables con botones cómodos en móvil.
   - Evitar tablas horizontales dentro de la vista 360.
   - Mantener colores semánticos del sistema (`primary`, `success`, `warning`, `destructive`, etc.).

Archivos a modificar:
- `src/hooks/useEmployee360.ts`
- `src/components/employee360/Tab360Dotation.tsx`
- `src/components/employee360/Tab360Health.tsx`
- Si hace falta, `src/pages/Empleado360.tsx` para pasar las nuevas propiedades.

No se requieren cambios de base de datos; se reutilizan las tablas existentes de entregas y aplicaciones de exámenes.