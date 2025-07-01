"""
Cloud Run HTTP Endpoint for Pub/Sub Integration - MongoDB Version
Bu dosya Google Cloud Run üzerinde çalışacak HTTP endpoint'ini sağlar.
Pub/Sub'dan gelen mesajları alır ve MongoDB'ye işler.
"""

import base64
import json
import logging
import os
from datetime import datetime, timezone
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from google.cloud import pubsub_v1
from config import Config

# Flask uygulaması
app = Flask(__name__)
CORS(app)  # CORS desteği ekle

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseManager:
    """MongoDB veritabanı yönetimi için sınıf"""
    
    def __init__(self):
        self.client = None
        self.database = None
        self.temp_collection = None
        self.sensors_collection = None
        self.connect()
    
    def connect(self):
        """MongoDB Atlas'a bağlan"""
        try:
            connection_string = Config.get_mongodb_connection_string()
            logger.info(f"🔗 MongoDB Atlas'a bağlanılıyor...")
            logger.info(f"📊 Database: {Config.MONGODB_DATABASE_NAME}")
            logger.info(f"🌐 Cloud Mode: {Config.is_cloud_mode()}")
            
            self.client = MongoClient(
                connection_string,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                maxPoolSize=50,
                retryWrites=True
            )
            
            # Bağlantıyı test et
            self.client.admin.command('ping')
            
            # Veritabanı ve koleksiyonları seç
            self.database = self.client[Config.MONGODB_DATABASE_NAME]
            self.temp_collection = self.database[Config.TEMPERATURE_COLLECTION]
            self.sensors_collection = self.database[Config.SENSORS_COLLECTION]
            
            logger.info("✅ MongoDB Atlas bağlantısı başarılı")
            
        except ConnectionFailure as e:
            logger.error(f"❌ MongoDB bağlantı hatası: {e}")
            self.client = None
        except ServerSelectionTimeoutError as e:
            logger.error(f"❌ MongoDB sunucu seçim timeout hatası: {e}")
            self.client = None
        except Exception as e:
            logger.error(f"❌ MongoDB genel bağlantı hatası: {e}")
            logger.error(f"🔧 Bağlantı bilgileri: {Config.get_connection_info()}")
            self.client = None
    
    def save_sensor_data(self, data):
        """Sensör verisini MongoDB'ye kaydet"""
        if not self.client:
            self.connect()
        
        if not self.client:
            logger.error("MongoDB bağlantısı yok!")
            return False
        
        try:
            # Timestamp'i parse et
            if isinstance(data.get('timestamp'), str):
                timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
            else:
                timestamp = datetime.now(timezone.utc)
            
            # MongoDB document oluştur
            sensor_document = {
                "sensor_id": data.get('sensor_id', 'UNKNOWN'),
                "temperature": float(data.get('temperature', 0)),
                "humidity": data.get('humidity'),
                "location": data.get('location', 'Cloud'),
                "timestamp": timestamp,
                "created_at": datetime.now(timezone.utc),
                "sensor_type": data.get('sensor_type', 'temperature'),
                "unit": data.get('unit', '°C')
            }
            
            # MongoDB'ye kaydet
            result = self.temp_collection.insert_one(sensor_document)
            
            logger.info(f"✅ Veri MongoDB'ye kaydedildi: {data.get('sensor_id')} - {data.get('temperature')}°C - ID: {result.inserted_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ MongoDB kayıt hatası: {e}")
            return False

# Global database manager
db_manager = DatabaseManager()

@app.route('/', methods=['GET', 'POST'])
def main_endpoint():
    """
    Ana endpoint - GET ve POST isteklerini destekler
    GET: Dashboard sayfasını gösterir
    POST: Pub/Sub mesajlarını işler
    """
    if request.method == 'GET':
        # GET isteği - Dashboard sayfasını göster
        try:
            return render_template('dashboard.html')
        except Exception as e:
            logger.error(f"❌ Dashboard render hatası: {e}")
            # Fallback - servis bilgilerini döndür
            return jsonify({
                'service': 'IoT Sensor Cloud Processor - MongoDB',
                'version': '2.0.0',
                'status': 'running',
                'database': 'MongoDB Atlas',
                'cloud_mode': Config.is_cloud_mode(),
                'endpoints': {
                    'dashboard': '/ (GET)',
                    'health': '/health (GET)',
                    'stats': '/stats (GET)',
                    'api_data': '/api/data (GET)',
                    'api_chart': '/api/chart (GET)',
                    'pubsub': '/ (POST)'
                },
                'description': 'IoT Sensor Dashboard ve Google Cloud Pub/Sub processor',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'error': f'Dashboard template bulunamadı: {e}'
            }), 200
    
    # POST isteği - Pub/Sub mesajlarını işle
    try:
        # İstek verisini al
        envelope = request.get_json()
        
        if not envelope:
            logger.warning("Boş istek alındı")
            return jsonify({'status': 'error', 'message': 'No JSON data'}), 400
        
        # Pub/Sub mesaj formatını kontrol et
        if 'message' not in envelope:
            logger.warning("Geçersiz Pub/Sub formatı")
            return jsonify({'status': 'error', 'message': 'Invalid Pub/Sub format'}), 400
        
        pubsub_message = envelope['message']
        
        # Base64 kodlu veriyi çöz - Güvenli hata yönetimi
        if 'data' in pubsub_message:
            try:
                # Base64 decode işlemi
                if not pubsub_message['data']:
                    logger.warning("Boş data alanı")
                    return jsonify({'status': 'error', 'message': 'Empty data field'}), 400
                
                message_data = base64.b64decode(pubsub_message['data']).decode('utf-8')
                
                # JSON parse işlemi
                if not message_data.strip():
                    logger.warning("Boş mesaj verisi")
                    return jsonify({'status': 'error', 'message': 'Empty message data'}), 400
                
                sensor_data = json.loads(message_data)
                
                logger.info(f"📨 Pub/Sub mesajı alındı: {sensor_data}")
                
                # Veriyi MongoDB'ye kaydet
                success = db_manager.save_sensor_data(sensor_data)
                
                if success:
                    return jsonify({
                        'status': 'success',
                        'message': 'Data processed successfully',
                        'sensor_id': sensor_data.get('sensor_id'),
                        'temperature': sensor_data.get('temperature'),
                        'database': 'MongoDB Atlas'
                    }), 200
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'MongoDB save failed'
                    }), 500
                    
            except base64.binascii.Error as e:
                logger.error(f"❌ Base64 decode hatası: {e}")
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid base64 data',
                    'error_type': 'base64_decode_error'
                }), 400
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON parse hatası: {e}")
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid JSON data',
                    'error_type': 'json_decode_error'
                }), 400
                
            except UnicodeDecodeError as e:
                logger.error(f"❌ Unicode decode hatası: {e}")
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid UTF-8 encoding',
                    'error_type': 'unicode_decode_error'
                }), 400
        else:
            logger.warning("Data alanı bulunamadı")
            return jsonify({
                'status': 'error',
                'message': 'No data field in message'
            }), 400
        
        # Attributes varsa logla
        if 'attributes' in pubsub_message:
            logger.info(f"📋 Mesaj özellikleri: {pubsub_message['attributes']}")
            
    except Exception as e:
        logger.error(f"❌ Genel hata: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error',
            'error_type': 'general_error'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Sağlık kontrolü endpoint'i"""
    try:
        # MongoDB bağlantısını test et
        if db_manager.client:
            db_manager.client.admin.command('ping')
            db_status = "healthy"
        else:
            db_status = "unhealthy"
        
        return jsonify({
            'status': 'healthy',
            'service': 'IoT Sensor Processor',
            'version': '2.0.0',
            'database': {
                'type': 'MongoDB Atlas',
                'status': db_status,
                'database_name': Config.MONGODB_DATABASE_NAME
            },
            'cloud_mode': Config.is_cloud_mode(),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Sağlık kontrolü hatası: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Veritabanı istatistiklerini döndürür"""
    try:
        if not db_manager.client:
            return jsonify({
                'status': 'error',
                'message': 'Database connection not available'
            }), 500
        
        # Koleksiyon sayıları
        temp_count = db_manager.temp_collection.count_documents({})
        sensor_count = db_manager.sensors_collection.count_documents({})
        
        # Son 10 veri
        recent_data = list(db_manager.temp_collection.find(
            {},
            {'_id': 0, 'sensor_id': 1, 'temperature': 1, 'humidity': 1, 'timestamp': 1}
        ).sort('timestamp', -1).limit(10))
        
        # Sensör türleri
        sensor_types = list(db_manager.sensors_collection.distinct('sensor_type'))
        
        return jsonify({
            'status': 'success',
            'database': {
                'type': 'MongoDB Atlas',
                'name': Config.MONGODB_DATABASE_NAME,
                'collections': {
                    'temperature_readings': temp_count,
                    'sensors': sensor_count
                }
            },
            'sensor_types': sensor_types,
            'recent_data': recent_data,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ İstatistik alma hatası: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve statistics',
            'error': str(e)
        }), 500

@app.route('/api/data', methods=['GET'])
def get_sensor_data():
    """Sensör verilerini döndürür - Dashboard için"""
    try:
        if not db_manager.client:
            return jsonify([]), 200
        
        # Query parametreleri
        limit = int(request.args.get('limit', 100))
        limit = min(limit, 1000)  # Maximum 1000 kayıt
        
        # MongoDB'den verileri al
        data = list(db_manager.temp_collection.find(
            {},
            {
                '_id': 0,
                'sensor_id': 1,
                'temperature': 1,
                'humidity': 1,
                'location': 1,
                'timestamp': 1
            }
        ).sort('timestamp', -1).limit(limit))
        
        # Timestamp'leri string'e çevir
        for item in data:
            if 'timestamp' in item:
                item['timestamp'] = item['timestamp'].isoformat() if hasattr(item['timestamp'], 'isoformat') else str(item['timestamp'])
        
        logger.info(f"📊 API: {len(data)} sensör verisi döndürüldü")
        return jsonify(data), 200
        
    except Exception as e:
        logger.error(f"❌ API veri alma hatası: {e}")
        return jsonify([]), 200

@app.route('/api/chart', methods=['GET'])
def get_chart_data():
    """Belirli zaman aralığındaki verileri döndürür - Chart için"""
    try:
        if not db_manager.client:
            return jsonify([]), 200
        
        # Query parametresi
        hours = int(request.args.get('hours', 24))
        
        # Zaman filtresi
        from datetime import timedelta
        time_limit = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # MongoDB query
        query = {'timestamp': {'$gte': time_limit}} if hours > 0 else {}
        
        data = list(db_manager.temp_collection.find(
            query,
            {
                '_id': 0,
                'sensor_id': 1,
                'temperature': 1,
                'humidity': 1,
                'location': 1,
                'timestamp': 1
            }
        ).sort('timestamp', -1).limit(1000))
        
        # Timestamp'leri string'e çevir
        for item in data:
            if 'timestamp' in item:
                item['timestamp'] = item['timestamp'].isoformat() if hasattr(item['timestamp'], 'isoformat') else str(item['timestamp'])
        
        logger.info(f"📈 Chart API: Son {hours} saat için {len(data)} veri döndürüldü")
        return jsonify(data), 200
        
    except Exception as e:
        logger.error(f"❌ Chart API hatası: {e}")
        return jsonify([]), 200

@app.route('/dashboard')
def dashboard():
    """Dashboard sayfasını render et"""
    try:
        return render_template('dashboard.html')
    except Exception as e:
        logger.error(f"❌ Dashboard render hatası: {e}")
        return f"Dashboard yüklenemedi: {e}", 500

@app.errorhandler(404)
def not_found(error):
    """404 hatası için özel response"""
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found',
        'available_endpoints': ['/', '/health', '/stats', '/api/data', '/api/chart', '/dashboard']
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """500 hatası için özel response"""
    logger.error(f"❌ İç sunucu hatası: {error}")
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500

if __name__ == '__main__':
    # Development modunda çalıştır
    logger.info("🚀 IoT Sensor Processor (MongoDB) başlatılıyor...")
    logger.info(f"📊 Veritabanı: {Config.MONGODB_DATABASE_NAME}")
    logger.info(f"🌐 Cloud Mode: {Config.is_cloud_mode()}")
    
    app.run(
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    ) 