"""
Smart Parking IoT Projesi - Konfigürasyon Ayarları
Bu dosya tüm proje ayarlarını merkezi olarak yönetir.
"""

import os
import subprocess
import webbrowser
import time
import threading
from datetime import datetime

class AWSConfig:
    """AWS servisleri konfigürasyonu"""
    
    # AWS IoT Core ayarları
    IOT_ENDPOINT = "a1lgienbj1oieq-ats.iot.eu-north-1.amazonaws.com"
    IOT_PORT = 8883
    IOT_TOPIC = "parking/data"
    IOT_THING_NAME = "SimulatedDevice01"
    
    # AWS bölgesi
    AWS_REGION = "eu-north-1"  # Stockholm
    
    # DynamoDB ayarları
    DYNAMODB_TABLE_NAME = "ParkingData"
    
    # Lambda fonksiyon ayarları
    LAMBDA_FUNCTION_NAME = "SaveParkingData"
    
    # IoT Rule ayarları
    IOT_RULE_NAME = "ParkingRule"
    IOT_RULE_SQL = "SELECT * FROM 'parking/data'"

class CertificateConfig:
    """SSL sertifika ayarları"""
    
    # Sertifika klasörü
    CERT_DIR = "./certs"
    
    # Sertifika dosya isimleri
    CA_FILE = "AmazonRootCA1.pem"
    CERT_FILE = "certificate.pem.crt"
    KEY_FILE = "private.pem.key"
    
    # Tam dosya yolları
    @classmethod
    def get_ca_path(cls):
        return os.path.join(cls.CERT_DIR, cls.CA_FILE)
    
    @classmethod
    def get_cert_path(cls):
        return os.path.join(cls.CERT_DIR, cls.CERT_FILE)
    
    @classmethod
    def get_key_path(cls):
        return os.path.join(cls.CERT_DIR, cls.KEY_FILE)

class DeviceConfig:
    """IoT cihaz ayarları"""
    
    # Otopark cihazları ve konumları
    PARKING_DEVICES = {
        "PARK01": {
            "location": "Merkez",
            "max_capacity": 150,
            "coordinates": {"lat": 41.0082, "lng": 28.9784}  # İstanbul
        },
        "PARK02": {
            "location": "AVM",
            "max_capacity": 300,
            "coordinates": {"lat": 41.0150, "lng": 28.9850}
        },
        "PARK03": {
            "location": "Hastane",
            "max_capacity": 200,
            "coordinates": {"lat": 41.0200, "lng": 28.9900}
        },
        "PARK04": {
            "location": "Sanayi",
            "max_capacity": 100,
            "coordinates": {"lat": 41.0300, "lng": 29.0000}
        },
        "PARK05": {
            "location": "Üniversite",
            "max_capacity": 250,
            "coordinates": {"lat": 41.0400, "lng": 29.0100}
        },
        "PARK06": {
            "location": "Stadium",
            "max_capacity": 500,
            "coordinates": {"lat": 41.0500, "lng": 29.0200}
        },
        "PARK07": {
            "location": "Havaalanı",
            "max_capacity": 1000,
            "coordinates": {"lat": 40.9769, "lng": 29.3155}  # İstanbul Havalimanı
        },
        "PARK08": {
            "location": "İş Merkezi",
            "max_capacity": 400,
            "coordinates": {"lat": 41.0600, "lng": 29.0300}
        },
        "PARK09": {
            "location": "Sahil",
            "max_capacity": 80,
            "coordinates": {"lat": 41.0700, "lng": 29.0400}
        },
        "PARK10": {
            "location": "Tren Garı",
            "max_capacity": 300,
            "coordinates": {"lat": 41.0800, "lng": 29.0500}
        }
    }
    
    # Veri gönderme aralığı (saniye)
    DATA_SEND_INTERVAL = 30
    
    # Simülasyon ayarları
    SIMULATION_SETTINGS = {
        "random_delay_range": (-5, 5),  # Saniye
        "occupancy_variation": 10,      # Yüzde
        "peak_hours": {
            "morning": (7, 9),
            "evening": (17, 19)
        },
        "off_peak_multiplier": 0.6
    }

class WebConfig:
    """Web arayüz ayarları"""
    
    # Flask ayarları
    FLASK_HOST = "0.0.0.0"
    FLASK_PORT = 5000
    FLASK_DEBUG = True
    
    # Frontend ayarları
    STATIC_FOLDER = "frontend/static"
    TEMPLATE_FOLDER = "frontend/templates"
    
    # Grafik ayarları
    CHART_COLORS = [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
        "#9966FF", "#FF9F40", "#FF6384", "#C9CBCF",
        "#4BC0C0", "#FF6384"
    ]

class LoggingConfig:
    """Loglama ayarları"""
    
    # Log seviyeleri
    LOG_LEVEL = "INFO"
    
    # Log formatı
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Log dosya ayarları
    LOG_FILE = "smart_parking.log"
    MAX_LOG_SIZE = 10 * 1024 * 1024  # 10 MB
    BACKUP_COUNT = 5

class ProjectInfo:
    """Proje bilgileri"""
    
    PROJECT_NAME = "Smart Parking IoT System"
    PROJECT_VERSION = "1.0.0"
    PROJECT_AUTHOR = "Bulut Bilişim Uygulamaları Dersi"
    PROJECT_DESCRIPTION = "AWS tabanlı gerçek zamanlı otopark doluluk izleme sistemi"
    
    # Proje oluşturma tarihi
    CREATION_DATE = datetime.now().strftime("%Y-%m-%d")
    
    # Desteklenen özellikler
    FEATURES = [
        "MQTT tabanlı IoT veri toplama",
        "AWS IoT Core entegrasyonu",
        "DynamoDB veri depolama",
        "Lambda fonksiyonu ile veri işleme",
        "Gerçek zamanlı simülasyon",
        "Web tabanlı görselleştirme"
    ]

# Çevre değişkenleri için varsayılan değerler
ENV_DEFAULTS = {
    "AWS_REGION": AWSConfig.AWS_REGION,
    "IOT_ENDPOINT": AWSConfig.IOT_ENDPOINT,
    "DYNAMODB_TABLE": AWSConfig.DYNAMODB_TABLE_NAME,
    "LOG_LEVEL": LoggingConfig.LOG_LEVEL
}

def get_env_var(key, default=None):
    """Çevre değişkeni alma fonksiyonu"""
    return os.getenv(key, ENV_DEFAULTS.get(key, default))

def validate_config():
    """Konfigürasyon doğrulama fonksiyonu"""
    errors = []
    
    # Sertifika dosyalarını kontrol et
    cert_files = [
        CertificateConfig.get_ca_path(),
        CertificateConfig.get_cert_path(),
        CertificateConfig.get_key_path()
    ]
    
    for cert_file in cert_files:
        if not os.path.exists(cert_file):
            errors.append(f"Sertifika dosyası bulunamadı: {cert_file}")
    
    # AWS konfigürasyonunu kontrol et
    if not AWSConfig.IOT_ENDPOINT:
        errors.append("AWS IoT endpoint tanımlanmamış")
    
    if not AWSConfig.DYNAMODB_TABLE_NAME:
        errors.append("DynamoDB tablo adı tanımlanmamış")
    
    return errors

def start_web_server(port=8080):
    """Web sunucusunu başlat"""
    try:
        print(f"🌐 Web sunucusu başlatılıyor (Port: {port})...")
        
        # Frontend klasörünün varlığını kontrol et
        frontend_dir = "frontend"
        if not os.path.exists(frontend_dir):
            print(f"❌ '{frontend_dir}' klasörü bulunamadı!")
            return False
        
        # Web sunucusunu background'da başlat
        cmd = f"py -m http.server {port}"
        process = subprocess.Popen(
            cmd,
            shell=True,
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Kısa bekleme - sunucunun başlaması için
        time.sleep(2)
        
        # Tarayıcıyı aç
        url = f"http://localhost:{port}"
        print(f"🚀 Dashboard açılıyor: {url}")
        webbrowser.open(url)
        
        return process
        
    except Exception as e:
        print(f"❌ Web sunucusu başlatma hatası: {e}")
        return None

def open_dashboard():
    """Smart Parking Dashboard'u aç"""
    print("="*60)
    print(f"🚗 {ProjectInfo.PROJECT_NAME} v{ProjectInfo.PROJECT_VERSION}")
    print("="*60)
    print(f"📅 Tarih: {ProjectInfo.CREATION_DATE}")
    print(f"👨‍💻 Geliştirici: {ProjectInfo.PROJECT_AUTHOR}")
    print(f"📝 Açıklama: {ProjectInfo.PROJECT_DESCRIPTION}")
    
    print("\n🔧 Sistem Kontrolü:")
    validation_errors = validate_config()
    if validation_errors:
        print("⚠️  Konfigürasyon uyarıları:")
        for error in validation_errors:
            print(f"   • {error}")
        print("   (AWS sertifikaları olmadan simülasyon modu çalışacak)")
    else:
        print("✅ Tüm konfigürasyonlar geçerli!")
    
    print("\n🌐 Web Dashboard Başlatılıyor...")
    print("-" * 60)
    
    # Web sunucusunu başlat
    server_process = start_web_server(8080)
    
    if server_process:
        print("✅ Web sunucusu başarıyla başlatıldı!")
        print("📊 Dashboard özellikleri:")
        for feature in ProjectInfo.FEATURES:
            print(f"   • {feature}")
        
        print(f"\n🔗 Dashboard URL: http://localhost:8080")
        print("💡 Dashboard otomatik olarak tarayıcınızda açılacak")
        print("🛑 Sunucuyu durdurmak için Ctrl+C basın")
        print("-" * 60)
        
        try:
            # Ana thread'i canlı tut
            server_process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Sunucu durduruluyor...")
            server_process.terminate()
            print("✅ Sunucu başarıyla durduruldu!")
    else:
        print("❌ Web sunucusu başlatılamadı!")
        print("💡 Manuel olarak şu komutu çalıştırabilirsiniz:")
        print("   cd frontend && py -m http.server 8080")

# Test scriptleri için kolay erişim
AWS_REGION = AWSConfig.AWS_REGION
CA_CERT_PATH = CertificateConfig.get_ca_path()
CERT_FILE_PATH = CertificateConfig.get_cert_path()
PRIVATE_KEY_PATH = CertificateConfig.get_key_path()
AWS_IOT_ENDPOINT = AWSConfig.IOT_ENDPOINT

# AWS Lambda API Endpoint (API Gateway ile)
AWS_API_ENDPOINT = "https://your-api-gateway-url.execute-api.eu-north-1.amazonaws.com/prod/parking-data"

# API Authentication (if needed)
API_KEY = ""

# Data Mode: 'simulation' or 'live'
DATA_MODE = "live"  # Gerçek veritabanından çekmek için 'live'

if __name__ == "__main__":
    open_dashboard() 