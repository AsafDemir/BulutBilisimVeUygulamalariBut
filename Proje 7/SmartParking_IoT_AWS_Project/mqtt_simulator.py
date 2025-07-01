#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart Parking IoT Simülatörü
Bu kod 10 farklı otopark alanını simüle eder ve AWS IoT Core'a MQTT ile veri gönderir.
"""

import paho.mqtt.client as mqtt
import ssl
import json
import time
import random
from datetime import datetime
import threading
import os

class SmartParkingSimulator:
    def __init__(self):
        # AWS IoT Core ayarları
        self.endpoint = "a1lgienbj1oieq-ats.iot.eu-north-1.amazonaws.com"
        self.port = 8883
        self.topic = "parking/data"
        
        # Sertifika dosya yolları
        self.cert_path = "./certs/"
        self.ca_file = self.cert_path + "AmazonRootCA1.pem"
        self.cert_file = self.cert_path + "certificate.pem.crt"
        self.key_file = self.cert_path + "private.pem.key"
        
        # Otopark cihazları ve konumları
        self.parking_devices = {
            "PARK01": "Merkez",
            "PARK02": "AVM",
            "PARK03": "Hastane",
            "PARK04": "Sanayi",
            "PARK05": "Üniversite",
            "PARK06": "Stadium",
            "PARK07": "Havaalanı",
            "PARK08": "İş Merkezi",
            "PARK09": "Sahil",
            "PARK10": "Tren Garı"
        }
        
        self.client = None
        self.is_connected = False
    
    def on_connect(self, client, userdata, flags, rc):
        """MQTT bağlantı callback fonksiyonu"""
        if rc == 0:
            print("✅ AWS IoT Core'a başarıyla bağlandı!")
            self.is_connected = True
        else:
            print(f"❌ Bağlantı hatası! Kod: {rc}")
    
    def on_publish(self, client, userdata, mid):
        """Mesaj gönderme callback fonksiyonu"""
        print(f"📤 Mesaj gönderildi (ID: {mid})")
    
    def on_disconnect(self, client, userdata, rc):
        """Bağlantı kopma callback fonksiyonu"""
        print("🔌 AWS IoT Core bağlantısı kesildi")
        self.is_connected = False
    
    def setup_mqtt_client(self):
        """MQTT istemcisini kurulum fonksiyonu"""
        try:
            # MQTT istemcisi oluştur
            self.client = mqtt.Client()
            
            # SSL/TLS ayarları
            context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
            context.check_hostname = False
            context.verify_mode = ssl.CERT_REQUIRED
            context.load_verify_locations(self.ca_file)
            context.load_cert_chain(self.cert_file, self.key_file)
            
            self.client.tls_set_context(context)
            
            # Callback fonksiyonları
            self.client.on_connect = self.on_connect
            self.client.on_publish = self.on_publish
            self.client.on_disconnect = self.on_disconnect
            
            print("🔧 MQTT istemcisi hazırlandı")
            return True
            
        except Exception as e:
            print(f"❌ MQTT istemci kurulumu hatası: {e}")
            return False
    
    def connect_to_aws(self):
        """AWS IoT Core'a bağlantı kurma"""
        try:
            print(f"🔗 AWS IoT Core'a bağlanılıyor: {self.endpoint}:{self.port}")
            self.client.connect(self.endpoint, self.port, 60)
            self.client.loop_start()
            
            # Bağlantı bekleme
            timeout = 10
            while not self.is_connected and timeout > 0:
                time.sleep(1)
                timeout -= 1
            
            return self.is_connected
            
        except Exception as e:
            print(f"❌ AWS bağlantı hatası: {e}")
            return False
    
    def generate_parking_data(self, device_id, location):
        """Otopark verisi üretme fonksiyonu"""
        # Gerçekçi doluluk oranları (zaman bazlı)
        current_hour = datetime.now().hour
        
        # Sabah ve akşam mesai saatlerinde daha yoğun
        if 7 <= current_hour <= 9 or 17 <= current_hour <= 19:
            base_occupancy = random.randint(60, 95)
        elif 10 <= current_hour <= 16:
            base_occupancy = random.randint(30, 70)
        elif 20 <= current_hour <= 23:
            base_occupancy = random.randint(20, 60)
        else:  # Gece saatleri
            base_occupancy = random.randint(5, 30)
        
        # Konum bazlı ayarlama
        location_multipliers = {
            "AVM": 1.2, "Hastane": 1.1, "Havaalanı": 1.3,
            "Merkez": 1.1, "Üniversite": 0.9, "Sahil": 0.8
        }
        
        multiplier = location_multipliers.get(location, 1.0)
        occupancy_rate = min(int(base_occupancy * multiplier), 100)
        
        return {
            "device_id": device_id,
            "location": location,
            "occupancy_rate": occupancy_rate,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_spaces": random.randint(50, 200),
            "available_spaces": max(0, random.randint(0, 50))
        }
    
    def send_parking_data(self, device_id, location):
        """Tek bir cihaz için veri gönderme"""
        if not self.is_connected:
            print("❌ AWS bağlantısı yok!")
            return False
        
        try:
            # Veri oluştur
            data = self.generate_parking_data(device_id, location)
            message = json.dumps(data, indent=2)
            
            # MQTT ile gönder
            result = self.client.publish(self.topic, message, qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                print(f"✅ {device_id} ({location}): %{data['occupancy_rate']} doluluk - {data['timestamp']}")
                return True
            else:
                print(f"❌ {device_id} veri gönderimi başarısız!")
                return False
                
        except Exception as e:
            print(f"❌ Veri gönderimi hatası ({device_id}): {e}")
            return False
    
    def simulate_device(self, device_id, location, interval=30):
        """Tek bir cihazı sürekli simüle etme"""
        print(f"🚗 {device_id} cihazı başlatıldı ({location})")
        
        while True:
            try:
                if self.is_connected:
                    self.send_parking_data(device_id, location)
                else:
                    print(f"⚠️  {device_id}: Bağlantı bekleniyor...")
                
                time.sleep(interval + random.randint(-5, 5))  # Rastgele gecikme
                
            except KeyboardInterrupt:
                print(f"🛑 {device_id} cihazı durduruldu")
                break
            except Exception as e:
                print(f"❌ {device_id} simülasyon hatası: {e}")
                time.sleep(10)
    
    def start_simulation(self, interval=30):
        """Tüm cihazları simüle etmeye başla"""
        print("🚀 Smart Parking IoT Simülasyonu Başlatılıyor...")
        print(f"📊 {len(self.parking_devices)} cihaz simüle edilecek")
        print(f"⏱️  Veri gönderme aralığı: {interval} saniye")
        print("-" * 50)
        
        # MQTT kurulumu
        if not self.setup_mqtt_client():
            return False
        
        # AWS bağlantısı
        if not self.connect_to_aws():
            return False
        
        # Her cihaz için thread oluştur
        threads = []
        for device_id, location in self.parking_devices.items():
            thread = threading.Thread(
                target=self.simulate_device,
                args=(device_id, location, interval),
                daemon=True
            )
            threads.append(thread)
            thread.start()
            time.sleep(2)  # Thread'ler arası gecikme
        
        print("✅ Tüm cihazlar başlatıldı!")
        print("Ctrl+C ile durdurmak için...")
        print("-" * 50)
        
        try:
            # Ana thread'i canlı tut
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Simülasyon durduruluyor...")
            self.client.loop_stop()
            self.client.disconnect()
            print("✅ Simülasyon durduruldu!")

def main():
    """Ana fonksiyon"""
    # Sertifika dosyalarını kontrol et
    cert_files = [
        "./certs/AmazonRootCA1.pem",
        "./certs/certificate.pem.crt", 
        "./certs/private.pem.key"
    ]
    
    print("🔍 Sertifika dosyaları kontrol ediliyor...")
    for cert_file in cert_files:
        if not os.path.exists(cert_file):
            print(f"❌ Sertifika dosyası bulunamadı: {cert_file}")
            print("📋 certs/ klasörüne AWS IoT sertifikalarını yerleştirin!")
            return
    
    print("✅ Tüm sertifika dosyaları mevcut")
    
    # Simülatörü başlat
    simulator = SmartParkingSimulator()
    simulator.start_simulation(interval=30)

if __name__ == "__main__":
    main() 