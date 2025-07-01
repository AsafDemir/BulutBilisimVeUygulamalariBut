#!/bin/bash

# IoT Sensor Project - Cloud Run Deployment Script
# Bu script uygulamayı Google Cloud Run'a deploy eder

set -e  # Hata durumunda script'i durdur

echo "🚀 IoT Sensor Project - Cloud Run Deployment başlatılıyor..."

# Değişkenler
PROJECT_ID="mqtt-veri-isleme"
SERVICE_NAME="iot-sensor-processor"
REGION="europe-west1"
ENV_VARS_FILE="env-vars.yaml"

# Google Cloud CLI'nin yüklü olup olmadığını kontrol et
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI yüklü değil. Lütfen önce gcloud CLI'yi yükleyin."
    exit 1
fi

# Proje ayarını kontrol et
echo "📋 Google Cloud projesi ayarlanıyor: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Environment variables dosyasının varlığını kontrol et
if [ ! -f "$ENV_VARS_FILE" ]; then
    echo "❌ Environment variables dosyası bulunamadı: $ENV_VARS_FILE"
    exit 1
fi

# Google Cloud credentials dosyasının varlığını kontrol et
if [ ! -f "mqtt-veri-isleme-d7424e378762.json" ]; then
    echo "⚠️  Warning: Google Cloud credentials dosyası bulunamadı"
    echo "   Servis hesabı kimlik doğrulaması çalışmayabilir"
fi

# Requirements.txt dosyasının varlığını kontrol et
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt dosyası bulunamadı"
    exit 1
fi

echo "🔨 Cloud Run servisi deploy ediliyor..."

# Cloud Run'a deploy et
gcloud run deploy $SERVICE_NAME \
    --source . \
    --env-vars-file $ENV_VARS_FILE \
    --region $REGION \
    --allow-unauthenticated \
    --platform managed \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --timeout 300 \
    --port 8080

if [ $? -eq 0 ]; then
    echo "✅ Deployment başarılı!"
    
    # Servis URL'ini al
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    
    echo ""
    echo "🌐 Servis URL: $SERVICE_URL"
    echo "🔍 Health Check: $SERVICE_URL/health"
    echo "📊 Stats: $SERVICE_URL/stats"
    echo ""
    echo "📋 Pub/Sub Push Subscription için endpoint:"
    echo "   $SERVICE_URL/"
    echo ""
    echo "🔧 Logları görüntülemek için:"
    echo "   gcloud logs tail --follow --project=$PROJECT_ID --resource-type=cloud_run_revision --resource-labels=service_name=$SERVICE_NAME"
    
else
    echo "❌ Deployment başarısız!"
    exit 1
fi 