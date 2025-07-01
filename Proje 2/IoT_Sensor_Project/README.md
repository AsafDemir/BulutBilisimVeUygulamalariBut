# IoT Sensor Project - MongoDB Version

Bu proje, gerçek zamanlı IoT sensör verilerini simüle eden, MQTT üzerinden ileten ve MongoDB Atlas'ta saklayan bir sistemdir. Google Cloud Pub/Sub entegrasyonu ile bulut tabanlı veri işleme desteği sunar ve hocanın istediği **Gerçek Zamanlı Veri Akışı ve İşleme** projesine uygundur.

## 🚀 Özellikler

- 🌡️ Sıcaklık ve nem sensörü simülasyonu
- 📡 MQTT üzerinden gerçek zamanlı veri iletimi
- 🗄️ MongoDB Atlas cloud veritabanı entegrasyonu
- ☁️ Google Cloud Pub/Sub gerçek zamanlı veri akışı
- 🔄 Otomatik yeniden bağlanma ve hata yönetimi
- 📊 Gerçek zamanlı veri izleme ve analiz
- 🎯 WebSocket/MQTT IoT cihaz simülasyonu
- 📈 Bulut platformlarında veri depolama ve analiz

## 📋 Teknoloji Stack

**Hocanın İstediği Teknolojiler:**
- **Backend**: Python
- **Protokol**: MQTT (IoT cihaz iletişimi)
- **Veritabanı**: MongoDB Atlas (gerçek zamanlı veri için uygun)
- **Bulut Platform**: Google Cloud (Pub/Sub, Cloud Run)

## 📋 Gereksinimler

- Python 3.8+
- MongoDB Atlas hesabı
- Google Cloud Platform hesabı (Pub/Sub için)
- Mosquitto MQTT Broker (test için)

## 🛠️ Kurulum

### 1. Projeyi Klonlayın:
```bash
git clone <repository-url>
cd IoT_Sensor_Project
```

### 2. Python Bağımlılıklarını Yükleyin:
```bash
pip install -r requirements.txt
```

### 3. Environment Variables Ayarlayın:
```bash
# Örnek dosyayı kopyalayın
cp env_example.txt .env

# .env dosyasını düzenleyin:
# - MONGODB_CONNECTION_STRING: MongoDB Atlas bağlantı stringi
# - MONGODB_PASSWORD: MongoDB şifreniz
# - GOOGLE_PROJECT_ID: Google Cloud proje ID'niz
```

### 4. MongoDB Veritabanını Hazırlayın:
```bash
python database_setup.py
```

## 🎯 Kullanım

### Temel Komutlar:

```bash
# 1. MongoDB kurulumunu test edin
python database_setup.py

# 2. Sensör simülatörünü başlatın (MQTT + Pub/Sub)
python sensor_simulator.py

# 3. MQTT veri tüketicisini başlatın
python data_consumer.py

# 4. Flask web servisini başlatın (Pub/Sub endpoint)
python main.py
```

### Sistem Test Senaryosu:

```bash
# Terminal 1: MQTT Data Consumer (MongoDB'ye kayıt)
python data_consumer.py

# Terminal 2: Sensör Simülatörü (veri üretimi)
python sensor_simulator.py

# Terminal 3: Web servisi (Cloud integration)
python main.py

# Terminal 4: Health check
curl http://localhost:8080/health
curl http://localhost:8080/stats
```

## 🔧 MongoDB Atlas Konfigürasyonu

### Connection String Formatı:
```
mongodb+srv://iotuser:<password>@iotcluster.2gxbpw7.mongodb.net/?retryWrites=true&w=majority&appName=IoTCluster
```

### Gerekli Koleksiyonlar:
- `temperature_readings`: Sensör verileri
- `sensors`: Sensör bilgileri

### Örnek Veri Formatı:
```json
{
  "_id": "ObjectId",
  "sensor_id": "TEMP_001",
  "temperature": 25.5,
  "humidity": 65.2,
  "location": "Laboratuvar",
  "timestamp": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-15T10:30:00Z",
  "sensor_type": "temperature",
  "unit": "°C"
}
```

## ☁️ Google Cloud Pub/Sub Entegrasyonu

### Pub/Sub Topic Konfigürasyonu:
```bash
# Topic adı: sensor-data
# Project ID: mqtt-veri-isleme
```

### Veri Akışı:
```
[IoT Sensör] → [MQTT] → [Data Consumer] → [MongoDB]
     ↓
[Pub/Sub] → [Cloud Run] → [MongoDB Atlas]
```

## 📊 Gerçek Zamanlı Veri Akışı

### 1. MQTT Protokolü:
- **Topic**: `sensors/temperature`
- **QoS**: 1 (At least once delivery)
- **Format**: JSON

### 2. WebSocket Benzeri Deneyim:
- Gerçek zamanlı veri akışı
- Otomatik yeniden bağlanma
- Düşük latency

### 3. Cloud Integration:
- Google Cloud Pub/Sub
- MongoDB Atlas
- Scalable architecture

## 📁 Proje Yapısı

```
IoT_Sensor_Project/
├── 📄 config.py              # MongoDB ve cloud konfigürasyonu
├── 🤖 sensor_simulator.py    # IoT sensör simülatörü
├── 📡 data_consumer.py       # MQTT veri tüketicisi
├── 🌐 main.py               # Flask web servisi (Pub/Sub endpoint)
├── 🗄️ database_setup.py     # MongoDB kurulum ve indeksler
├── 📦 requirements.txt      # Python bağımlılıkları
├── 🔧 env_example.txt       # Environment variables örneği
├── 📚 README.md            # Bu dosya
└── ☁️ deploy-scripts/       # Cloud deployment scripts
```

## 🔧 Sorun Giderme

### MongoDB Bağlantı Sorunları:
```bash
# Bağlantıyı test edin
python database_setup.py

# IP whitelist kontrolü
# MongoDB Atlas dashboard'da IP adresinizi ekleyin
```

### MQTT Sorunları:
```bash
# MQTT broker bağlantısını test edin
# config.py'da MQTT_BROKER_HOST ayarını kontrol edin
```

### Google Cloud Sorunları:
```bash
# Credentials dosyasını kontrol edin
# GOOGLE_APPLICATION_CREDENTIALS path'ini doğrulayın
```

## 📈 Sistem Mimarisi

```
┌─────────────────┐    MQTT     ┌──────────────────┐    MongoDB    ┌─────────────────┐
│   IoT Sensör    │ ──────────→ │  Data Consumer   │ ────────────→ │  MongoDB Atlas  │
│   Simülatörü    │             │                  │               │                 │
└─────────────────┘             └──────────────────┘               └─────────────────┘
         │                                                                    ↑
         │ Pub/Sub                                                           │
         ↓                                                                   │
┌─────────────────┐    HTTP     ┌──────────────────┐    MongoDB            │
│ Google Cloud    │ ──────────→ │   Flask Web      │ ──────────────────────┘
│    Pub/Sub      │             │    Service       │
└─────────────────┘             └──────────────────┘
```

## 🎯 Hocanın Gereksinimlerine Uygunluk

✅ **Gerçek Zamanlı Veri Akışı**: MQTT ve Pub/Sub ile sağlanıyor
✅ **IoT Cihaz Simülasyonu**: Sıcaklık sensörü simülatörü
✅ **MQTT Protokolü**: Pub/Sub patterns
✅ **MongoDB**: Gerçek zamanlı veri için uygun NoSQL veritabanı
✅ **Bulut Platformu**: Google Cloud entegrasyonu
✅ **Python Backend**: Tüm servisler Python ile yazıldı
✅ **Veri Analizi**: MongoDB aggregation ve indexing

## 📊 Örnek Çıktılar

### Sensör Verisi:
```json
{
  "sensor_id": "TEMP_001",
  "temperature": 23.45,
  "humidity": 67.2,
  "location": "Laboratuvar",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Web Service Response:
```json
{
  "status": "success",
  "service": "IoT Sensor Cloud Processor - MongoDB",
  "database": "MongoDB Atlas",
  "cloud_mode": true
}
```

## 🚀 Deployment

### Google Cloud Run:
```bash
# Cloud Run'a deploy için
./deploy-cloud-run.sh
```

### Local Development:
```bash
# Tüm servisleri başlat
python main.py &
python sensor_simulator.py &
python data_consumer.py &
```

## 📝 Lisans

Bu proje eğitim amaçlı geliştirilmiştir ve **Gerçek Zamanlı Veri Akışı ve İşleme** projesi gereksinimlerini karşılar.

---

**Not**: Bu proje hocanın istediği "WebSocket/MQTT ile IoT cihazlarından veri toplama ve bulut platformlarında analiz" gereksinimlerini tamamen karşılar.