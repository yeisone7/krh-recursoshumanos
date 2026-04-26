# KRH - Sistema Integral de Gestión de Recursos Humanos

KRH es una aplicación web empresarial para la gestión integral de Recursos Humanos, orientada a procesos laborales colombianos. Incluye administración de empleados, contratación, jornadas, novedades, selección, requisiciones, dotación, exámenes médicos, vacaciones, permisos, procesos disciplinarios, capacitaciones, evaluaciones, reportes, analítica y asistente de IA.

## Información del proyecto

- **Proyecto Lovable:** `dace6fec-0379-43ff-926f-58e1d672278b`
- **Preview:** https://id-preview--dace6fec-0379-43ff-926f-58e1d672278b.lovable.app
- **Producción:** https://krh-petrocasinos.lovable.app
- **Tipo de aplicación:** SPA cliente con backend administrado por Lovable Cloud
- **Dominio funcional:** Gestión de Recursos Humanos y cumplimiento laboral en Colombia

## Stack técnico

### Frontend

- **React 18**
- **TypeScript 5**
- **Vite 5**
- **React Router DOM 6**
- **TanStack React Query 5**
- **Tailwind CSS 3**
- **shadcn/ui + Radix UI**
- **Framer Motion** para animaciones
- **Lucide React** para iconografía
- **Sonner** y toaster propio para notificaciones
- **React Hook Form + Zod** para formularios y validaciones
- **Recharts** para visualización de datos
- **XLSX, jsPDF, docxtemplater y pizzip** para generación/exportación documental
- **vite-plugin-pwa** para soporte PWA

### Backend

- **Lovable Cloud** como backend administrado
- Base de datos relacional con RLS y funciones SQL/PLpgSQL
- Autenticación con sesión de usuario
- Almacenamiento de archivos en buckets privados y públicos
- Backend functions para procesos de IA, notificaciones, invitaciones y generación de contenido

## Scripts disponibles

```bash
bun install          # Instalar dependencias
bun run dev          # Ejecutar entorno local en modo desarrollo
bun run build        # Compilar aplicación para producción
bun run build:dev    # Compilar en modo development
bun run preview      # Previsualizar build local
bun run lint         # Ejecutar ESLint
bun run test         # Ejecutar pruebas con Vitest
bun run test:watch   # Ejecutar pruebas en modo watch
```

El servidor de desarrollo usa el puerto `8080` según `vite.config.ts`.

## Estructura principal

```text
src/
  App.tsx                    # Árbol principal de proveedores, guards y rutas
  main.tsx                   # Bootstrap de React
  index.css                  # Tokens globales, tema y estilos base
  App.css                    # Estilos complementarios de app
  assets/                    # Activos internos
  components/                # Componentes reutilizables por dominio y UI
  contexts/                  # Contextos globales, principalmente autenticación
  data/                      # Datos estáticos y contenido manual
  hooks/                     # Hooks de dominio, datos y comportamiento UI
  integrations/supabase/     # Cliente y tipos autogenerados del backend
  lib/                       # Utilidades, generación documental, PDF, helpers
  pages/                     # Vistas principales por ruta
  test/                      # Configuración y pruebas
  types/                     # Tipos compartidos de dominio
  utils/                     # Utilidades auxiliares

supabase/
  config.toml                # Configuración de backend functions
  functions/                 # Backend functions administradas
```

> Nota: `src/integrations/supabase/client.ts` y `src/integrations/supabase/types.ts` son archivos autogenerados y no deben editarse manualmente.

## Arquitectura de aplicación

La aplicación es una SPA protegida por autenticación. El árbol principal está definido en `src/App.tsx` y se compone de:

1. `QueryClientProvider` para caché y sincronización de datos.
2. `TooltipProvider`, `Toaster` y `Sonner` para UI global.
3. `BrowserRouter` para navegación.
4. `AuthProvider` para sesión, roles, permisos y empresa activa.
5. Guards de acceso:
   - `ProtectedRoute`
   - `OnboardingGuard`
   - `CompanyGuard`
   - `NoRoleGuard`
   - `PermissionRoute`
6. `AppLayout` para layout autenticado, navegación lateral, navegación móvil y panel flotante del asistente IA.

## Autenticación, empresas y permisos

La autenticación se centraliza en `src/contexts/AuthContext.tsx`.

El contexto expone:

- Usuario autenticado y sesión actual
- Roles heredados (`admin`, `rrhh`, `auditor`, `psicologo`)
- Estado de super administrador
- Empresas asociadas al usuario
- Empresa activa (`currentCompanyId`)
- Permisos dinámicos por módulo y acción
- Helpers de acceso: `hasPermission`, `canView`, `canCreate`, `canUpdate`, `canDelete`
- Métodos `signIn`, `signUp` y `signOut`

### Modelo de permisos

El sistema combina:

- Tabla de roles personalizados por empresa
- Roles de sistema
- Permisos por módulo y acción
- Función de backend `get_user_permissions(_user_id)`
- Rutas protegidas con `PermissionRoute`

Los módulos se autorizan por código lógico, por ejemplo:

- `dashboard`
- `empleados`
- `contratos`
- `jornadas`
- `novedades`
- `seleccion`
- `requisiciones`
- `asistente_ia`
- `catalogos`
- `seguridad`
- `configuracion`

## Rutas principales

### Rutas públicas

| Ruta | Vista | Propósito |
| --- | --- | --- |
| `/auth` | Auth | Inicio de sesión y registro |
| `/reset-password` | ResetPassword | Recuperación de contraseña |
| `/capacitacion` | AccesoPublico | Acceso público a capacitación |
| `/descargos` | DescargosPublico | Descargos mediante enlace/token |
| `/registro` | RegistroPublico | Registro público de empleado o candidato |
| `/install` | Install | Diagnóstico e instalación PWA |

### Rutas protegidas especiales

| Ruta | Vista | Propósito |
| --- | --- | --- |
| `/portal` | Portal | Portal autenticado |
| `/onboarding` | Onboarding | Configuración inicial |
| `/select-company` | SelectCompany | Selección de empresa activa |

### Rutas protegidas dentro del layout

| Ruta | Módulo | Vista |
| --- | --- | --- |
| `/` | `dashboard` | Dashboard |
| `/empleados` | `empleados` | Gestión de empleados |
| `/empleados/:id/360` | `empleados` | Vista 360 del empleado |
| `/contratos` | `contratos` | Contratos laborales |
| `/incapacidades` | `incapacidades` | Incapacidades |
| `/alertas` | `alertas` | Alertas |
| `/notificaciones` | `alertas` | Centro de notificaciones |
| `/dotacion` | `dotacion` | Dotación |
| `/examenes` | `examenes` | Exámenes médicos |
| `/seleccion` | `seleccion` | Selección y vacantes |
| `/requisiciones` | `requisiciones` | Requisiciones de personal |
| `/centros` | `centros` | Centros de operación |
| `/centros/fichas` | `centros` | Fichas de centros |
| `/jornadas` | `jornadas` | Jornadas y turnos |
| `/disciplinarios` | `disciplinarios` | Procesos disciplinarios |
| `/vacaciones` | `vacaciones` | Vacaciones |
| `/permisos` | `permisos` | Permisos y licencias |
| `/novedades` | `novedades` | Novedades |
| `/pre-liquidacion` | `pre_liquidacion` | Pre-liquidación de nómina |
| `/configuracion-laboral` | `config_laboral` | Configuración laboral |
| `/prestamos` | `prestamos` | Préstamos |
| `/descuentos` | `descuentos` | Descuentos |
| `/capacitaciones` | `capacitaciones` | Capacitaciones |
| `/capacitaciones/crear` | `capacitaciones` | Crear capacitación con IA |
| `/capacitaciones/crear-manual` | `capacitaciones` | Crear manualmente |
| `/capacitaciones/biblioteca` | `capacitaciones` | Biblioteca |
| `/capacitaciones/acceso/generar` | `capacitaciones` | Generación de accesos |
| `/capacitaciones/evidencias` | `capacitaciones` | Evidencias |
| `/capacitaciones/analiticas` | `capacitaciones` | Analíticas de capacitación |
| `/capacitaciones/cumplimiento` | `capacitaciones` | Cumplimiento |
| `/evaluaciones` | `evaluaciones` | Evaluaciones |
| `/evaluaciones/analiticas` | `evaluaciones` | Analíticas de evaluación |
| `/organigrama` | `organigrama` | Organigrama |
| `/cesantias` | `cesantias` | Cesantías e intereses |
| `/calendario` | `calendario` | Calendario |
| `/reportes` | `reportes` | Reportes |
| `/analitica` | `analitica` | Analítica general |
| `/asistente-ia` | `asistente_ia` | Asistente IA |
| `/perfil` | sin wrapper de módulo | Perfil del usuario |
| `/super-admin` | sin wrapper de módulo | Administración global |
| `/seguridad` | `seguridad` | Seguridad |
| `/configuracion` | `configuracion` | Configuración |

### Catálogos

Todas las rutas de catálogos usan el módulo `catalogos`:

- `/catalogos/areas`
- `/catalogos/cargos`
- `/catalogos/tipos-dotacion`
- `/catalogos/arl`
- `/catalogos/eps`
- `/catalogos/afp`
- `/catalogos/ccf`
- `/catalogos/afc`
- `/catalogos/ips`
- `/catalogos/bancos`
- `/catalogos/tipos-contrato`
- `/catalogos/festivos`
- `/catalogos/motivos-novedad`
- `/catalogos/plataformas-publicacion`

## Layout y navegación

`AppLayout` administra:

- Sidebar de escritorio
- Header
- Navegación inferior móvil
- Gestos de swipe en móvil
- Timeout de inactividad
- Notificaciones de vencimiento contractual
- Panel flotante del asistente IA
- Persistencia de última ruta de módulo para volver desde `/asistente-ia`

El asistente IA puede usarse como vista completa o como panel compacto flotante. Las sugerencias contextuales del chat se seleccionan según la ruta activa o la última ruta de módulo guardada.

## Asistente IA

El asistente se implementa principalmente con:

- `src/components/ai/AiChatPanel.tsx`
- `src/hooks/useAiChat`
- Backend function `ai-chat`

Características:

- Modo de ayuda de la aplicación
- Historial temporal por sesión de panel
- Sugerencias iniciales rotativas
- Sugerencias contextuales por módulo
- Confirmación antes de cerrar o iniciar un nuevo chat, porque la conversación visible no se guarda
- Soporte móvil con ajuste por teclado virtual

Módulos con sugerencias contextuales configuradas:

- Empleados
- Contratos
- Jornadas
- Novedades
- Requisiciones
- Selección y Vacantes
- Dotación
- Exámenes
- Alertas

## PWA

La aplicación está configurada como Progressive Web App mediante `vite-plugin-pwa`.

Configuración relevante:

- `registerType: autoUpdate`
- Manifest con nombre `KRH - Gestión de Recursos Humanos`
- `short_name: KRH`
- `display: standalone`
- `orientation: portrait-primary`
- `start_url: /`
- Íconos PNG y SVG en múltiples tamaños
- Cache de assets JS, CSS, HTML, imágenes, SVG y fuentes
- Cache específico para Google Fonts
- Fallback de navegación a `/index.html`

Además, se genera `dist/app-version.json` en cada build para soportar notificación de actualización mediante `AppUpdateNotifier`.

## Backend functions

Las backend functions configuradas son:

| Función | Propósito |
| --- | --- |
| `ai-chat` | Respuestas del asistente IA |
| `complete-onboarding` | Finalización de onboarding |
| `extract-pdf` | Extracción/procesamiento de PDF para capacitación |
| `generate-training` | Generación de capacitación con IA |
| `generate-training-audio` | Generación de audio para capacitación |
| `generate-training-avatar` | Generación de avatar/media |
| `generate-training-media` | Generación de recursos multimedia |
| `generate-training-video` | Generación de video |
| `get-session-info` | Información de sesión |
| `invite-user` | Invitación de usuarios |
| `lookup-user-by-email` | Búsqueda de usuario por correo |
| `notify-contract-preaviso` | Notificaciones de preaviso contractual |
| `notify-incapacity-alerts` | Alertas de incapacidades |
| `notify-pending-terminations` | Alertas de retiros pendientes |
| `notify-requisition-approver` | Notificación a aprobadores de requisiciones |
| `send-candidate-thanks` | Envío de agradecimiento a candidatos |

En `supabase/config.toml`, varias funciones están configuradas con `verify_jwt = false` porque pueden ser llamadas por flujos públicos, programados o mediante tokens controlados por la lógica interna.

## Almacenamiento de archivos

Buckets configurados:

| Bucket | Público | Uso esperado |
| --- | --- | --- |
| `avatars` | Sí | Avatares e imágenes de perfil |
| `documents` | No | Documentos laborales, soportes y archivos sensibles |
| `training-media` | Sí | Recursos multimedia de capacitaciones |
| `dotation-images` | Sí | Imágenes relacionadas con dotación |

## Funciones de base de datos relevantes

El backend incluye funciones para seguridad, permisos, negocio y flujos públicos. Entre las principales:

### Seguridad y acceso

- `is_super_admin()`
- `is_admin()`
- `is_admin_or_rrhh()`
- `is_auditor()`
- `is_psicologo()`
- `has_role(_user_id, _role)`
- `is_user_active(_user_id)`
- `check_account_locked(p_email, p_max_attempts, p_lockout_minutes)`
- `cleanup_old_login_attempts()`

### Permisos y multiempresa

- `get_user_permissions(_user_id)`
- `check_user_permission(_user_id, _module_code, _action)`
- `is_company_member(_company_id)`
- `get_user_company_ids()`
- `get_user_center_ids()`
- `has_center_access(_center_id)`

### Empleados

- `get_my_employee_id()`
- `has_employee_access(_employee_id)`
- `has_employee_v2_access(_employee_id)`
- `verify_employee_cedula(p_cedula, p_company_id)`
- `submit_employee_registration(...)`

### Selección y candidatos

- `submit_candidate_registration(...)`
- `check_candidate_background(p_document_number, p_document_type, p_company_id)`

### Contratos y configuración

- `get_next_contract_number(_company_id, _prefix)`
- `insert_default_company_config()`
- `insert_default_admin_role()`
- `insert_default_holidays()`
- `insert_default_leave_types()`
- `update_updated_at_column()`

### Jornadas, ausencias y dotación/exámenes

- `delete_shift_assignments_for_absence(p_employee_id, p_start_date, p_end_date)`
- `get_profesiogramas_with_items(_company_id)`
- `get_exam_profesiogramas_with_items(_company_id)`

### Procesos disciplinarios

- `submit_defense_via_token(p_token, p_content, p_defense_type)`

## Variables y secretos

### Variables públicas de frontend

El frontend usa variables públicas inyectadas por el entorno:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_APP_VERSION`

### Secretos de backend configurados

Secretos disponibles en backend:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_JWKS`
- `SUPABASE_PUBLISHABLE_KEY`
- `LOVABLE_API_KEY`
- `RESEND_API_KEY`

Los secretos privados no deben exponerse en código cliente ni en documentación pública operacional.

## Diseño y sistema visual

La aplicación usa Tailwind CSS y shadcn/ui con tokens semánticos definidos en CSS. Las decisiones visuales importantes del proyecto incluyen:

- Identidad corporativa Petrocasinos
- Paleta principal de azul marino y naranja
- Acento principal aproximado `#e65a0a`
- Soporte de modo oscuro con toggle manual persistente
- Componentes accesibles basados en Radix UI
- Diseño responsive con navegación móvil dedicada
- Soporte PWA instalable

## Generación documental y reportes

La aplicación contiene utilidades para:

- PDF de contratos y documentos laborales
- PDF de requisiciones
- PDF de candidatos
- PDF de retiros/liquidaciones
- Reportes de selección, diversidad, capacitaciones y evaluaciones
- Exportaciones Excel mediante `xlsx`
- Plantillas DOCX mediante `docxtemplater` y `pizzip`

## Capacitaciones con IA

El módulo de capacitaciones incluye:

- Creación asistida con IA
- Creación manual
- Biblioteca de capacitaciones
- Generación de accesos públicos
- Evidencias
- Analíticas
- Cumplimiento
- Procesamiento de PDF
- Generación de media, audio, video y avatar mediante backend functions

## Consideraciones de seguridad

- Las rutas internas requieren autenticación.
- Las vistas protegidas validan permisos por módulo.
- El modelo multiempresa usa empresa activa y asignaciones de usuario.
- Los roles se administran en tablas separadas, no en perfiles de usuario.
- El acceso a datos sensibles debe pasar por políticas de backend y funciones seguras.
- Los documentos sensibles se almacenan en bucket privado `documents`.
- Los flujos públicos usan tokens y validaciones server-side.
- El sistema incluye control de intentos fallidos y bloqueo temporal de cuenta.

## Convenciones de desarrollo

- Usar import alias `@/` para archivos dentro de `src`.
- Mantener componentes de dominio en `src/components/<dominio>`.
- Mantener vistas de ruta en `src/pages`.
- Mantener lógica reutilizable en hooks (`src/hooks`) o utilidades (`src/lib`).
- No editar manualmente archivos autogenerados del backend.
- Usar tokens semánticos del sistema de diseño en lugar de colores hardcodeados.
- Validar cambios con TypeScript antes de publicar:

```bash
bunx tsc --noEmit
```

## Despliegue

El despliegue se gestiona desde Lovable. Para publicar cambios se usa la acción de publicación del proyecto.

La aplicación genera una build Vite estática y usa Lovable Cloud para backend, autenticación, almacenamiento, funciones y base de datos.
