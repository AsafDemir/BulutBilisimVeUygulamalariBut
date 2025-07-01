# 🚗 Smart Parking - IoT Tabanlı Gerçek Zamanlı Doluluk İzleme Sistemi

![AWS](https://img.shields.io/badge/AWS-IoT%20Core-orange)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![MQTT](https://img.shields.io/badge/Protocol-MQTT-green)
![DynamoDB](https://img.shields.io/badge/Database-DynamoDB-yellow)

## 📋 Proje Hakkında

Bu proje, **Bulut Bilişim Uygulamaları** dersi kapsamında geliştirilmiş akıllı şehir otopark yönetim sistemidir. Sistem, 10 farklı otopark alanının doluluk oranlarını simüle edilmiş IoT cihazları aracılığıyla gerçek zamanlı olarak izler ve AWS bulut servislerinde işleyerek saklar.

### 🎯 Projenin Amacı

- 📡 IoT cihazlarından veri toplama ve analiz
- 🏙️ Akıllı şehir cihazlarının yönetimi ve raporlanması  
- 📊 Gerçek zamanlı verilerin görselleştirilmesi
- ☁️ AWS bulut servisleriyle entegrasyon

## 🏗️ Sistem Mimarisi

```
IoT Cihazları (Python MQTT) 
         ↓
    AWS IoT Core
         ↓
    AWS Lambda
         ↓
    AWS DynamoDB
         ↓
   Web Dashboard (Opsiyonel)
```

### 🧱 Teknoloji Katmanları

| Katman | Teknoloji |
|--------|-----------|
| **IoT Cihazı** | Python MQTT Simülatörü |
| **Veri Transferi** | MQTT Protokolü |
| **Bulut Platformu** | Amazon Web Services |
| **Karşılama** | AWS IoT Core |
| **İşleme** | AWS Lambda |
| **Veritabanı** | AWS DynamoDB |
| **Arayüz** | HTML + JavaScript (Chart.js) |

## 🔧 AWS Servis Yapılandırmaları

### ☁️ AWS IoT Core
- **Endpoint:** `a1lgienbj1oieq-ats.iot.eu-north-1.amazonaws.com`
- **MQTT Topic:** `parking/data`
- **Thing:** `SimulatedDevice01`
- **Policy:** `AllowAllIoT`
- **Rule:** `ParkingRule` → Lambda tetikleme

### ⚡ AWS Lambda
- **Fonksiyon:** `SaveParkingData`
- **Runtime:** Python 3.13
- **Görevi:** IoT verilerini DynamoDB'ye kaydetme
- **IAM:** DynamoDB yazma yetkisi

### 🗄️ AWS DynamoDB
- **Tablo:** `ParkingData`
- **Partition Key:** `device_id` (string)
- **Sort Key:** `timestamp` (string)
- **Diğer Alanlar:** `location`, `occupancy_rate`

## 📦 Kurulum

### 1. Gereksinimler

```bash
# Python 3.8+ gerekli
python --version

# Bağımlılıkları yükle
pip install -r requirements.txt
```

### 2. AWS Sertifikaları

`certs/` klasörüne AWS IoT sertifikalarınızı yerleştirin:

```
certs/
├── AmazonRootCA1.pem
├── certificate.pem.crt
└── private.pem.key
```

### 3. AWS Servisleri Kurulumu

#### DynamoDB Tablosu Oluşturma:
```bash
aws dynamodb create-table \
    --table-name ParkingData \
    --attribute-definitions \
        AttributeName=device_id,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=device_id,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST
```

#### Lambda Fonksiyonu Deploy:
```bash
# lambda_function.py dosyasını AWS Lambda'ya yükleyin
# IAM rolüne DynamoDB yazma yetkisi verin
```

#### IoT Rule Oluşturma:
```json
{
  "ruleName": "ParkingRule",
  "sql": "SELECT * FROM 'parking/data'",
  "actions": [{
    "lambda": {
      "functionArn": "arn:aws:lambda:region:account:function:SaveParkingData"
    }
  }]
}
```

## 🚀 Kullanım

### MQTT Simülasyonunu Başlatma

```bash
python mqtt_simulator.py
```

### Konfigürasyon Kontrolü

```bash
python config.py
```

### Web Arayüzü (Opsiyonel)

```bash
# Frontend klasöründeki index.html dosyasını açın
cd frontend
python -m http.server 8000
```

## 📊 Simüle Edilen Cihazlar

| Device ID | Konum | Kapasite | Özellik |
|-----------|-------|----------|---------|
| PARK01 | Merkez | 150 | Şehir merkezi |
| PARK02 | AVM | 300 | Alışveriş merkezi |
| PARK03 | Hastane | 200 | Sağlık kampüsü |
| PARK04 | Sanayi | 100 | Endüstri bölgesi |
| PARK05 | Üniversite | 250 | Akademik kampüs |
| PARK06 | Stadium | 500 | Spor kompleksi |
| PARK07 | Havaalanı | 1000 | Uluslararası terminal |
| PARK08 | İş Merkezi | 400 | Ticari bölge |
| PARK09 | Sahil | 80 | Rekreasyon alanı |
| PARK10 | Tren Garı | 300 | Ulaşım merkezi |

## 📈 Veri Formatı

```json
{
  "device_id": "PARK01",
  "location": "Merkez",
  "occupancy_rate": 75,
  "timestamp": "2025-01-30T12:00:00Z",
  "total_spaces": 150,
  "available_spaces": 37
}
```

## 🔍 Sistem Özellikleri

### ✅ Gerçekleştirilen Özellikler
- [x] IoT cihaz simülasyonu
- [x] MQTT protokolü ile veri iletimi
- [x] AWS IoT Core entegrasyonu
- [x] Lambda fonksiyonu ile veri işleme
- [x] DynamoDB'de veri depolama
- [x] Gerçek zamanlı simülasyon
- [x] Çoklu cihaz desteği
- [x] SSL/TLS güvenlik

### 🔮 Genişletme Olanakları
- [ ] Web dashboard geliştirme
- [ ] Alarm sistemi
- [ ] Veri analizi ve rapor
- [ ] Mobil uygulama
- [ ] Grafik görselleştirme
- [ ] Rezervasyon sistemi

## 📁 Proje Yapısı

```
SmartParking_IoT_AWS_Project/
├── mqtt_simulator.py          # Ana MQTT simülatörü
├── lambda_function.py         # AWS Lambda fonksiyonu
├── config.py                  # Konfigürasyon ayarları
├── requirements.txt           # Python bağımlılıkları
├── README.md                  # Proje dokumentasyonu
├── certs/                     # AWS IoT sertifikaları
│   ├── AmazonRootCA1.pem
│   ├── certificate.pem.crt
│   └── private.pem.key
├── frontend/                  # Web arayüzü (opsiyonel)
│   ├── index.html
│   ├── style.css
│   └── script.js
└── aws_config/               # AWS yapılandırma dosyaları
    ├── iot_policy.json
    ├── lambda_iam_role.json
    └── dynamodb_schema.json
```

## 🛠️ Sorun Giderme

### Bağlantı Sorunları
```bash
# Sertifika yollarını kontrol edin
ls -la certs/

# AWS endpoint'i test edin
ping a1lgienbj1oieq-ats.iot.eu-north-1.amazonaws.com
```

### Lambda Hataları
```bash
# CloudWatch loglarını kontrol edin
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/SaveParkingData
```

### DynamoDB Erişim
```bash
# Tablo durumunu kontrol edin
aws dynamodb describe-table --table-name ParkingData
```

## 📞 Destek

Bu proje **Bulut Bilişim Uygulamaları** dersi kapsamında akademik amaçla geliştirilmiştir.

### 📚 Kaynaklar
- [AWS IoT Core Dokumentasyonu](https://docs.aws.amazon.com/iot/)
- [Paho MQTT Python](https://pypi.org/project/paho-mqtt/)
- [AWS Lambda Kılavuzu](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Geliştirici Kılavuzu](https://docs.aws.amazon.com/dynamodb/)

## 📄 Lisans

Bu proje eğitim amaçlı geliştirilmiştir ve MIT lisansı altında sunulmaktadır.

---

**🎓 Geliştirici:** Bulut Bilişim Uygulamaları Dersi  
**📅 Tarih:** Ocak 2025  
**🏫 Kurum:** Üniversite Bilgisayar Mühendisliği  
**⭐ Sürüm:** 1.0.0 