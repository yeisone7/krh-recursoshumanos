Plan aprobado para Docs en Empleados

1. Carga múltiple de documentos
- Actualizar el modal “Cargar Documento” para aceptar varios archivos en una sola operación.
- Mantener validaciones por archivo: PDF, JPG, PNG o WebP, máximo 10MB.
- Mostrar una lista de archivos seleccionados con nombre, tamaño y opción para quitar cada archivo antes de guardar.
- Al guardar, subir cada archivo y crear un registro independiente por documento.

2. Fecha de vencimiento
- Mantener el campo “Fecha de Vencimiento” dentro del modal con selector de calendario.
- Agregar una opción clara: “Este documento tiene vencimiento”.
- Si está activada, se muestra/requiere la fecha de vencimiento.
- Si no está activada, el documento queda como “Sin vencimiento”.
- Cuando se carguen varios archivos juntos, compartirán la misma carpeta y la misma fecha de vencimiento. Si necesitan fechas diferentes, se cargarán en operaciones separadas.

3. Organización visual en carpetas
- Reemplazar la lista plana por una vista tipo árbol.
- Usar las carpetas solicitadas, en este orden:
  1. Hoja de Vida
  2. Certificados Laborales y Académicos
  3. Proceso de Selección
  4. Certificados de Residencia
  5. Afiliaciones
  6. Exámenes Ocupacionales
  7. Carné de Vacunas
  8. Consulta de Antecedentes
  9. Dotación
  10. Contratos y Otro sí
  11. Certificados Bancarios
  12. Documentos de Retiro
  13. Inducciones y Cursos
  14. Licencia y Cursos
- Mostrar icono de carpeta, contador de documentos, líneas/indentación tipo árbol y documentos desplegables.
- Conservar carpetas sin documentos para que siempre se vea la estructura completa.

4. Compatibilidad con documentos existentes
- Mapear los tipos actuales hacia las nuevas carpetas cuando aplique.
- Mantener las acciones actuales de abrir documento y eliminar documento.

5. Ajustes técnicos
- Actualizar el catálogo de tipos de documento de empleado para soportar las nuevas carpetas.
- Actualizar TypeScript, labels, formulario y vista Docs.
- Aplicar una migración de esquema para agregar los nuevos valores permitidos al catálogo de tipos de documento.
- Conservar las reglas actuales de seguridad por empresa y permisos.

6. Responsividad móvil
- Adaptar el modal, selector de archivos y árbol para pantallas pequeñas.
- Evitar desbordes con nombres largos truncados, botones compactos y espaciado táctil adecuado.