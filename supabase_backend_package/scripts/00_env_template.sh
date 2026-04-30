#!/usr/bin/env bash
set -euo pipefail

# Copia este archivo como .env.deploy y completa los valores.
# NO lo subas a GitHub ni lo compartas.

export SUPABASE_PROJECT_REF="REEMPLAZA_PROJECT_REF"
export SUPABASE_ACCESS_TOKEN="REEMPLAZA_ACCESS_TOKEN_CLI"
export SUPABASE_DB_PASSWORD="REEMPLAZA_PASSWORD_DB"

# Secrets requeridos por Edge Functions
export SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
export SUPABASE_ANON_KEY="REEMPLAZA_ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="REEMPLAZA_SERVICE_ROLE_KEY"
export SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY"

# Requeridos si usas IA/capacitaciones/chat IA. En Supabase externo debes proveer tu propia llave compatible o adaptar las funciones.
export LOVABLE_API_KEY="REEMPLAZA_LOVABLE_API_KEY_SI_APLICA"

# Requerido para correos/notificaciones.
export RESEND_API_KEY="REEMPLAZA_RESEND_API_KEY"
