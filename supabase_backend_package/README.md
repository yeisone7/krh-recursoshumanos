# Paquete de despliegue backend externo en Supabase

Este paquete contiene el backend actual para montarlo en un proyecto Supabase externo: migraciones SQL, RLS, buckets/policies de Storage, funciones SQL, Edge Functions y scripts de despliegue.

## Contenido

- `supabase/migrations/`: 132 migraciones en orden cronológico.
- `supabase/00_all_migrations_combined.sql`: alternativa consolidada para SQL Editor.
- `supabase/functions/`: 16 Edge Functions.
- `scripts/`: scripts numerados para ejecutar en orden.
- `FRONTEND_ENV.example`: variables para conectar el frontend al nuevo backend.

## Requisitos previos

1. Crear un proyecto vacío en Supabase.
2. Instalar Supabase CLI.
3. Tener a mano:
   - Project ref
   - Database password
   - Anon key
   - Service role key
   - Access token de Supabase CLI
   - `RESEND_API_KEY` para correos
   - `LOVABLE_API_KEY` si vas a usar chat IA/generación de capacitaciones tal como está implementado actualmente

## Orden recomendado

```bash
cd supabase_external_backend_package
cp scripts/00_env_template.sh .env.deploy
nano .env.deploy
bash scripts/run_all.sh
```

Si prefieres ejecutar paso a paso:

```bash
bash scripts/01_link_project.sh
bash scripts/02_apply_database.sh
bash scripts/03_set_secrets.sh
bash scripts/04_deploy_edge_functions.sh
bash scripts/06_smoke_test.sh
```

## Jobs programados

Las extensiones `pg_cron` y `pg_net` están incluidas en migraciones. Para crear llamadas programadas a funciones de notificación:

1. Abre `scripts/05_optional_cron_jobs.sql`.
2. Reemplaza `PROJECT_REF` y `ANON_KEY`.
3. Ejecuta el SQL en Supabase.

## Variables del frontend

Después del backend, actualiza el frontend con:

```env
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_ANON_KEY
VITE_SUPABASE_PROJECT_ID=TU_PROJECT_REF
```

## Importante

- Ejecuta esto sobre un proyecto Supabase vacío.
- No compartas `.env.deploy` ni claves `service_role`.
- Las políticas RLS están incluidas en las migraciones.
- Los buckets incluidos por las migraciones son: `avatars`, `documents`, `training-media`, `dotation-images`.
- Las funciones se despliegan con `--no-verify-jwt` porque el proyecto actual las tiene configuradas así; la seguridad depende de validaciones internas y RLS/Service Role donde aplica.
- Si Supabase CLI reporta conflicto en una migración, detente y no continúes; normalmente significa que el proyecto no está vacío o ya tiene objetos con el mismo nombre.

## Edge Functions incluidas

- ai-chat
- complete-onboarding
- extract-pdf
- generate-training
- generate-training-audio
- generate-training-avatar
- generate-training-media
- generate-training-video
- get-session-info
- invite-user
- lookup-user-by-email
- notify-contract-preaviso
- notify-incapacity-alerts
- notify-pending-terminations
- notify-requisition-approver
- send-candidate-thanks
