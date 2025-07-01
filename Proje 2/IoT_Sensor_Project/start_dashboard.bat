@echo off
echo ========================================
echo    IoT Sensör Dashboard Başlatılıyor
echo ========================================
echo.

REM Gerekli kütüphaneleri yükle
echo Gerekli kütüphaneler yükleniyor...
pip install -r requirements.txt

echo.
echo Dashboard başlatılıyor...
echo Web arayüzü: http://localhost:8080
echo.
echo Durdurmak için Ctrl+C basın
echo.

REM Web dashboard'unu başlat
py app.py

pause 