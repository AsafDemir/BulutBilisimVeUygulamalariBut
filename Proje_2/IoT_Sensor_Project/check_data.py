"""
MongoDB'deki IoT sensör verilerini kontrol eden script
"""

import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from config import Config
from datetime import datetime, timezone

# Logging ayarları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_mongodb_data():
    """MongoDB'deki verileri kontrol et"""
    try:
        # MongoDB bağlantısı
        connection_string = Config.get_mongodb_connection_string()
        client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
        
        # Bağlantıyı test et
        client.admin.command('ping')
        logger.info("✅ MongoDB Atlas bağlantısı başarılı")
        
        # Veritabanı ve koleksiyonları seç
        database = client[Config.MONGODB_DATABASE_NAME]
        temp_collection = database[Config.TEMPERATURE_COLLECTION]
        sensors_collection = database[Config.SENSORS_COLLECTION]
        
        print("\n" + "="*60)
        print("📊 MONGODB VERİ KONTROLÜ")
        print("="*60)
        
        # Toplam veri sayısı
        temp_count = temp_collection.count_documents({})
        sensor_count = sensors_collection.count_documents({})
        
        print(f"\n📈 TOPLAM VERİ:")
        print(f"  🌡️ Sıcaklık verileri: {temp_count} kayıt")
        print(f"  🔧 Sensörler: {sensor_count} kayıt")
        
        # Son 10 veri
        print(f"\n📋 SON 10 SICAKLIK VERİSİ:")
        recent_data = list(temp_collection.find(
            {},
            {'_id': 1, 'sensor_id': 1, 'temperature': 1, 'humidity': 1, 'location': 1, 'timestamp': 1}
        ).sort('timestamp', -1).limit(10))
        
        if recent_data:
            for i, data in enumerate(recent_data, 1):
                timestamp_str = data['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if data.get('timestamp') else 'N/A'
                print(f"  {i:2d}. 🌡️ {data['temperature']:6.2f}°C | 💧 {data['humidity']:5.1f}% | 📍 {data['location']} | 🕒 {timestamp_str}")
        else:
            print("  ❌ Henüz veri yok!")
        
        # Sensör bilgileri
        print(f"\n🔧 SENSÖR BİLGİLERİ:")
        sensors = list(sensors_collection.find({}, {'_id': 0}))
        for sensor in sensors:
            status = "✅ Aktif" if sensor.get('is_active') else "❌ Pasif"
            print(f"  📡 {sensor['sensor_id']} - {sensor['sensor_type']} - {sensor['location']} - {status}")
        
        # Son veri zamanı
        if recent_data:
            last_data = recent_data[0]
            last_time = last_data['timestamp']
            
            # MongoDB'den gelen timestamp'i timezone-aware hale getir
            if last_time.tzinfo is None:
                last_time = last_time.replace(tzinfo=timezone.utc)
            
            time_diff = datetime.now(timezone.utc) - last_time
            print(f"\n⏰ SON VERİ:")
            print(f"  📅 Zaman: {last_time.strftime('%Y-%m-%d %H:%M:%S')} UTC")
            print(f"  ⏱️ Kaç saniye önce: {int(time_diff.total_seconds())} saniye")
        
        # Veri istatistikleri
        if temp_count > 0:
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "avg_temp": {"$avg": "$temperature"},
                        "min_temp": {"$min": "$temperature"},
                        "max_temp": {"$max": "$temperature"},
                        "avg_humidity": {"$avg": "$humidity"}
                    }
                }
            ]
            
            stats = list(temp_collection.aggregate(pipeline))
            if stats:
                stat = stats[0]
                print(f"\n📊 İSTATİSTİKLER:")
                print(f"  🌡️ Ortalama sıcaklık: {stat['avg_temp']:.2f}°C")
                print(f"  🔽 Minimum sıcaklık: {stat['min_temp']:.2f}°C")
                print(f"  🔼 Maksimum sıcaklık: {stat['max_temp']:.2f}°C")
                print(f"  💧 Ortalama nem: {stat['avg_humidity']:.1f}%")
        
        print("\n" + "="*60)
        
        # Bağlantıyı kapat
        client.close()
        return True
        
    except ConnectionFailure as e:
        logger.error(f"❌ MongoDB bağlantı hatası: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Veri kontrol hatası: {e}")
        return False

if __name__ == "__main__":
    print("🔍 MongoDB veri kontrolü başlatılıyor...")
    success = check_mongodb_data()
    
    if success:
        print("✅ Veri kontrolü tamamlandı!")
    else:
        print("❌ Veri kontrolü başarısız!") 