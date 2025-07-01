"""
IoT Sensor Dashboard - Web Arayüzü
Sensör verilerini görüntülemek için basit ve modern web arayüzü
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from datetime import datetime, timezone, timedelta
import json
import logging
from config import Config

# Logging ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # CORS desteği ekle

class DatabaseManager:
    """MongoDB veritabanı yönetimi"""
    
    def __init__(self):
        self.client = None
        self.database = None
        self.temp_collection = None
        self.connect()
    
    def connect(self):
        """MongoDB Atlas'a bağlan"""
        try:
            connection_string = Config.get_mongodb_connection_string()
            database_name = Config.MONGODB_DATABASE_NAME
            collection_name = Config.TEMPERATURE_COLLECTION
            
            logger.info(f"🔗 MongoDB bağlantısı deneniyor...")
            logger.info(f"   Connection String: {connection_string[:50]}...")
            logger.info(f"   Database: {database_name}")
            logger.info(f"   Collection: {collection_name}")
            
            self.client = MongoClient(
                connection_string,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                maxPoolSize=50,
                retryWrites=True
            )
            
            # Bağlantıyı test et
            logger.info("🏓 Ping testi yapılıyor...")
            self.client.admin.command('ping')
            
            # Veritabanı ve koleksiyonları seç
            self.database = self.client[database_name]
            self.temp_collection = self.database[collection_name]
            
            # Available collections
            collections = self.database.list_collection_names()
            logger.info(f"   Mevcut koleksiyonlar: {collections}")
            
            # Kayıt sayısını kontrol et
            count = self.temp_collection.count_documents({})
            
            logger.info(f"✅ MongoDB Atlas bağlantısı başarılı - {count} kayıt bulundu")
            
        except Exception as e:
            logger.error(f"❌ MongoDB bağlantı hatası: {type(e).__name__}: {e}")
            logger.error(f"   Detay: {str(e)}")
            self.client = None
    
    def get_recent_data(self, limit=20):
        """Son sensör verilerini getir"""
        if not self.client:
            return []
        
        try:
            cursor = self.temp_collection.find().sort("timestamp", -1).limit(limit)
            data = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])  # ObjectId'yi string'e çevir
                if isinstance(doc.get('timestamp'), datetime):
                    doc['timestamp'] = doc['timestamp'].isoformat()
                data.append(doc)
            return data
        except Exception as e:
            logger.error(f"❌ Veri getirme hatası: {e}")
            return []
    
    def get_sensor_stats(self):
        """Sensör istatistiklerini getir"""
        if not self.client:
            return {}
        
        try:
            # Toplam kayıt sayısı
            total_records = self.temp_collection.count_documents({})
            
            # Bugünün verileri
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            today_records = self.temp_collection.count_documents({
                "timestamp": {"$gte": today}
            })
            
            # Aktif sensör sayısı
            active_sensors = len(self.temp_collection.distinct("sensor_id"))
            
            # Ortalama sıcaklık (son 24 saat)
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            pipeline = [
                {"$match": {"timestamp": {"$gte": yesterday}}},
                {"$group": {
                    "_id": None,
                    "avg_temp": {"$avg": "$temperature"},
                    "max_temp": {"$max": "$temperature"},
                    "min_temp": {"$min": "$temperature"}
                }}
            ]
            
            temp_stats = list(self.temp_collection.aggregate(pipeline))
            if temp_stats:
                avg_temp = round(temp_stats[0]['avg_temp'], 1)
                max_temp = round(temp_stats[0]['max_temp'], 1)
                min_temp = round(temp_stats[0]['min_temp'], 1)
            else:
                avg_temp = max_temp = min_temp = 0
            
            return {
                'total_records': total_records,
                'today_records': today_records,
                'active_sensors': active_sensors,
                'avg_temperature': avg_temp,
                'max_temperature': max_temp,
                'min_temperature': min_temp
            }
            
        except Exception as e:
            logger.error(f"❌ İstatistik getirme hatası: {e}")
            return {}
    
    def get_chart_data(self, hours=24):
        """Grafik için veri getir"""
        if not self.client:
            return []
        
        try:
            since = datetime.now(timezone.utc) - timedelta(hours=hours)
            cursor = self.temp_collection.find({
                "timestamp": {"$gte": since}
            }).sort("timestamp", 1)
            
            data = []
            for doc in cursor:
                data.append({
                    'timestamp': doc['timestamp'].isoformat() if isinstance(doc['timestamp'], datetime) else doc['timestamp'],
                    'temperature': doc.get('temperature', 0),
                    'humidity': doc.get('humidity', 0),
                    'sensor_id': doc.get('sensor_id', 'Unknown')
                })
            
            return data
            
        except Exception as e:
            logger.error(f"❌ Grafik verisi getirme hatası: {e}")
            return []

# Global database manager
db_manager = DatabaseManager()

@app.route('/')
def dashboard():
    """Ana dashboard sayfası"""
    return render_template('dashboard.html')

@app.route('/api/data')
def get_data():
    """Son sensör verilerini API olarak döndür"""
    limit = request.args.get('limit', 20, type=int)
    data = db_manager.get_recent_data(limit)
    return jsonify(data)

@app.route('/api/stats')
def get_stats():
    """Sensör istatistiklerini API olarak döndür"""
    stats = db_manager.get_sensor_stats()
    return jsonify(stats)

@app.route('/api/chart')
def get_chart_data():
    """Grafik verilerini API olarak döndür"""
    hours = request.args.get('hours', 24, type=int)
    data = db_manager.get_chart_data(hours)
    return jsonify(data)

@app.route('/health')
def health_check():
    """Sistem durumu kontrolü"""
    db_status = "OK" if db_manager.client else "ERROR"
    return jsonify({
        'status': 'OK',
        'database': db_status,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

if __name__ == '__main__':
    app.run(
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    ) 