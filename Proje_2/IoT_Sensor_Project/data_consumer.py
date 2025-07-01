import json
import logging
from datetime import datetime, timezone
import paho.mqtt.client as mqtt
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from config import Config
from google.cloud import pubsub_v1
import os

# Google Cloud credentials ayarı
if Config.GOOGLE_APPLICATION_CREDENTIALS:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = Config.GOOGLE_APPLICATION_CREDENTIALS

# Logging ayarları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DataConsumer:
    """MQTT verilerini dinleyen ve MongoDB'ye kaydeden sınıf"""
    
    def __init__(self):
        self.mqtt_client = None
        self.mongo_client = None
        self.database = None
        self.temp_collection = None
        self.sensors_collection = None
        self.is_connected = False
        
        # Google Cloud Pub/Sub ayarları
        self.subscriber = None
        self.subscription_path = None
        self.pubsub_enabled = False
        
        # MQTT enabled kontrolü
        self.mqtt_enabled = getattr(Config, 'MQTT_ENABLED', True)
        
        self.setup_database()
        
        if self.mqtt_enabled:
            logger.info("🔧 MQTT modu etkin - MQTT consumer başlatılıyor...")
            self.setup_mqtt()
        else:
            logger.info("🔧 MQTT devre dışı - Sadece Pub/Sub modu aktif...")
            
        self.setup_pubsub()
    
    def setup_database(self):
        """MongoDB bağlantısını ayarla"""
        try:
            connection_string = Config.get_mongodb_connection_string()
            logger.info("MongoDB Atlas'a bağlanılıyor...")
            
            self.mongo_client = MongoClient(
                connection_string,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                maxPoolSize=50,
                retryWrites=True
            )
            
            # Bağlantıyı test et
            self.mongo_client.admin.command('ping')
            
            # Veritabanı ve koleksiyonları seç
            self.database = self.mongo_client[Config.MONGODB_DATABASE_NAME]
            self.temp_collection = self.database[Config.TEMPERATURE_COLLECTION]
            self.sensors_collection = self.database[Config.SENSORS_COLLECTION]
            
            logger.info("✅ MongoDB Atlas bağlantısı başarılı")
            
        except ConnectionFailure as e:
            logger.error(f"❌ MongoDB bağlantı hatası: {e}")
            raise
        except ServerSelectionTimeoutError as e:
            logger.error(f"❌ MongoDB sunucu seçim timeout hatası: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ MongoDB genel bağlantı hatası: {e}")
            raise
    
    def setup_mqtt(self):
        """MQTT istemcisini ayarla"""
        try:
            self.mqtt_client = mqtt.Client(Config.MQTT_CLIENT_ID_CONSUMER)
            self.mqtt_client.on_connect = self.on_connect
            self.mqtt_client.on_message = self.on_message
            self.mqtt_client.on_disconnect = self.on_disconnect
            
            logger.info(f"MQTT broker'a bağlanılıyor: {Config.MQTT_BROKER_HOST}:{Config.MQTT_BROKER_PORT}")
            self.mqtt_client.connect(Config.MQTT_BROKER_HOST, Config.MQTT_BROKER_PORT, 60)
            
        except Exception as e:
            logger.error(f"MQTT kurulum hatası: {e}")
            raise
    
    def setup_pubsub(self):
        """Google Cloud Pub/Sub subscriber'ı ayarla"""
        try:
            if not Config.GOOGLE_PROJECT_ID:
                logger.warning("⚠️ Google Cloud Project ID tanımlanmamış, Pub/Sub devre dışı")
                return
                
            # Subscriber client ve subscription bilgisi
            self.subscriber = pubsub_v1.SubscriberClient()
            self.subscription_path = self.subscriber.subscription_path(
                Config.GOOGLE_PROJECT_ID, 
                "sensor-data-sub"  # Subscription name
            )
            
            self.pubsub_enabled = True
            logger.info(f"✅ Google Cloud Pub/Sub subscriber hazır: {self.subscription_path}")
            
        except Exception as e:
            logger.error(f"❌ Pub/Sub kurulum hatası: {e}")
            logger.info("🔄 Pub/Sub olmadan devam ediliyor...")
            self.pubsub_enabled = False
    
    def on_connect(self, client, userdata, flags, rc):
        """MQTT bağlantı callback fonksiyonu"""
        if rc == 0:
            self.is_connected = True
            logger.info("✅ MQTT broker'a başarıyla bağlanıldı")
            
            # Sıcaklık topic'ine abone ol
            client.subscribe(Config.MQTT_TOPIC)
            logger.info(f"📡 Topic'e abone olundu: {Config.MQTT_TOPIC}")
        else:
            logger.error(f"❌ MQTT bağlantı hatası: {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        """MQTT bağlantı kopma callback fonksiyonu"""
        self.is_connected = False
        logger.warning(f"⚠️ MQTT bağlantısı koptu: {rc}")
    
    def on_message(self, client, userdata, msg):
        """MQTT mesaj alma callback fonksiyonu"""
        try:
            # JSON mesajını çöz
            message = msg.payload.decode('utf-8')
            data = json.loads(message)
            
            logger.info(f"📨 Yeni veri alındı: {data['temperature']}°C (Sensör: {data['sensor_id']})")
            
            # MongoDB'ye kaydet
            self.save_to_database(data)
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON çözme hatası: {e}")
        except Exception as e:
            logger.error(f"❌ Mesaj işleme hatası: {e}")
    
    def pubsub_callback(self, message):
        """Google Cloud Pub/Sub mesajı işleme callback fonksiyonu"""
        try:
            # Mesaj içeriğini al
            message_text = message.data.decode("utf-8")
            
            # Test mesajlarını filtrele
            if "Test message" in message_text or message_text.strip() == "":
                logger.debug(f"🔍 [Pub/Sub] Test mesajı atlandı: {message_text[:50]}...")
                message.ack()  # Test mesajını onayla ama işleme
                return
            
            # JSON mesajını çöz
            data = json.loads(message_text)
            
            # Sensör verisi kontrolü
            if not all(key in data for key in ['sensor_id', 'temperature']):
                logger.warning(f"⚠️ [Pub/Sub] Eksik veri alanları: {data}")
                message.ack()  # Eksik veriyi onayla ama işleme
                return
            
            logger.info(f"☁️ [Pub/Sub] Alınan veri: {data['temperature']}°C (Sensör: {data['sensor_id']})")
            
            # MongoDB'ye kaydet
            self.save_to_database(data)
            
            # Mesajı onaylama
            message.ack()
            logger.debug("✅ [Pub/Sub] Mesaj onaylandı")
            
        except json.JSONDecodeError as e:
            # JSON olmayan mesajları logla ve onayla
            message_preview = message.data.decode("utf-8", errors='ignore')[:100]
            logger.debug(f"🔍 [Pub/Sub] JSON olmayan mesaj atlandı: {message_preview}...")
            message.ack()  # JSON olmayan mesajı onayla
            
        except KeyError as e:
            logger.warning(f"⚠️ [Pub/Sub] Eksik JSON anahtarı: {e}")
            message.ack()  # Eksik anahtar mesajını onayla
            
        except Exception as e:
            logger.error(f"❌ [Pub/Sub] Mesaj işleme hatası: {e}")
            message.nack()  # Gerçek hataları reddet
    
    def save_to_database(self, data):
        """Veriyi MongoDB'ye kaydet"""
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
            
            logger.info(f"✅ Veri MongoDB'ye kaydedildi: ID={data['sensor_id']}, Sıcaklık={data['temperature']}°C, MongoDB ID={result.inserted_id}")
            
        except Exception as e:
            logger.error(f"❌ MongoDB kayıt hatası: {e}")
            # Bağlantıyı yeniden kur
            self.reconnect_database()
    
    def reconnect_database(self):
        """MongoDB bağlantısını yeniden kur"""
        try:
            if self.mongo_client:
                self.mongo_client.close()
            
            logger.info("🔄 MongoDB bağlantısı yeniden kuruluyor...")
            self.setup_database()
            logger.info("✅ MongoDB bağlantısı yeniden kuruldu")
            
        except Exception as e:
            logger.error(f"❌ MongoDB yeniden bağlanma hatası: {e}")
    
    def get_recent_data(self, limit=10):
        """Son verileri göster (test amaçlı)"""
        try:
            # Son verileri MongoDB'den al
            recent_docs = list(self.temp_collection.find(
                {},
                {'_id': 0, 'sensor_id': 1, 'temperature': 1, 'humidity': 1, 'location': 1, 'timestamp': 1}
            ).sort('timestamp', -1).limit(limit))
            
            logger.info(f"📊 Son {len(recent_docs)} veri:")
            for doc in recent_docs:
                timestamp_str = doc['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if doc.get('timestamp') else 'N/A'
                logger.info(f"  🌡️ {doc['sensor_id']} - {doc['temperature']}°C - {timestamp_str}")
            
            return recent_docs
            
        except Exception as e:
            logger.error(f"❌ Veri sorgulama hatası: {e}")
            return []
    
    def get_database_stats(self):
        """Veritabanı istatistiklerini göster"""
        try:
            # Koleksiyon sayıları
            temp_count = self.temp_collection.count_documents({})
            sensor_count = self.sensors_collection.count_documents({})
            
            # Sensör türleri
            sensor_types = list(self.sensors_collection.distinct('sensor_type'))
            
            # Aktif sensörler
            active_sensors = list(self.sensors_collection.find(
                {'is_active': True},
                {'_id': 0, 'sensor_id': 1, 'sensor_type': 1, 'location': 1}
            ))
            
            logger.info("📊 MongoDB Veritabanı İstatistikleri:")
            logger.info(f"  📈 Toplam sıcaklık verisi: {temp_count} kayıt")
            logger.info(f"  🔧 Toplam sensör: {sensor_count} adet")
            logger.info(f"  📡 Sensör türleri: {sensor_types}")
            logger.info(f"  ✅ Aktif sensörler:")
            for sensor in active_sensors:
                logger.info(f"    - {sensor['sensor_id']} ({sensor['sensor_type']}) @ {sensor.get('location', 'Unknown')}")
            
            return {
                'temperature_count': temp_count,
                'sensor_count': sensor_count,
                'sensor_types': sensor_types,
                'active_sensors': active_sensors
            }
            
        except Exception as e:
            logger.error(f"❌ İstatistik alma hatası: {e}")
            return {}
    
    def run(self):
        """Ana dinleme döngüsü - MQTT + Pub/Sub"""
        logger.info("🚀 Hybrid Veri Tüketicisi başlatıldı (MongoDB Version)")
        logger.info(f"📡 MQTT: {'Aktif' if self.mqtt_enabled else 'Devre Dışı'}")
        logger.info(f"☁️ Pub/Sub: {'Aktif' if self.pubsub_enabled else 'Devre Dışı'}")
        logger.info(f"🗄️ Veritabanı: {Config.MONGODB_DATABASE_NAME}")
        
        try:
            # Veritabanı istatistiklerini göster
            self.get_database_stats()
            
            # Son verileri göster (test amaçlı)
            self.get_recent_data(5)
            
            # Pub/Sub dinleyicisini başlat (eğer aktifse)
            streaming_pull_future = None
            if self.pubsub_enabled:
                logger.info("☁️ [Pub/Sub] Dinleyici başlatılıyor...")
                streaming_pull_future = self.subscriber.subscribe(
                    self.subscription_path, 
                    callback=self.pubsub_callback
                )
                logger.info("✅ [Pub/Sub] Dinleyici aktif")
            
            if self.mqtt_enabled:
                # MQTT döngüsünü başlat
                logger.info("⏳ MQTT mesajları bekleniyor...")
                logger.info("📡 Veri dinlemeye hazır - Ctrl+C ile durdurun")
                
                # MQTT döngüsü (ana döngü)
                self.mqtt_client.loop_forever()
            else:
                # Sadece Pub/Sub modu - sonsuz döngü
                logger.info("⏳ Sadece Pub/Sub mesajları bekleniyor...")
                logger.info("☁️ Veri dinlemeye hazır - Ctrl+C ile durdurun")
                
                # Pub/Sub için sonsuz bekleme
                if streaming_pull_future:
                    streaming_pull_future.result()  # Sonsuz bekle
                else:
                    logger.warning("⚠️ Ne MQTT ne de Pub/Sub aktif değil!")
                    import time
                    while True:
                        time.sleep(1)
            
        except KeyboardInterrupt:
            logger.info("⚠️ Kullanıcı tarafından durduruldu")
            # Pub/Sub dinleyicisini durdur
            if streaming_pull_future:
                streaming_pull_future.cancel()
                logger.info("☁️ [Pub/Sub] Dinleyici durduruldu")
        except Exception as e:
            logger.error(f"❌ Veri tüketicisi hatası: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Kaynakları temizle"""
        logger.info("🧹 Kaynaklar temizleniyor...")
        
        if self.mqtt_enabled and self.mqtt_client:
            self.mqtt_client.disconnect()
            logger.info("📡 MQTT bağlantısı kapatıldı")
            
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("🗄️ MongoDB bağlantısı kapatıldı")
            
        logger.info("✅ Veri tüketicisi kapatıldı")

def main():
    """Ana fonksiyon"""
    logger.info("=== IoT Sensor Data Consumer - MongoDB Version ===")
    logger.info(f"🌐 Cloud Mode: {Config.is_cloud_mode()}")
    logger.info(f"🗄️ Veritabanı: MongoDB Atlas")
    logger.info(f"☁️ Google Cloud Pub/Sub: {Config.GOOGLE_PROJECT_ID}")
    logger.info(f"📡 MQTT Durum: {'Etkin' if getattr(Config, 'MQTT_ENABLED', True) else 'Devre Dışı'}")
    
    try:
        consumer = DataConsumer()
        
        # Dinlemeye başla
        consumer.run()
        
    except Exception as e:
        logger.error(f"💥 Program hatası: {e}")

if __name__ == "__main__":
    main() 