# IoT Sensor Project - Cloud Run Deployment Rehberi

Bu rehber, IoT Sensor Project'i Google Cloud Run'a deploy etmek için gerekli adımları açıklar.

## 📋 Ön Gereksinimler

1. **Google Cloud CLI** yüklü olmalı
2. **Google Cloud Project** oluşturulmuş olmalı (`mqtt-veri-isleme`)
3. **Cloud SQL PostgreSQL** instance'ı hazır olmalı
4. **Pub/Sub Topic** oluşturulmuş olmalı (`sensor-data`)
5. **Service Account** ve credentials dosyası hazır olmalı

## 🔧 Deployment Dosyaları

### 1. `env-vars.yaml`
Cloud Run environment variables konfigürasyonu. Tüm çevresel değişkenler bu dosyada tanımlı.

### 2. `Dockerfile`
Cloud Run için container image tanımı.

### 3. `deploy-cloud-run.ps1` (Windows)
PowerShell deployment script'i.

### 4. `deploy-cloud-run.sh` (Linux/Mac)
Bash deployment script'i.

## 🚀 Deployment Adımları

### Windows (PowerShell)
```powershell
# Deployment script'ini çalıştır
.\deploy-cloud-run.ps1
```

### Linux/Mac (Bash)
```bash
# Script'i executable yap
chmod +x deploy-cloud-run.sh

# Deployment script'ini çalıştır
./deploy-cloud-run.sh
```

### Manuel Deployment
```bash
# Google Cloud projesi ayarla
gcloud config set project mqtt-veri-isleme

# Cloud Run'a deploy et
gcloud run deploy iot-sensor-processor \
    --source . \
    --env-vars-file env-vars.yaml \
    --region europe-west1 \
    --allow-unauthenticated \
    --platform managed \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --timeout 300 \
    --port 8080
```

## 🔍 Deployment Sonrası Kontroller

### 1. Health Check
```bash
curl https://YOUR_SERVICE_URL/health
```

### 2. Stats Endpoint
```bash
curl https://YOUR_SERVICE_URL/stats
```

### 3. Ana Endpoint (GET)
```bash
curl https://YOUR_SERVICE_URL/
```

## 📊 Pub/Sub Integration

Deployment sonrası Pub/Sub Push Subscription oluşturun:

```bash
gcloud pubsub subscriptions create sensor-data-subscription \
    --topic=sensor-data \
    --push-endpoint=https://YOUR_SERVICE_URL/ \
    --ack-deadline=60
```

## 🔧 Logları İzleme

```bash
# Real-time log izleme
gcloud logs tail --follow \
    --project=mqtt-veri-isleme \
    --resource-type=cloud_run_revision \
    --resource-labels=service_name=iot-sensor-processor

# Son 100 log kaydı
gcloud logs read \
    --project=mqtt-veri-isleme \
    --resource-type=cloud_run_revision \
    --resource-labels=service_name=iot-sensor-processor \
    --limit=100
```

## ⚙️ Environment Variables

Aşağıdaki environment variables Cloud Run'da otomatik olarak ayarlanır:

### MQTT Ayarları
- `MQTT_BROKER_HOST`: 34.97.8.55
- `MQTT_BROKER_PORT`: 1883
- `MQTT_TOPIC`: sensors/temperature

### Database Ayarları
- `CLOUD_DB_ENABLED`: true
- `CLOUD_DB_HOST`: 34.97.8.55
- `CLOUD_DB_USER`: iot-sensor-db
- `CLOUD_DB_PASSWORD`: 1234

### Google Cloud Ayarları
- `GOOGLE_PROJECT_ID`: mqtt-veri-isleme
- `GOOGLE_PUBSUB_TOPIC`: sensor-data
- `GOOGLE_APPLICATION_CREDENTIALS`: mqtt-veri-isleme-d7424e378762.json

## 🛠️ Troubleshooting

### 1. Database Bağlantı Sorunları
- Cloud SQL instance'ının çalıştığını kontrol edin
- Network ayarlarını kontrol edin
- Kullanıcı adı/şifre doğruluğunu kontrol edin

### 2. Pub/Sub Mesaj İşleme Sorunları
- Service Account permissions kontrol edin
- Credentials dosyasının doğru yüklendiğini kontrol edin
- Log'larda JSON/Base64 decode hatalarını kontrol edin

### 3. 500 Internal Server Error
- Environment variables'ların doğru ayarlandığını kontrol edin
- Health check endpoint'ini test edin
- Cloud Run logs'ları inceleyin

## 📈 Monitoring

### Cloud Run Metrics
- Request count
- Request latency
- Error rate
- Memory usage
- CPU usage

### Custom Metrics
- Database connection status
- Processed message count
- Error rates by type

## 🔄 Güncelleme

Kod değişikliklerinden sonra yeniden deploy etmek için:

```bash
# Aynı deployment komutunu tekrar çalıştır
./deploy-cloud-run.ps1
```

Cloud Run otomatik olarak yeni revision oluşturacak ve traffic'i yeni versiyona yönlendirecektir.

## 🔒 Güvenlik

- Service Account minimum gerekli permissions'a sahip olmalı
- Credentials dosyası güvenli şekilde saklanmalı
- Environment variables'da hassas bilgiler için Secret Manager kullanılabilir
- Cloud Run servisi authentication gerektirebilir (production için önerilir) 