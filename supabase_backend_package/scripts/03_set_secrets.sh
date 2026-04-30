#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source .env.deploy

supabase secrets set   SUPABASE_URL="$SUPABASE_URL"   SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"   SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY"   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"   LOVABLE_API_KEY="$LOVABLE_API_KEY"   RESEND_API_KEY="$RESEND_API_KEY"

echo "Secrets configurados."
