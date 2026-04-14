# Script para ejecutar Spring Boot con Oracle Database
# Establece las variables de entorno necesarias para la conexión a Oracle

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$walletPath = Join-Path $scriptPath "wallet"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Iniciando MyTodoList con Oracle Database" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Wallet Path: $walletPath" -ForegroundColor Yellow
Write-Host ""

# Establecer variables de entorno
$env:TNS_ADMIN = $walletPath
$env:ORACLE_HOME = ""  # Se usa la wallet en su lugar

Write-Host "TNS_ADMIN establecido a: $env:TNS_ADMIN" -ForegroundColor Cyan

# Ejecutar Maven Spring Boot
Write-Host ""
Write-Host "Ejecutando: mvn spring-boot:run" -ForegroundColor Cyan
Write-Host ""

mvn spring-boot:run

# Si Maven falla, mostrar instrucciones alternativas
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Error al ejecutar con Maven. Intentando compilar primero..." -ForegroundColor Yellow
    mvn clean compile spring-boot:run
}
