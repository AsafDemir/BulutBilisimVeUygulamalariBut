# IoT Sensor Project - Cloud Run Deployment Script (PowerShell)
# Bu script uygulamayı Google Cloud Run'a deploy eder

param(
    [string]$ProjectId = "mqtt-veri-isleme",
    [string]$ServiceName = "iot-sensor-processor",
    [string]$Region = "europe-west1",
    [string]$EnvVarsFile = "env-vars.yaml"
)

Write-Host "🚀 IoT Sensor Project - Cloud Run Deployment başlatılıyor..." -ForegroundColor Green

# Google Cloud CLI'nin yüklü olup olmadığını kontrol et
try {
    $gcloudVersion = gcloud version 2>$null
    if (-not $gcloudVersion) {
        throw "gcloud not found"
    }
} catch {
    Write-Host "❌ Google Cloud CLI yüklü değil. Lütfen önce gcloud CLI'yi yükleyin." -ForegroundColor Red
    exit 1
}

# Proje ayarını kontrol et
Write-Host "📋 Google Cloud projesi ayarlanıyor: $ProjectId" -ForegroundColor Yellow
gcloud config set project $ProjectId

# Environment variables dosyasının varlığını kontrol et
if (-not (Test-Path $EnvVarsFile)) {
    Write-Host "❌ Environment variables dosyası bulunamadı: $EnvVarsFile" -ForegroundColor Red
    exit 1
}

# Google Cloud credentials dosyasının varlığını kontrol et
if (-not (Test-Path "mqtt-veri-isleme-d7424e378762.json")) {
    Write-Host "⚠️  Warning: Google Cloud credentials dosyası bulunamadı" -ForegroundColor Yellow
    Write-Host "   Servis hesabı kimlik doğrulaması çalışmayabilir" -ForegroundColor Yellow
}

# Requirements.txt dosyasının varlığını kontrol et
if (-not (Test-Path "requirements.txt")) {
    Write-Host "❌ requirements.txt dosyası bulunamadı" -ForegroundColor Red
    exit 1
}

Write-Host "🔨 Cloud Run servisi deploy ediliyor..." -ForegroundColor Blue

# Cloud Run'a deploy et
$deployCommand = @(
    "gcloud", "run", "deploy", $ServiceName,
    "--source", ".",
    "--env-vars-file", $EnvVarsFile,
    "--region", $Region,
    "--allow-unauthenticated",
    "--platform", "managed",
    "--memory", "512Mi",
    "--cpu", "1",
    "--max-instances", "10",
    "--timeout", "300",
    "--port", "8080"
)

try {
    & $deployCommand[0] $deployCommand[1..($deployCommand.Length-1)]
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment başarılı!" -ForegroundColor Green
        
        # Servis URL'ini al
        $serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"
        
        Write-Host ""
        Write-Host "🌐 Servis URL: $serviceUrl" -ForegroundColor Cyan
        Write-Host "🔍 Health Check: $serviceUrl/health" -ForegroundColor Cyan
        Write-Host "📊 Stats: $serviceUrl/stats" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📋 Pub/Sub Push Subscription için endpoint:" -ForegroundColor Yellow
        Write-Host "   $serviceUrl/" -ForegroundColor White
        Write-Host ""
        Write-Host "🔧 Logları görüntülemek için:" -ForegroundColor Yellow
        Write-Host "   gcloud logs tail --follow --project=$ProjectId --resource-type=cloud_run_revision --resource-labels=service_name=$ServiceName" -ForegroundColor White
        
    } else {
        Write-Host "❌ Deployment başarısız!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Deployment sırasında hata oluştu: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 