import json
import random
import time
import logging
from datetime import datetime, timezone
import paho.mqtt.client as mqtt
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from config import Config
from google.cloud import pubsub_v1  # Pub/Sub kütüphanesi
import os

# Google Cloud credentials ayarı
if Config.GOOGLE_APPLICATION_CREDENTIALS:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = Config.GOOGLE_APPLICATION_CREDENTIALS

# Logging ayarları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Pub/Sub ayarları
project_id = Config.GOOGLE_PROJECT_ID
topic_id = Config.GOOGLE_PUBSUB_TOPIC
publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(project_id, topic_id)

def publish_to_pubsub(sensor_id, sicaklik, nem, location):
    """Veriyi Google Cloud Pub/Sub'a gönder - Enhanced Version"""
    try:
        if not Config.GOOGLE_PROJECT_ID:
            logger.warning("⚠️ Google Cloud Project ID tanımlanmamış, Pub/Sub gönderimi atlanıyor")
            return False
            
        # Pub/Sub mesaj formatı (kullanıcı önerisi)
        pubsub_message = {
            "sensor_id": sensor_id,
            "temperature": sicaklik,
            "humidity": nem,
            "location": location,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Pub/Sub'a gönder
        publisher.publish(topic_path, json.dumps(pubsub_message).encode("utf-8"))
        logger.info(f"☁️ [Pub/Sub] Veri başarıyla gönderildi: {sicaklik}°C, Nem: {nem}%")
        return True
        
    except Exception as e:
        logger.error(f"❌ [Pub/Sub] Veri gönderme hatası: {e}")
        return False

class TemperatureSensor:
    """Sıcaklık sensörü simülatörü sınıfı - MongoDB Version"""

    def __init__(self, use_mqtt=None):
        self.sensor_id = "TEMP_001"
        self.location = "Laboratuvar"
        
        # Config'ten MQTT durumunu kontrol et
        if use_mqtt is None:
            self.use_mqtt = getattr(Config, 'MQTT_ENABLED', True)
        else:
            self.use_mqtt = use_mqtt
            
        self.mqtt_client = None
        self.is_connected = False
        self.last_temperature = 25.0
        
        # MongoDB bağlantı ayarları
        self.mongo_client = None
        self.database = None
        self.temp_collection = None

        # ✅ FIX: MongoDB bağlantısını her durumda kur
        logger.info("🔧 MongoDB bağlantısı kuruluyor...")
        self.setup_database()

        if self.use_mqtt:
            logger.info("🔧 MQTT modu etkin - MQTT broker'a bağlanılıyor...")
            self.setup_mqtt()
        else:
            logger.info("🔧 Doğrudan MongoDB modu etkin - MQTT atlanıyor...")

    def setup_database(self):
        """MongoDB bağlantısını ayarla"""
        try:
            connection_string = Config.get_mongodb_connection_string()
            logger.info("MongoDB Atlas'a bağlanılıyor (Doğrudan mod)...")
            
            self.mongo_client = MongoClient(
                connection_string,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                maxPoolSize=50,
                retryWrites=True
            )
            
            # Bağlantıyı test et
            self.mongo_client.admin.command('ping')
            
            # Veritabanı ve koleksiyonu seç
            self.database = self.mongo_client[Config.MONGODB_DATABASE_NAME]
            self.temp_collection = self.database[Config.TEMPERATURE_COLLECTION]
            
            logger.info("✅ MongoDB Atlas bağlantısı başarılı (Doğrudan mod)")
            
        except Exception as e:
            logger.error(f"❌ MongoDB bağlantı hatası: {e}")
            raise

    def setup_mqtt(self):
        """MQTT istemcisini ayarla"""
        try:
            # Debug: Config değerlerini yazdır
            logger.info(f"📊 DEBUG: MQTT_BROKER_HOST = {Config.MQTT_BROKER_HOST}")
            logger.info(f"📊 DEBUG: MQTT_BROKER_PORT = {Config.MQTT_BROKER_PORT}")
            logger.info(f"📊 DEBUG: MQTT_TOPIC = {Config.MQTT_TOPIC}")
            
            self.mqtt_client = mqtt.Client(Config.MQTT_CLIENT_ID_SENSOR)
            self.mqtt_client.on_connect = self.on_connect
            self.mqtt_client.on_disconnect = self.on_disconnect
            self.mqtt_client.on_publish = self.on_publish

            logger.info(f"MQTT broker'a bağlanılıyor: {Config.MQTT_BROKER_HOST}:{Config.MQTT_BROKER_PORT}")
            self.mqtt_client.connect(Config.MQTT_BROKER_HOST, Config.MQTT_BROKER_PORT, 60)
            self.mqtt_client.loop_start()

        except Exception as e:
            logger.error(f"❌ MQTT kurulum hatası: {e}")
            logger.info("🔄 MQTT bağlantısı başarısız, doğrudan MongoDB moduna geçiliyor...")
            self.use_mqtt = False
            # MongoDB bağlantısı zaten __init__'te kuruldu, tekrar kurmanın gereği yok

    def on_connect(self, client, userdata, flags, rc):
        """MQTT bağlantı callback fonksiyonu"""
        if rc == 0:
            self.is_connected = True
            logger.info("✅ MQTT broker'a başarıyla bağlanıldı")
        else:
            logger.error(f"❌ MQTT bağlantı hatası: {rc}")

    def on_disconnect(self, client, userdata, rc):
        """MQTT bağlantı kopma callback fonksiyonu"""
        self.is_connected = False
        logger.warning(f"⚠️ MQTT bağlantısı koptu: {rc}")

    def on_publish(self, client, userdata, mid):
        """MQTT mesaj yayınlama callback fonksiyonu"""
        logger.debug(f"📡 Mesaj yayınlandı: {mid}")

    def generate_temperature_data(self):
        """Sıcaklık verisi üret"""
        # Gradual temperature change for more realistic data
        temperature_change = random.uniform(-2.0, 2.0)
        new_temperature = self.last_temperature + temperature_change
        new_temperature = max(Config.MIN_TEMPERATURE, min(Config.MAX_TEMPERATURE, new_temperature))
        self.last_temperature = new_temperature

        # Generate humidity data
        humidity = random.uniform(Config.MIN_HUMIDITY, Config.MAX_HUMIDITY)

        data = {
            "sensor_id": self.sensor_id,
            "sensor_type": "temperature",
            "temperature": round(new_temperature, 2),
            "humidity": round(humidity, 2),
            "location": self.location,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "unit": "°C"
        }

        return data

    def save_to_database_direct(self, data):
        """Veriyi doğrudan MongoDB'ye kaydet"""
        try:
            # Timestamp'i datetime objesine çevir
            if isinstance(data.get('timestamp'), str):
                timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
            else:
                timestamp = datetime.now(timezone.utc)
            
            # MongoDB document oluştur
            sensor_document = {
                "sensor_id": data.get('sensor_id', 'UNKNOWN'),
                "temperature": float(data.get('temperature', 0)),
                "humidity": data.get('humidity'),
                "location": data.get('location', 'Unknown'),
                "timestamp": timestamp,
                "created_at": datetime.now(timezone.utc),
                "sensor_type": data.get('sensor_type', 'temperature'),
                "unit": data.get('unit', '°C')
            }
            
            # MongoDB'ye kaydet
            result = self.temp_collection.insert_one(sensor_document)
            
            logger.info(f"✅ Veri doğrudan MongoDB'ye kaydedildi: Sıcaklık={data['temperature']}°C, Nem={data['humidity']}%, ID={result.inserted_id}")
            return True

        except Exception as e:
            logger.error(f"❌ MongoDB kayıt hatası: {e}")
            return False

    def publish_data(self, data):
        """MQTT üzerinden veri yayınla"""
        try:
            if not self.is_connected:
                logger.warning("⚠️ MQTT bağlantısı yok, yeniden bağlanılıyor...")
                self.mqtt_client.reconnect()
                time.sleep(1)
                return False

            message = json.dumps(data)
            result = self.mqtt_client.publish(Config.MQTT_TOPIC, message)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"📡 MQTT ile veri gönderildi: {data['temperature']}°C, Nem: {data['humidity']}%")
                return True
            else:
                logger.error(f"❌ MQTT yayın hatası: {result.rc}")
                return False

        except Exception as e:
            logger.error(f"❌ Veri yayınlama hatası: {e}")
            return False

    def run(self):
        """Ana simülasyon döngüsü"""
        logger.info(f"🚀 Sıcaklık sensörü simülatörü başlatıldı (MongoDB Version)")
        logger.info(f"🔧 Sensör ID: {self.sensor_id}")
        logger.info(f"📍 Konum: {self.location}")
        logger.info(f"⏱️ Veri gönderim aralığı: {Config.SENSOR_INTERVAL} saniye")
        logger.info(f"🌡️ Sıcaklık aralığı: {Config.MIN_TEMPERATURE}°C - {Config.MAX_TEMPERATURE}°C")
        logger.info(f"💧 Nem aralığı: {Config.MIN_HUMIDITY}% - {Config.MAX_HUMIDITY}%")

        if self.use_mqtt:
            logger.info("📡 MQTT modu aktif")
        else:
            logger.info("🗄️ Doğrudan MongoDB modu aktif")

        try:
            message_count = 0
            while True:
                # Sensör verisi üret
                sensor_data = self.generate_temperature_data()
                message_count += 1
                
                logger.info(f"📊 Mesaj #{message_count} - Sıcaklık: {sensor_data['temperature']}°C, Nem: {sensor_data['humidity']}%")

                # Hybrid Mode: Hem MQTT hem de backup olarak MongoDB'ye kaydet
                if self.use_mqtt and self.is_connected:
                    # MQTT'ye gönder
                    mqtt_success = self.publish_data(sensor_data)
                    if not mqtt_success:
                        # MQTT başarısız olursa doğrudan MongoDB'ye kaydet
                        logger.warning("⚠️ MQTT gönderimi başarısız, MongoDB'ye doğrudan kaydediliyor...")
                        self.save_to_database_direct(sensor_data)
                elif self.use_mqtt and not self.is_connected:
                    # MQTT bağlantısı yoksa doğrudan MongoDB'ye kaydet
                    logger.warning("⚠️ MQTT bağlantısı yok, MongoDB'ye doğrudan kaydediliyor...")
                    self.save_to_database_direct(sensor_data)
                else:
                    # MQTT devre dışıysa doğrudan MongoDB'ye kaydet
                    self.save_to_database_direct(sensor_data)

                # Google Cloud Pub/Sub'a da gönder (Her durumda)
                publish_success = publish_to_pubsub(
                    sensor_data['sensor_id'],
                    sensor_data['temperature'], 
                    sensor_data['humidity'],
                    sensor_data['location']
                )
                
                if not publish_success:
                    logger.warning("⚠️ Pub/Sub gönderimi başarısız, devam ediliyor...")

                # Bekleme
                time.sleep(Config.SENSOR_INTERVAL)

        except KeyboardInterrupt:
            logger.info("⚠️ Kullanıcı tarafından durduruldu")
        except Exception as e:
            logger.error(f"❌ Sensör simülasyonu hatası: {e}")
        finally:
            self.cleanup()

    def cleanup(self):
        """Kaynakları temizle"""
        logger.info("🧹 Kaynaklar temizleniyor...")
        
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
            logger.info("📡 MQTT bağlantısı kapatıldı")
            
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("🗄️ MongoDB bağlantısı kapatıldı")
            
        logger.info("✅ Sensör simülatörü kapatıldı")

def main():
    """Ana fonksiyon"""
    logger.info("=== IoT Temperature Sensor Simulator - MongoDB Version ===")
    logger.info(f"🌐 Cloud Mode: {Config.is_cloud_mode()}")
    logger.info(f"🗄️ Veritabanı: MongoDB Atlas")
    logger.info(f"☁️ Google Cloud Pub/Sub: {Config.GOOGLE_PROJECT_ID}")
    logger.info(f"📡 MQTT Durum: {'Etkin' if getattr(Config, 'MQTT_ENABLED', True) else 'Devre Dışı'}")
    
    try:
        # Sensör simülatörünü başlat (Config'ten MQTT durumunu alacak)
        sensor = TemperatureSensor()  # Otomatik config'ten alır
        sensor.run()
        
    except Exception as e:
        logger.error(f"💥 Program hatası: {e}")

if __name__ == "__main__":
    main()
