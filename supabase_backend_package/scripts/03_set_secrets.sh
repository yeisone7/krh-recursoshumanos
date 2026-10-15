#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source .env.deploy

# Las claves modernas de Supabase son inyectadas por la plataforma.
supabase secrets set RESEND_API_KEY="$RESEND_API_KEY"

echo "Secrets configurados."
