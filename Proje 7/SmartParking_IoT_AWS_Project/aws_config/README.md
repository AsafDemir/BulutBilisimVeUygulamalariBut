# 🚀 AWS Konfigürasyon Dosyaları

Bu klasör, Smart Parking IoT projesi için gerekli AWS servis konfigürasyonlarını içerir.

## 📁 Dosya Yapısı

```
aws_config/
├── iot_policy.json          # IoT Core politika ayarları
├── lambda_iam_role.json     # Lambda IAM rol politikası
├── dynamodb_schema.json     # DynamoDB tablo şeması
└── README.md               # Bu dosya
```

## 🔧 Kurulum Komutları

### 1. DynamoDB Tablosu Oluşturma

```bash
aws dynamodb create-table \
    --cli-input-json file://aws_config/dynamodb_schema.json \
    --region eu-north-1
```

### 2. Lambda IAM Rolü Oluşturma

```bash
# Önce rol oluştur
aws iam create-role \
    --role-name SmartParkingLambdaRole \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'

# Politika ekle
aws iam put-role-policy \
    --role-name SmartParkingLambdaRole \
    --policy-name SmartParkingLambdaPolicy \
    --policy-document file://aws_config/lambda_iam_role.json
```

### 3. IoT Thing ve Politika Oluşturma

```bash
# Thing oluştur
aws iot create-thing \
    --thing-name SimulatedDevice01 \
    --region eu-north-1

# Politika oluştur
aws iot create-policy \
    --policy-name AllowAllIoT \
    --policy-document file://aws_config/iot_policy.json \
    --region eu-north-1

# Sertifika oluştur
aws iot create-keys-and-certificate \
    --set-as-active \
    --certificate-pem-outfile certs/certificate.pem.crt \
    --private-key-outfile certs/private.pem.key \
    --region eu-north-1

# Politikayı sertifikaya bağla
aws iot attach-policy \
    --policy-name AllowAllIoT \
    --target <CERTIFICATE_ARN> \
    --region eu-north-1

# Sertifikayı Thing'e bağla
aws iot attach-thing-principal \
    --thing-name SimulatedDevice01 \
    --principal <CERTIFICATE_ARN> \
    --region eu-north-1
```

### 4. IoT Rule Oluşturma

```bash
aws iot create-topic-rule \
    --rule-name ParkingRule \
    --topic-rule-payload '{
        "sql": "SELECT * FROM \"parking/data\"",
        "actions": [
            {
                "lambda": {
                    "functionArn": "arn:aws:lambda:eu-north-1:ACCOUNT_ID:function:SaveParkingData"
                }
            }
        ]
    }' \
    --region eu-north-1
```

### 5. Lambda Fonksiyonu Deploy

```bash
# Zip dosyası oluştur
zip lambda_function.zip lambda_function.py

# Lambda fonksiyonu oluştur
aws lambda create-function \
    --function-name SaveParkingData \
    --runtime python3.13 \
    --role arn:aws:iam::ACCOUNT_ID:role/SmartParkingLambdaRole \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://lambda_function.zip \
    --region eu-north-1

# IoT Core'un Lambda'yı tetiklemesine izin ver
aws lambda add-permission \
    --function-name SaveParkingData \
    --statement-id iot-rule-permission \
    --action lambda:InvokeFunction \
    --principal iot.amazonaws.com \
    --source-arn arn:aws:iot:eu-north-1:ACCOUNT_ID:rule/ParkingRule \
    --region eu-north-1
```

## 🔍 Doğrulama Komutları

### DynamoDB Tablosu Kontrolü
```bash
aws dynamodb describe-table --table-name ParkingData --region eu-north-1
```

### Lambda Fonksiyon Kontrolü
```bash
aws lambda get-function --function-name SaveParkingData --region eu-north-1
```

### IoT Thing Kontrolü
```bash
aws iot describe-thing --thing-name SimulatedDevice01 --region eu-north-1
```

### IoT Rule Kontrolü
```bash
aws iot get-topic-rule --rule-name ParkingRule --region eu-north-1
```

## ⚠️ Önemli Notlar

1. **Bölge:** Tüm servisler `eu-north-1` bölgesinde oluşturulmalıdır
2. **Account ID:** Komutlardaki `ACCOUNT_ID` yerine kendi AWS hesap ID'nizi yazın
3. **Sertifikalar:** Oluşturulan sertifikaları güvenli bir yerde saklayın
4. **ARN'ler:** Certificate ARN'lerini not alın, sonraki adımlarda kullanacaksınız

## 🧹 Temizleme (Proje Bitiminde)

Kaynakları silmek için:

```bash
# Lambda fonksiyonu sil
aws lambda delete-function --function-name SaveParkingData --region eu-north-1

# DynamoDB tablosu sil
aws dynamodb delete-table --table-name ParkingData --region eu-north-1

# IoT Rule sil
aws iot delete-topic-rule --rule-name ParkingRule --region eu-north-1

# IoT Thing sil
aws iot delete-thing --thing-name SimulatedDevice01 --region eu-north-1

# IAM rol sil
aws iam delete-role-policy --role-name SmartParkingLambdaRole --policy-name SmartParkingLambdaPolicy
aws iam delete-role --role-name SmartParkingLambdaRole
```

Bu komutlar projeyi tamamen temizler ve AWS ücretlerini önler.

## 🌐 API Gateway Kurulumu

### 1. API Gateway Oluştur
```bash
# AWS CLI ile API Gateway oluştur
aws apigateway create-rest-api \
    --name "SmartParkingAPI" \
    --description "Smart Parking IoT REST API"
```

### 2. Resource ve Method Oluştur
```bash
# API ID'sini al (yukarıdaki komuttan dönen değer)
API_ID="your-api-id"

# Root resource ID'sini al
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

# parking-data resource'u oluştur
RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part parking-data \
    --query 'id' --output text)

# GET method oluştur
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method GET \
    --authorization-type NONE

# Lambda integration oluştur
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:eu-north-1:lambda:path/2015-03-31/functions/arn:aws:lambda:eu-north-1:YOUR_ACCOUNT_ID:function:SaveParkingData/invocations"
```

### 3. CORS Ayarları
```bash
# OPTIONS method ekle
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE

# CORS integration
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --integration-http-method OPTIONS
```

### 4. API Deploy
```bash
# Deployment oluştur
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod

# API endpoint'i al
echo "API Endpoint: https://$API_ID.execute-api.eu-north-1.amazonaws.com/prod/parking-data"
```

### 5. Lambda Permission Ver
```bash
# API Gateway'in Lambda'yı çağırabilmesi için permission ver
aws lambda add-permission \
    --function-name SaveParkingData \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:eu-north-1:YOUR_ACCOUNT_ID:$API_ID/*/*"
```

## 🔧 Frontend Konfigürasyonu

API Gateway oluşturduktan sonra:

1. **config.py** dosyasındaki `AWS_API_ENDPOINT` değerini güncelleyin:
```python
AWS_API_ENDPOINT = "https://your-actual-api-id.execute-api.eu-north-1.amazonaws.com/prod/parking-data"
```

2. **frontend/script.js** dosyasındaki `CONFIG.API_ENDPOINT` değerini güncelleyin:
```javascript
const CONFIG = {
    DATA_MODE: 'live',
    API_ENDPOINT: 'https://your-actual-api-id.execute-api.eu-north-1.amazonaws.com/prod/parking-data',
    // ...
};
```

## 📊 Veri Akışı Testi

### 1. MQTT Simülatörü Başlat
```bash
py mqtt_simulator.py
```

### 2. Lambda Log Kontrol
```bash
aws logs tail /aws/lambda/SaveParkingData --follow
```

### 3. DynamoDB Veri Kontrol
```bash
aws dynamodb scan --table-name ParkingData --max-items 10
```

### 4. API Test
```bash
curl https://your-api-id.execute-api.eu-north-1.amazonaws.com/prod/parking-data
``` 