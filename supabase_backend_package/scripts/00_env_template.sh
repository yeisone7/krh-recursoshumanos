#!/usr/bin/env bash
set -euo pipefail

# Copia este archivo como .env.deploy y completa los valores.
# NO lo subas a GitHub ni lo compartas.

export SUPABASE_PROJECT_REF="REEMPLAZA_PROJECT_REF"
export SUPABASE_ACCESS_TOKEN="REEMPLAZA_ACCESS_TOKEN_CLI"
export SUPABASE_DB_PASSWORD="REEMPLAZA_PASSWORD_DB"

# Secrets requeridos por Edge Functions
export SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
# Supabase inyecta los mapas SUPABASE_PUBLISHABLE_KEYS y SUPABASE_SECRET_KEYS
# en las Edge Functions. No copies ni configures claves service_role.
export SUPABASE_PUBLISHABLE_KEY="REEMPLAZA_PUBLISHABLE_KEY_MODERNA"

# IA/capacitaciones/chat: configura tu propia API key de OpenAI o Gemini
# por empresa en Configuración > IA. Las llamadas son directas al proveedor.

# Requerido para correos/notificaciones.
export RESEND_API_KEY="REEMPLAZA_RESEND_API_KEY"
