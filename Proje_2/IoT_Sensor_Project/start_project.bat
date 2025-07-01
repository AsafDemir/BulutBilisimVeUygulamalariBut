@echo off
title IoT Sensor Projesi
color 0A

echo ================================================================
echo                IoT SENSOR PROJESİ KURULUM
echo ================================================================
echo.

:: Python bağımlılıklarını yükle
echo Python bağımlılıkları yükleniyor...
pip install -r requirements.txt

echo.
echo ================================================================
echo                      KURULUM TAMAMLANDI
echo ================================================================
echo.
echo Kullanılabilir komutlar:
echo.
echo   py sensor_simulator.py       - Sensör simülatörünü başlat
echo   py data_consumer.py          - Basit data consumer başlat
echo   py enhanced_data_consumer.py - Gelişmiş data consumer başlat
echo   py check_data.py             - Veritabanı verilerini görüntüle
echo   py test_system.py            - Sistem testini çalıştır
echo   py mqtt_setup.py             - MQTT broker kurulum aracı
echo.
echo Proje hazır! Istediğiniz komutu çalıştırabilirsiniz.
echo.
pause 