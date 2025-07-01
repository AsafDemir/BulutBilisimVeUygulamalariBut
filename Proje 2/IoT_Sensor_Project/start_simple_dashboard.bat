@echo off
echo ========================================
echo    IoT Basit Dashboard Başlatılıyor
echo ========================================
echo.

REM Gerekli kütüphaneleri yükle
echo Gerekli kütüphaneler kontrol ediliyor...
pip install -r requirements.txt --quiet

echo.
echo ========================================
echo 1. Sensör Simülatörü başlatılıyor...
echo ========================================
start "Sensor Simulator" py sensor_simulator.py

echo.
echo 2 saniye bekleniyor...
timeout /t 2 /nobreak > nul

echo.
echo ========================================
echo 2. Dashboard başlatılıyor...
echo ========================================
echo Web arayüzü: http://localhost:8080
echo.
echo NASIL KULLANIR:
echo - Tarayıcınızda http://localhost:8080 adresini açın
echo - Zaman aralığı seçmek için butonları kullanın
echo - Otomatik yenileme 30 saniyede bir çalışır
echo.
echo Her iki pencereyi de kapatmak için Ctrl+C basın
echo.

REM Web dashboard'unu başlat
py app.py

pause 