# Cloud Run için Python 3.11 base image
FROM python:3.11-slim

# Çalışma dizinini ayarla
WORKDIR /app

# Sistem paketlerini güncelle ve gerekli paketleri yükle
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python requirements'ı kopyala ve yükle
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama dosyalarını kopyala
COPY . .

# Google Cloud credentials dosyasının varlığını kontrol et
RUN if [ ! -f "mqtt-veri-isleme-d7424e378762.json" ]; then \
    echo "Warning: Google Cloud credentials file not found"; \
    fi

# Port 8080'i expose et (Cloud Run default)
EXPOSE 8080

# Environment variable for production
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# Uygulamayı başlat
CMD ["python", "main.py"] 