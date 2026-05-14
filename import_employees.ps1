
# Script para importar empleados pendientes (parts 6-18)
# Requiere: SUPABASE_SERVICE_KEY en variable de entorno o ingresada manualmente

$PROJECT_REF = "qmfyecdeiupgscegxbmo"
$BASE_URL = "https://$PROJECT_REF.supabase.co"

# Solicita la service key si no está en el entorno
if (-not $env:SUPABASE_SERVICE_KEY) {
    $SERVICE_KEY = Read-Host "Ingresa la Service Role Key de Supabase (la encuentras en Settings > API)"
} else {
    $SERVICE_KEY = $env:SUPABASE_SERVICE_KEY
}

$HEADERS = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "params=single-object"
}

# Partes a ejecutar (6-18, ya que 1-5 están completas)
$PARTS = 6..18

$BATCH_DIR = "c:\Users\YEISON\Proyectos AI\krh-recursoshumanos\combined_batches"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " IMPORTACION DE EMPLEADOS PETROCASINOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Primero verificar estado actual
Write-Host "Verificando estado actual de la BD..." -ForegroundColor Yellow
$countQuery = @{ query = "SELECT COUNT(*) as total FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304';" } | ConvertTo-Json
try {
    $countResult = Invoke-RestMethod -Uri "$BASE_URL/rest/v1/rpc/query" -Method POST -Headers $HEADERS -Body $countQuery -ErrorAction Stop
    Write-Host "Empleados actuales: $($countResult.total)" -ForegroundColor Green
} catch {
    Write-Host "Nota: Verificacion previa no disponible via RPC. Continuando con importacion..." -ForegroundColor Yellow
}

$totalSuccess = 0
$totalFailed = 0

foreach ($part in $PARTS) {
    $filePath = "$BATCH_DIR\part_$part.sql"
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  [SKIP] part_$part.sql no encontrado" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "`n[PROCESANDO] part_$part.sql..." -ForegroundColor Cyan
    
    $sqlContent = Get-Content $filePath -Raw -Encoding UTF8
    
    # Usar el endpoint de SQL de Supabase
    $body = @{ query = $sqlContent } | ConvertTo-Json -Depth 5
    
    try {
        $response = Invoke-RestMethod `
            -Uri "$BASE_URL/pg/query" `
            -Method POST `
            -Headers $HEADERS `
            -Body $body `
            -TimeoutSec 120 `
            -ErrorAction Stop
        
        Write-Host "  [OK] part_$part completada exitosamente" -ForegroundColor Green
        $totalSuccess++
        
    } catch {
        $errorMsg = $_.Exception.Message
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        Write-Host "  [ERROR] part_$part falló (HTTP $statusCode): $errorMsg" -ForegroundColor Red
        
        # Intentar con endpoint alternativo
        Write-Host "  Intentando con endpoint alternativo..." -ForegroundColor Yellow
        try {
            $altResponse = Invoke-RestMethod `
                -Uri "$BASE_URL/rest/v1/rpc/exec_sql" `
                -Method POST `
                -Headers $HEADERS `
                -Body $body `
                -TimeoutSec 120 `
                -ErrorAction Stop
            
            Write-Host "  [OK] part_$part completada via endpoint alternativo" -ForegroundColor Green
            $totalSuccess++
        } catch {
            Write-Host "  [FAIL] part_$part falló definitivamente: $($_.Exception.Message)" -ForegroundColor Red
            $totalFailed++
        }
    }
    
    # Pequeña pausa entre partes
    Start-Sleep -Milliseconds 500
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " RESUMEN DE IMPORTACION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Partes exitosas: $totalSuccess" -ForegroundColor Green
Write-Host " Partes fallidas: $totalFailed" -ForegroundColor $(if ($totalFailed -gt 0) { "Red" } else { "Green" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($totalFailed -gt 0) {
    Write-Host "ADVERTENCIA: Algunas partes fallaron. Verifica el SQL editor de Supabase para ejecutarlas manualmente." -ForegroundColor Red
    Write-Host "URL del editor: https://supabase.com/dashboard/project/$PROJECT_REF/editor" -ForegroundColor Yellow
}
