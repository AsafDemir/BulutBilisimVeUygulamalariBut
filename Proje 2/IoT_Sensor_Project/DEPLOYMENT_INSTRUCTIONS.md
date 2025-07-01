# Cloud Run Deployment Talimatları

## 🚀 Adım 1: Cloud Console'da Environment Variables Set Edin

1. **Cloud Run Console'a gidin**: https://console.cloud.google.com/run
2. **pubsub-function** servisini seçin
3. **"Edit and deploy new revision"** butonuna tıklayın
4. **"Variables & Secrets"** sekmesine gidin
5. Aşağıdaki environment variables'ları ekleyin:

```
CLOUD_DB_ENABLED=true
CLOUD_DB_HOST=34.97.8.55
CLOUD_DB_PORT=5432
CLOUD_DB_NAME=iot_sensors
CLOUD_DB_USER=iot-sensor-db
CLOUD_DB_PASSWORD=1234
```

## 📁 Adım 2: Yeni Kodu Deploy Edin

### Seçenek A: Cloud Console Upload
1. **"Source"** sekmesinde **"Upload"** seçin
2. Aşağıdaki dosyaları ZIP olarak upload edin:
   - `main.py` (güncellenmiş)
   - `requirements.txt` (güncellenmiş)

### Seçenek B: Source Repository
1. **"Source"** sekmesinde repository'yi seçin
2. En son commit'i seçin

## ⚙️ Adım 3: Service Ayarları

1. **Container** sekmesinde:
   - **Port**: 8080 ✅
   - **Memory**: 512Mi ✅
   - **CPU**: 1 ✅

2. **Networking** sekmesinde:
   - **Allow unauthenticated invocations**: ✅ Enabled

## 🔗 Adım 4: Pub/Sub Subscription Güncellemesi

1. **Pub/Sub Console**: https://console.cloud.google.com/cloudpubsub
2. **Subscriptions** → **cloudrun-subscriber**
3. **Push endpoint**: `https://pubsub-function-738571915067.europe-west1.run.app/`
4. **Authentication**: None (unauthenticated)

## ✅ Adım 5: Test

Deploy tamamlandıktan sonra:

```bash
python test_pubsub.py
```

## 📊 Beklenen Sonuç

- Health check: 200 OK
- Stats: Veritabanı bilgileri
- Pub/Sub test: Başarılı veri kaydı

## 🔍 Troubleshooting

Eğer hala hata alırsanız:

1. **Logs kontrol**: Cloud Run → Logs sekmesi
2. **Environment variables kontrol**: Doğru set edilmiş mi?
3. **Database erişim**: 34.97.8.55:5432 erişilebilir mi? 