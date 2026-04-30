$ErrorActionPreference = "Stop"

$env:SUPABASE_PROJECT_REF="qmfyecdeiupgscegxbmo"
$env:SUPABASE_ACCESS_TOKEN="sbp_6643901794c965fed01b0a045ee1094c149bc4cc"
$env:SUPABASE_DB_PASSWORD="KIVVKLwfk8tFQkJT"
$env:SUPABASE_URL="https://$($env:SUPABASE_PROJECT_REF).supabase.co"
$env:SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZnllY2RlaXVwZ3NjZWd4Ym1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTc0MTMsImV4cCI6MjA5MzA3MzQxM30.81ahjpaqI3CoQG0ChiZcH7phTnHMQkN1hsfldb0FxwY"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZnllY2RlaXVwZ3NjZWd4Ym1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ5NzQxMywiZXhwIjoyMDkzMDczNDEzfQ.8hwIhKN9Ukw7OFdLCEQwCGSkhLDmpVXIpCZmp9PxXPU"
$env:SUPABASE_PUBLISHABLE_KEY=$env:SUPABASE_ANON_KEY
$env:LOVABLE_API_KEY="dummy"
$env:RESEND_API_KEY="re_Qa51tJBH_8nCaybXZwYNBbi2E1JjyfC6U"

Write-Host "Logging in..."
npx supabase login --token $env:SUPABASE_ACCESS_TOKEN

Write-Host "Linking project..."
npx supabase link --project-ref $env:SUPABASE_PROJECT_REF --password $env:SUPABASE_DB_PASSWORD

Write-Host "Applying database migrations..."
npx supabase db push --include-all --password $env:SUPABASE_DB_PASSWORD

Write-Host "Setting secrets..."
npx supabase secrets set SUPABASE_URL="$env:SUPABASE_URL" SUPABASE_ANON_KEY="$env:SUPABASE_ANON_KEY" SUPABASE_PUBLISHABLE_KEY="$env:SUPABASE_PUBLISHABLE_KEY" SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY" LOVABLE_API_KEY="$env:LOVABLE_API_KEY" RESEND_API_KEY="$env:RESEND_API_KEY"

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
