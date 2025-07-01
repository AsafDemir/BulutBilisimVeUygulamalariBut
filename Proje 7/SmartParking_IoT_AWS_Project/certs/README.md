# 🔐 AWS IoT Sertifikaları

Bu klasöre AWS IoT Core'dan aldığınız sertifika dosyalarını yerleştirin.

## 📋 Gerekli Dosyalar

```
certs/
├── AmazonRootCA1.pem          # Amazon Root CA sertifikası
├── certificate.pem.crt        # Cihaz sertifikası
└── private.pem.key           # Özel anahtar
```

## 🛠️ Sertifika Alma Adımları

1. AWS IoT Console'a giriş yapın
2. **Manage** → **Things** sekmesine gidin  
3. **Create** butonuna tıklayın
4. **Create a single thing** seçeneğini seçin
5. Thing adını `SimulatedDevice01` olarak girin
6. **Auto-generate a new certificate** seçeneğini seçin
7. Sertifikaları indirin:
   - Certificate (.pem.crt)
   - Private key (.pem.key)
   - Root CA certificate (AmazonRootCA1.pem)

## ⚠️ Güvenlik Uyarısı

- Sertifika dosyalarını **asla** public repository'lere yüklemeyin
- Özel anahtarı güvenli bir yerde saklayın
- Bu dosyalar AWS kaynaklarınıza erişim sağlar

## 🔗 Yararlı Linkler

- [AWS IoT Device SDK](https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-sdk-python.html)
- [Root CA Sertifikaları](https://www.amazontrust.com/repository/)
- [IoT Güvenlik Best Practices](https://docs.aws.amazon.com/iot/latest/developerguide/security-best-practices.html) 