#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source .env.deploy

supabase functions deploy ai-chat --no-verify-jwt
supabase functions deploy complete-onboarding --no-verify-jwt
supabase functions deploy extract-pdf --no-verify-jwt
supabase functions deploy generate-training --no-verify-jwt
supabase functions deploy generate-training-audio --no-verify-jwt
supabase functions deploy generate-training-avatar --no-verify-jwt
supabase functions deploy generate-training-media --no-verify-jwt
supabase functions deploy generate-training-video --no-verify-jwt
supabase functions deploy get-session-info --no-verify-jwt
supabase functions deploy invite-user --no-verify-jwt
supabase functions deploy lookup-user-by-email --no-verify-jwt
supabase functions deploy notify-contract-preaviso --no-verify-jwt
supabase functions deploy notify-incapacity-alerts --no-verify-jwt
supabase functions deploy notify-pending-terminations --no-verify-jwt
supabase functions deploy notify-requisition-approver --no-verify-jwt
supabase functions deploy send-candidate-thanks --no-verify-jwt

echo "Edge Functions desplegadas."
