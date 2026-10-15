$ErrorActionPreference = "Stop"

$required = @(
  "SUPABASE_PROJECT_REF",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD"
)

foreach ($name in $required) {
  if (-not [Environment]::GetEnvironmentVariable($name)) {
    throw "Missing required environment variable: $name"
  }
}

$env:SUPABASE_URL="https://$($env:SUPABASE_PROJECT_REF).supabase.co"

Write-Host "Logging in..."
npx supabase login --token $env:SUPABASE_ACCESS_TOKEN

Write-Host "Linking project..."
npx supabase link --project-ref $env:SUPABASE_PROJECT_REF --password $env:SUPABASE_DB_PASSWORD

Write-Host "Applying database migrations..."
npx supabase db push --include-all --password $env:SUPABASE_DB_PASSWORD

Write-Host "Setting secrets..."
# Supabase injects SUPABASE_PUBLISHABLE_KEYS and SUPABASE_SECRET_KEYS itself.
npx supabase secrets set LOVABLE_API_KEY="$env:LOVABLE_API_KEY" RESEND_API_KEY="$env:RESEND_API_KEY"

Write-Host "Deploying Edge Functions..."
$functions = @(
    "ai-chat",
    "complete-onboarding",
    "extract-pdf",
    "generate-training",
    "generate-training-audio",
    "generate-training-avatar",
    "generate-training-media",
    "generate-training-video",
    "get-session-info",
    "invite-user",
    "lookup-user-by-email",
    "notify-contract-preaviso",
    "notify-incapacity-alerts",
    "notify-pending-terminations",
    "notify-requisition-approver",
    "send-candidate-thanks"
)

foreach ($func in $functions) {
    Write-Host "Deploying function: $func"
    npx supabase functions deploy $func --no-verify-jwt --project-ref $env:SUPABASE_PROJECT_REF
}

Write-Host "Deployment completed successfully!"
