#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source .env.deploy

# Aplica en orden todas las migraciones de supabase/migrations.
# Ejecutar sobre un proyecto Supabase vacío para evitar conflictos.
supabase db push --include-all

echo "Base de datos, tablas, RLS, funciones SQL, storage buckets y políticas aplicadas."
