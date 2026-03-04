

# Plan: Manual de Usuario Integrado en la Aplicación

## Resumen

Crear un manual de usuario completo, dinámico y navegable accesible desde la vista de Perfil. El manual se genera desde datos estructurados en código (no hardcodeado como texto plano) y se adapta a los permisos del usuario, mostrando solo los módulos a los que tiene acceso.

## Arquitectura

El manual se implementa como un **componente client-side** que construye su contenido a partir de:
1. Un archivo de datos estructurados (`src/data/manualContent.ts`) con toda la documentación organizada por secciones
2. Los módulos reales del sistema (tabla `modules`) para la sección de descripción de módulos
3. Los permisos del usuario (`canView`) para filtrar contenido visible

No requiere cambios en la base de datos.

## Componentes a crear

### 1. `src/data/manualContent.ts`
Archivo de datos que contiene toda la documentación estructurada:
- Introducción general, acceso al sistema, roles y permisos
- Descripción funcional de cada módulo (keyed por `moduleCode`) con: descripción, acciones, validaciones, restricciones, alertas, dependencias
- Alertas y mensajes del sistema
- Reglas de negocio y restricciones
- Fórmulas y cálculos (vacaciones, cesantías, pre-liquidación, horas extras)
- Auditoría y seguridad
- FAQ

Cuando se agreguen módulos nuevos al sidebar, solo se necesita agregar la entrada correspondiente en este archivo.

### 2. `src/components/manual/UserManualDialog.tsx`
Componente principal - un Dialog de ancho completo (max-w-5xl) con:
- **Panel izquierdo**: Índice navegable con secciones expandibles (Accordion)
- **Panel derecho**: Contenido de la sección seleccionada con scroll
- **Barra de búsqueda**: Filtra secciones y contenido por palabra clave
- **Botón exportar PDF**: Genera PDF del manual completo usando jsPDF
- Responsive: en móvil el índice se colapsa como un dropdown

### 3. `src/components/manual/ManualSection.tsx`
Componente reutilizable para renderizar cada sección del manual con formato consistente (headings, listas, tablas de fórmulas, badges para alertas).

### 4. Modificación: `src/pages/Perfil.tsx`
Agregar una nueva Card "Manual de Usuario" con un botón que abre el dialog. Se ubica antes de la sección de cerrar sesión.

## Filtrado por permisos

- El hook `useAuth().canView(moduleCode)` determina qué módulos se muestran en la sección "Descripción de Módulos"
- Admins ven todo el manual completo
- Usuarios sin rol no pueden acceder (ya bloqueados por NoRoleGuard)
- Las secciones generales (Introducción, Acceso, Roles, FAQ) son visibles para todos

## Búsqueda

Búsqueda client-side que filtra:
- Títulos de secciones
- Contenido de texto dentro de cada sección
- Resalta las secciones que coinciden en el índice

## Exportación a PDF

Se usa la librería `jsPDF` (ya instalada) para generar un PDF con:
- Portada con logo y título
- Tabla de contenido
- Contenido formateado por secciones

## Estructura de datos del manual

```typescript
interface ManualSection {
  id: string;
  title: string;
  icon: string; // lucide icon name
  moduleCode?: string; // if tied to a specific module
  content: ManualContent[];
  subsections?: ManualSection[];
}

interface ManualContent {
  type: 'paragraph' | 'list' | 'table' | 'formula' | 'alert' | 'heading';
  data: any;
}
```

## Archivos

| Acción | Archivo |
|--------|---------|
| Crear | `src/data/manualContent.ts` |
| Crear | `src/components/manual/UserManualDialog.tsx` |
| Crear | `src/components/manual/ManualSection.tsx` |
| Crear | `src/components/manual/ManualPdfExporter.ts` |
| Editar | `src/pages/Perfil.tsx` (agregar botón + dialog) |

## Actualización automática

El manual se considera "auto-actualizable" porque:
- Los módulos se leen dinámicamente de la tabla `modules`
- El filtrado usa `canView` en tiempo real
- Para agregar documentación de un nuevo módulo, solo se agrega una entrada en `manualContent.ts` con el `moduleCode` correspondiente

