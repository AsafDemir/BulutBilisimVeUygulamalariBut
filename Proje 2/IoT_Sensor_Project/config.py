"""
IoT Sensor Project Configuration - MongoDB Cloud Optimized
Gerçek zamanlı veri akışı ve MongoDB için optimize edilmiş konfigürasyon dosyası
"""

import os
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

class Config:
    # MQTT Broker Ayarları (Cloud MQTT Broker)
    MQTT_ENABLED = True  # MQTT'yi etkinleştir
    MQTT_BROKER_HOST = os.getenv('MQTT_BROKER_HOST', 'broker.hivemq.com')  # HiveMQ Public Broker
    MQTT_BROKER_PORT = int(os.getenv('MQTT_BROKER_PORT', '1883'))
    MQTT_TOPIC = os.getenv('MQTT_TOPIC', 'iot_sensors/temperature')  # Unique topic
    MQTT_CLIENT_ID_SENSOR = os.getenv('MQTT_CLIENT_ID_SENSOR', 'temp_sensor_001')
    MQTT_CLIENT_ID_CONSUMER = os.getenv('MQTT_CLIENT_ID_CONSUMER', 'data_consumer_001')
    
    # MongoDB Atlas Cloud Database Ayarları - Fixed Connection
    MONGODB_ENABLED = True
    MONGODB_CONNECTION_STRING = 'mongodb+srv://iotuser:3IO3XnkdZR3kZcOL@iotcluster.2gxbpw7.mongodb.net/?retryWrites=true&w=majority&appName=IoTCluster'
    MONGODB_DATABASE_NAME = 'iot_sensors'
    MONGODB_PASSWORD = '3IO3XnkdZR3kZcOL'
    
    # MongoDB Collections
    MONGODB_COLLECTION_TEMPERATURE = 'temperature_readings'  # Koleksiyon ismi
    TEMPERATURE_COLLECTION = 'temperature_readings'
    SENSORS_COLLECTION = 'sensors'
    
    # Google Cloud Platform Ayarları
    GOOGLE_PROJECT_ID = os.getenv('GOOGLE_PROJECT_ID', 'mqtt-veri-isleme')
    GOOGLE_PUBSUB_TOPIC = os.getenv('GOOGLE_PUBSUB_TOPIC', 'sensor-data')
    GOOGLE_APPLICATION_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'mqtt-veri-isleme-d7424e378762.json')
    
    # Sensör Simülasyon Ayarları
    SENSOR_INTERVAL = int(os.getenv('SENSOR_INTERVAL', '5'))  # saniye
    MIN_TEMPERATURE = float(os.getenv('MIN_TEMPERATURE', '15.0'))  # °C
    MAX_TEMPERATURE = float(os.getenv('MAX_TEMPERATURE', '35.0'))  # °C
    MIN_HUMIDITY = float(os.getenv('MIN_HUMIDITY', '30.0'))  # %
    MAX_HUMIDITY = float(os.getenv('MAX_HUMIDITY', '80.0'))  # %
    
    # Flask Uygulama Ayarları (Cloud Deployment)
    FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    FLASK_PORT = int(os.getenv('FLASK_PORT', '8080'))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    @classmethod
    def get_mongodb_connection_string(cls):
        """
        MongoDB bağlantı string'ini döndürür
        """
        return cls.MONGODB_CONNECTION_STRING
    
    @classmethod
    def get_mqtt_config(cls):
        """Cloud MQTT broker konfigürasyonunu döndürür"""
        return {
            'host': cls.MQTT_BROKER_HOST,
            'port': cls.MQTT_BROKER_PORT,
            'topic': cls.MQTT_TOPIC,
            'client_id_sensor': cls.MQTT_CLIENT_ID_SENSOR,
            'client_id_consumer': cls.MQTT_CLIENT_ID_CONSUMER
        }
    
    @classmethod
    def get_google_cloud_config(cls):
        """Google Cloud Platform konfigürasyonunu döndürür"""
        return {
            'project_id': cls.GOOGLE_PROJECT_ID,
            'topic_id': cls.GOOGLE_PUBSUB_TOPIC,
            'credentials_path': cls.GOOGLE_APPLICATION_CREDENTIALS
        }
    
    @classmethod
    def is_cloud_mode(cls):
        """Cloud modunda çalışıp çalışmadığını kontrol eder"""
        return cls.MONGODB_ENABLED and cls.MONGODB_CONNECTION_STRING != ''
    
    @classmethod
    def get_connection_info(cls):
        """Mevcut bağlantı bilgilerini döndürür (debug için)"""
        return {
            'database': {
                'type': 'MongoDB Atlas',
                'mode': 'cloud' if cls.is_cloud_mode() else 'local',
                'database_name': cls.MONGODB_DATABASE_NAME,
                'enabled': cls.MONGODB_ENABLED
            },
            'mqtt': {
                'host': cls.MQTT_BROKER_HOST,
                'port': cls.MQTT_BROKER_PORT
            },
            'google_cloud': {
                'project_id': cls.GOOGLE_PROJECT_ID,
                'credentials_file': cls.GOOGLE_APPLICATION_CREDENTIALS
            }
        } 