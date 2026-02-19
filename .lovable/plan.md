

## Modo pantalla completa para el calendario de Jornadas

Se agregara un boton de "pantalla completa" en la pestana de Calendario que expandira el calendario para ocupar toda la ventana, ocultando el sidebar, header y demas controles. Un segundo clic (o tecla Escape) restaurara la vista normal.

### Cambios

**Archivo: `src/pages/Jornadas.tsx`**

1. Agregar un estado `isFullscreen` (booleano, por defecto `false`).
2. Agregar un listener de teclado para salir con la tecla `Escape`.
3. Cuando `isFullscreen` esta activo:
   - El contenedor principal usa `fixed inset-0 z-50 bg-background p-4` para cubrir toda la pantalla (sobre el sidebar y header).
   - Se ocultan el header con titulo/botones de accion y las tabs de navegacion.
   - Solo se muestra el calendario con un mini-header que tiene el boton para restaurar la vista.
4. Cuando `isFullscreen` esta desactivado, la vista funciona exactamente como ahora.
5. El boton de fullscreen se ubicara junto a los controles existentes del calendario (o como un boton flotante dentro del tab de calendario). Usara el icono `Maximize2` de lucide-react, y el boton de restaurar usara `Minimize2`.

### Detalles tecnicos

- Se usara `fixed inset-0 z-50` para superponer la vista sobre el sidebar sin necesidad de modificar el layout global (`AppLayout`).
- El estado es local al componente, no requiere contexto ni cambios en otros archivos.
- Solo se modifica un archivo: `src/pages/Jornadas.tsx`.

