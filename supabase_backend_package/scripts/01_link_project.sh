#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.deploy ]; then
  echo "Falta .env.deploy. Copia scripts/00_env_template.sh a .env.deploy y completa los valores."
  exit 1
fi
source .env.deploy

command -v supabase >/dev/null 2>&1 || { echo "Instala Supabase CLI antes de continuar."; exit 1; }

supabase login --token "$SUPABASE_ACCESS_TOKEN"
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "Proyecto enlazado correctamente."
