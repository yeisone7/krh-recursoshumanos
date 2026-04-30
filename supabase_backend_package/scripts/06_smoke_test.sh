#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source .env.deploy

curl -sS "${SUPABASE_URL}/functions/v1/get-session-info"   -H "apikey: ${SUPABASE_ANON_KEY}"   -H "Content-Type: application/json"   -d '{}' | cat

echo "
Smoke test ejecutado. Si ves JSON o respuesta controlada, la función responde."
