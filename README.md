# KRH - Sistema Integral de Gestión de Recursos Humanos

![KRH Banner](C:\Users\YEISON\.gemini\antigravity\brain\8bb0f4af-4fbf-49ca-97a6-ac6fb19838c2\krh_banner_hero_1777499952472.png)

## 🌐 Resumen del Proyecto
**KRH** es una plataforma empresarial de vanguardia diseñada para transformar la gestión de Recursos Humanos en Colombia. Enfocada en la eficiencia operativa y el cumplimiento legal, KRH integra procesos administrativos complejos con tecnología de Inteligencia Artificial para ofrecer una experiencia fluida tanto para administradores como para empleados.

---

## 🚀 Características Principales

### 📋 Gestión Administrativa1
- **Gestión 360° de Empleados:** Centralización de perfiles, documentos y trayectoria laboral.
- **Contratación Inteligente:** Automatización de contratos laborales bajo normativa colombiana.
- **Control de Tiempos:** Gestión de jornadas, turnos, horas extra y ausentismo.
- **Novedades y Nómina:** Procesamiento de incapacidades, vacaciones, permisos y pre-liquidación.

### 🔍 Selección y Talento
- **Requisiciones:** Flujos de aprobación para nuevas vacantes.
- **Gestión de Candidatos:** Seguimiento detallado del proceso de selección y analítica de contratación.
- **Onboarding Digital:** Experiencia de bienvenida automatizada para nuevos talentos.

### 🛡️ Cumplimiento y Seguridad
- **Exámenes Médicos:** Control de profesiogramas y seguimientos de salud ocupacional.
- **Dotación:** Gestión de entregas y control de inventarios de implementos laborales.
- **Procesos Disciplinarios:** Flujos legales integrados con descarga de evidencias.

### 🤖 Inteligencia Artificial (IA)
- **Asistente IA Contextual:** Chatbot integrado que asiste en la navegación y consultas de datos.
- **Capacitación Proactiva:** Generación de contenido educativo mediante IA, incluyendo audio y video.
- **Analítica Predictiva:** Dashboards inteligentes para la toma de decisiones basada en datos.

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Animaciones:** [Framer Motion](https://www.framer.com/motion/)
- **Estado:** [TanStack React Query v5](https://tanstack.com/query/latest)

### Backend (BaaS)
- **Motor:** [Supabase](https://supabase.com/) (PostgreSQL + RLS)
- **Lógica:** [Edge Functions](https://supabase.com/docs/guides/functions) (Deno)
- **Almacenamiento:** Supabase Storage (Privado/Público)

---

## ⚙️ Configuración del Entorno

### Requisitos Previos
- [Bun](https://bun.sh/) (Recomendado) o Node.js

### Pasos de Instalación
1. **Instalar dependencias:**
   ```bash
   bun install
   ```
2. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz con las siguientes claves:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_PUBLISHABLE_KEY=tu_key_publica
   VITE_SUPABASE_PROJECT_ID=id_del_proyecto
   ```
3. **Ejecutar en desarrollo:**
   ```bash
   bun run dev
   ```

---

## 🏗️ Arquitectura de Seguridad
KRH implementa un modelo de **Multi-tenancy** estricto:
- **Aislamiento de Datos:** Mediante Row Level Security (RLS) en Postgres.
- **Sistema de Permisos:** Control granular por módulo (`view`, `create`, `update`, `delete`).
- **Guards de Ruta:** Verificación jerárquica de autenticación, onboarding y empresa activa.

---

## 📊 Scripts Disponibles
| Comando | Descripción |
| --- | --- |
| `bun run dev` | Inicia el servidor de desarrollo en el puerto 8080. |
| `bun run build` | Compila la aplicación para producción. |
| `bun run lint` | Ejecuta el análisis de estática de código. |
| `bun run test` | Ejecuta las pruebas unitarias con Vitest. |

---

## 📄 Licencia y Créditos
Desarrollado para la gestión integral de recursos humanos.
**Dominio:** krh-petrocasinos.lovable.app
