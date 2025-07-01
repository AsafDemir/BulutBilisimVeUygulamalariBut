"""
AWS Lambda Fonksiyonu: Smart Parking Data Processor & API
Bu fonksiyon AWS IoT Core'dan gelen otopark verilerini DynamoDB'ye kaydeder
ve frontend'ten gelen okuma isteklerini karşılar.
"""

import json
import boto3
from datetime import datetime, timedelta
import logging
from decimal import Decimal

# Logging yapılandırması
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB istemcisi
dynamodb = boto3.resource('dynamodb')
table_name = 'ParkingData'

class DecimalEncoder(json.JSONEncoder):
    """Decimal değerleri JSON'a çevirmek için custom encoder"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Eğer decimal bir tam sayı ise int'e, değilse float'a çevir
            if obj % 1 == 0:
                return int(obj)
            else:
                return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    AWS Lambda ana fonksiyonu
    - IoT Core'dan gelen mesajları işler ve DynamoDB'ye kaydeder (POST/PUT)
    - Frontend'ten gelen okuma isteklerini karşılar (GET)
    """
    try:
        logger.info(f"Lambda fonksiyonu tetiklendi. Event: {json.dumps(event, default=str)}")
        
        # HTTP method kontrolü (API Gateway'den gelirse)
        http_method = event.get('httpMethod', 'POST')
        
        # CORS headers
        cors_headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
        
        if http_method == 'OPTIONS':
            # Preflight request
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        elif http_method == 'GET':
            # Frontend'ten veri okuma isteği
            return handle_read_request(event, context, cors_headers)
        
        else:
            # IoT Core'dan veri yazma isteği (POST/PUT)
            return handle_write_request(event, context, cors_headers)
    
    except Exception as e:
        error_msg = f"Lambda genel hatası: {str(e)}"
        logger.error(error_msg)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': 'Sunucu hatası',
                'message': error_msg
            }, cls=DecimalEncoder)
        }

def handle_read_request(event, context, cors_headers):
    """
    Frontend'ten gelen okuma isteklerini işle
    """
    try:
        table = dynamodb.Table(table_name)
        
        # Son 1 saatteki verileri getir
        cutoff_time = (datetime.utcnow() - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Tüm cihazlar için en son veriyi getir
        parking_data = []
        device_ids = ['PARK01', 'PARK02', 'PARK03', 'PARK04', 'PARK05', 
                     'PARK06', 'PARK07', 'PARK08', 'PARK09', 'PARK10']
        
        for device_id in device_ids:
            # Her cihaz için en son kaydı getir
            response = table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('device_id').eq(device_id),
                ScanIndexForward=False,  # En yeni kayıtları önce getir
                Limit=1
            )
            
            if response['Items']:
                item = response['Items'][0]
                # Decimal değerleri güvenli şekilde int/float'a çevir
                parking_data.append({
                    'device_id': str(item['device_id']),
                    'location': str(item['location']),
                    'occupancy_rate': int(item['occupancy_rate']) if isinstance(item['occupancy_rate'], Decimal) else item['occupancy_rate'],
                    'timestamp': str(item['timestamp']),
                    'total_spaces': int(item.get('total_spaces', 100)) if isinstance(item.get('total_spaces'), Decimal) else item.get('total_spaces', 100),
                    'available_spaces': int(item.get('available_spaces', 50)) if isinstance(item.get('available_spaces'), Decimal) else item.get('available_spaces', 50),
                    'processed_at': str(item.get('processed_at', item['timestamp']))
                })
        
        logger.info(f"Veri okuma başarılı: {len(parking_data)} cihaz verisi döndürüldü")
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'data': parking_data,
                'count': len(parking_data),
                'timestamp': datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            }, cls=DecimalEncoder)
        }
    
    except Exception as e:
        error_msg = f"Veri okuma hatası: {str(e)}"
        logger.error(error_msg)
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Veri okuma hatası',
                'message': error_msg
            }, cls=DecimalEncoder)
        }

def handle_write_request(event, context, cors_headers):
    """
    IoT Core'dan gelen yazma isteklerini işle
    """
    try:
        # Event verilerini ayrıştır
        if 'body' in event:
            # API Gateway'den gelen request
            if isinstance(event['body'], str):
                parking_data = json.loads(event['body'])
            else:
                parking_data = event['body']
        elif isinstance(event, str):
            # Direkt string event
            parking_data = json.loads(event)
        elif isinstance(event, dict):
            # Direkt dict event
            parking_data = event
        else:
            raise ValueError("Geçersiz event formatı")
        
        # Gerekli alanları kontrol et
        required_fields = ['device_id', 'location', 'occupancy_rate', 'timestamp']
        for field in required_fields:
            if field not in parking_data:
                raise ValueError(f"Gerekli alan eksik: {field}")
        
        # Veriyi doğrula
        validate_parking_data(parking_data)
        
        # DynamoDB tablosuna erişim
        table = dynamodb.Table(table_name)
        
        # Veriyi hazırla
        item = {
            'device_id': str(parking_data['device_id']),
            'timestamp': str(parking_data['timestamp']),
            'location': str(parking_data['location']),
            'occupancy_rate': Decimal(str(parking_data['occupancy_rate'])),
            'processed_at': datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        
        # Opsiyonel alanları ekle
        if 'total_spaces' in parking_data:
            item['total_spaces'] = Decimal(str(parking_data['total_spaces']))
        
        if 'available_spaces' in parking_data:
            item['available_spaces'] = Decimal(str(parking_data['available_spaces']))
        
        # DynamoDB'ye kaydet
        response = table.put_item(Item=item)
        
        logger.info(f"Veri başarıyla kaydedildi: {parking_data['device_id']} - {parking_data['location']}")
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'message': 'Veri başarıyla işlendi',
                'device_id': parking_data['device_id'],
                'location': parking_data['location'],
                'occupancy_rate': float(parking_data['occupancy_rate']),
                'timestamp': parking_data['timestamp']
            }, cls=DecimalEncoder)
        }
    
    except KeyError as e:
        error_msg = f"JSON ayrıştırma hatası: {str(e)}"
        logger.error(error_msg)
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Veri formatı hatası',
                'message': error_msg
            }, cls=DecimalEncoder)
        }
    
    except ValueError as e:
        error_msg = f"Veri doğrulama hatası: {str(e)}"
        logger.error(error_msg)
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Geçersiz veri',
                'message': error_msg
            }, cls=DecimalEncoder)
        }
    
    except Exception as e:
        error_msg = f"DynamoDB işlem hatası: {str(e)}"
        logger.error(error_msg)
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Sunucu hatası',
                'message': error_msg
            }, cls=DecimalEncoder)
        }

def validate_parking_data(data):
    """
    Otopark verilerini doğrula
    """
    # Doluluk oranı kontrolü
    if not (0 <= data.get('occupancy_rate', -1) <= 100):
        raise ValueError("Doluluk oranı 0-100 arasında olmalıdır")
    
    # Device ID kontrolü
    if not data.get('device_id', '').startswith('PARK'):
        raise ValueError("Device ID 'PARK' ile başlamalıdır")
    
    # Timestamp formatı kontrolü
    try:
        datetime.strptime(data['timestamp'], "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        raise ValueError("Geçersiz timestamp formatı (ISO 8601 bekleniyor)")
    
    return True

# Test fonksiyonu (yerel geliştirme için)
if __name__ == "__main__":
    # Test verisi
    test_event = {
        "device_id": "PARK01",
        "location": "Merkez",
        "occupancy_rate": 75,
        "timestamp": "2025-01-30T12:00:00Z",
        "total_spaces": 100,
        "available_spaces": 25
    }
    
    test_context = {}
    
    print("Lambda fonksiyonu test ediliyor...")
    result = lambda_handler(test_event, test_context)
    print(f"Sonuç: {json.dumps(result, indent=2)}") 