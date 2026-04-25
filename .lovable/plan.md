Plan de ajuste visual

1. Cambiar la paleta global a un estilo claro similar a la imagen adjunta
   - Fondo principal blanco / gris muy claro.
   - Sidebar blanco con bordes suaves.
   - Verde #38c292 como color de acento principal en activos, botones, links, iconos activos, badges y estados hover.
   - Textos principales en tonos oscuros y textos secundarios en gris azulado para mejorar legibilidad.

2. Rediseñar el sidebar
   - Quitar el fondo verde sólido del sidebar y dejarlo blanco como la referencia.
   - Menú activo con fondo verde muy suave y texto/icono #38c292.
   - Menús inactivos en gris azulado.
   - Secciones, bordes, tooltips y badges ajustados al nuevo esquema.
   - Mantener el colapsado actual, pero con apariencia coherente en ambos estados.

3. Mover la empresa actual desde el header al pie del sidebar
   - Eliminar del header el selector “Empresa actual”.
   - Usar el componente de selector de empresa existente dentro del sidebar, ubicado en la zona inferior, arriba o integrado con la sección inferior, similar a la tarjeta de la imagen.
   - Mostrar nombre de empresa y dato secundario, por ejemplo NIT o email si está disponible.
   - Mantener el cambio de empresa si el usuario tiene permisos y múltiples empresas.

4. Reemplazar el avatar por el logo de la empresa
   - En la tarjeta inferior del sidebar, mostrar `companies.logo_url` como imagen principal.
   - Si la empresa no tiene logo, usar un fallback con icono de empresa o iniciales.
   - Mantener el menú de usuario/perfil accesible desde esa zona, sin perder acciones como Perfil, Configuración, Manual y Cerrar sesión.

Detalles técnicos

- Archivos principales a modificar:
  - `src/index.css`: tokens globales de color, sidebar, badges, borders y estados.
  - `src/components/layout/Header.tsx`: retirar selector de empresa del header.
  - `src/components/layout/Sidebar.tsx`: rediseñar estilos del menú y convertir la sección inferior en tarjeta de empresa/usuario.
  - `src/components/layout/MobileBottomNav.tsx`: reemplazar el naranja fijo por #38c292 o tokens del sistema para mantener consistencia móvil.

- La tabla de empresas ya tiene `logo_url`, así que no hace falta cambiar base de datos para mostrar el logo.