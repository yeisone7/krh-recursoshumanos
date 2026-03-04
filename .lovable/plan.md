

# Plan: Módulo Perfil del Cargo (Versiones + Exportación PDF)

## Resumen

Crear un sistema de **Perfil del Cargo** vinculado a cada posición, con datos estructurados que replican el formato GT-FO-10, control de versiones y exportación PDF.

---

## 1. Base de Datos

### Nueva tabla: `position_profiles`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | Identificador |
| `company_id` | UUID FK → companies | Empresa |
| `position_id` | UUID FK → positions | Cargo asociado |
| `version` | INTEGER | Número de versión |
| `is_current` | BOOLEAN | Marca la versión vigente |
| `purpose` | TEXT | Objetivo del cargo |
| `reports_to` | TEXT | A quién reporta |
| `supervises` | TEXT | A quién supervisa |
| `num_positions` | INTEGER | Número de cargos |
| `education_level` | TEXT | Nivel de educación |
| `education_detail` | TEXT | Detalle formación |
| `experience` | TEXT | Experiencia requerida |
| `specific_knowledge` | JSONB | Lista de conocimientos |
| `skills` | JSONB | Lista de competencias |
| `functions` | JSONB | Lista de funciones |
| `responsibilities` | JSONB | Responsabilidades (equipos, dinero, info, etc.) |
| `working_conditions` | JSONB | Condiciones de trabajo (esfuerzo, riesgos, etc.) |
| `elaborated_by` | TEXT | Elaborado por |
| `reviewed_by` | TEXT | Revisado por |
| `approved_by` | TEXT | Aprobado por |
| `effective_date` | DATE | Fecha de vigencia |
| `created_by`, `created_at`, `updated_at` | — | Auditoría |

**RLS:** Acceso por miembros de la empresa.
**Trigger:** Al crear nueva versión, marcar `is_current = false` en versiones anteriores del mismo cargo.

---

## 2. Archivos a Crear

| Archivo | Propósito |
|---------|-----------|
| `src/types/positionProfile.ts` | Tipos TypeScript del perfil |
| `src/hooks/usePositionProfiles.ts` | CRUD + manejo de versiones |
| `src/components/config/PositionProfileFormDialog.tsx` | Formulario multi-sección (identificación, requisitos, funciones, responsabilidades, condiciones, aprobaciones) |
| `src/components/config/PositionProfileDetailDialog.tsx` | Vista detalle con historial de versiones |
| `src/lib/positionProfilePdfGenerator.ts` | Generador PDF replicando formato GT-FO-10 con encabezado corporativo |

## 3. Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/catalogos/Cargos.tsx` | Agregar columna/botón "Perfil" en cada cargo |
| `src/components/config/index.ts` | Exportar nuevos componentes |

---

## 4. Funcionalidades Clave

- **Versionamiento:** Cada edición crea nueva versión; se puede consultar historial completo
- **Formulario:** Secciones colapsables con listas dinámicas (agregar/quitar funciones, conocimientos, competencias)
- **Vista detalle:** Panel lateral con versiones anteriores, vista completa del perfil vigente
- **PDF:** Formato tabular con encabezado corporativo, marca de agua, secciones idénticas al documento GT-FO-10
- **Datos de ejemplo:** Se precargará el perfil "Auxiliar Talento Humano" del documento adjunto

---

## 5. Orden de Implementación

1. Migración de base de datos (tabla + RLS + trigger de versiones)
2. Tipos TypeScript
3. Hook de datos
4. Formulario y vista detalle
5. Generador PDF
6. Integración en página de Cargos

