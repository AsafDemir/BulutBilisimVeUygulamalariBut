import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, OrderResponse } from '../models/order.model';
import { OrderStatus } from '../models/order-status.enum';
import { tap, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../environments/environment';

/**
 * Sipariş işlemlerini yöneten servis
 * Sipariş oluşturma, güncelleme ve listeleme işlemlerini gerçekleştirir
 */
@Injectable({
  providedIn: 'root'
})
export class OrderService {
  // API endpoint URL'i
  private apiUrl = `${environment.apiUrl}/Orders`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Tüm siparişleri getirir
   * @returns Sipariş listesi observable'ı
   */
  getOrders(): Observable<Order[]> {
    console.log('API isteği yapılıyor:', this.apiUrl);
    return this.http.get<Order[]>(this.apiUrl);
  }

  /**
   * Bekleyen (onay bekleyen) siparişleri getirir
   * @returns Bekleyen sipariş listesi observable'ı
   */
  getPendingOrders(): Observable<ApiResponse<Order[]>> {
    console.log('Bekleyen siparişler getiriliyor');
    return this.http.get<ApiResponse<Order[]>>(`${this.apiUrl}/pending`).pipe(
      tap({
        next: (response) => {
          console.log('Gelen bekleyen siparişler:', response);
        },
        error: (error) => {
          console.error('Sipariş getirme hatası:', error);
        }
      })
    );
  }

  /**
   * Tamamlanmış siparişleri getirir
   * @returns Tamamlanmış sipariş listesi observable'ı
   */
  getCompletedOrders(): Observable<Order[]> {
    console.log('Tamamlanan siparişler getiriliyor');
    return this.http.get<Order[]>(`${this.apiUrl}/completed`).pipe(
      tap({
        next: (response) => console.log('Gelen tamamlanan siparişler:', response),
        error: (error) => {
          console.error('Tamamlanan siparişler getirme hatası:', error);
          if (error.status === 403) {
            console.error('Yetkilendirme hatası: Admin rolü gerekli');
          }
        }
      })
    );
  }

  /**
   * Siparişi onaylar
   * @param id Onaylanacak sipariş ID'si
   * @returns Güncellenmiş sipariş observable'ı
   */
  approveOrder(id: number): Observable<Order> {
    const updateData = {
      status: OrderStatus.Approved
    };
    return this.http.patch<Order>(`${this.apiUrl}/${id}`, updateData);
  }

  /**
   * Siparişi reddeder
   * @param id Reddedilecek sipariş ID'si
   * @returns Güncellenmiş sipariş observable'ı
   */
  rejectOrder(id: number): Observable<Order> {
    const updateData = {
      status: OrderStatus.Rejected
    };
    return this.http.patch<Order>(`${this.apiUrl}/${id}`, updateData);
  }

  /**
   * Yeni sipariş oluşturur
   * @param order Oluşturulacak sipariş bilgileri
   * @returns Oluşturulan sipariş observable'ı
   */
  createOrder(order: Partial<Order>): Observable<OrderResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const orderData = {
      roomid: order.roomid,
      notes: order.notes || '',
      status: OrderStatus.Pending,
      UserId: null
    };

    return this.http.post<OrderResponse>(this.apiUrl, orderData, { headers });
  }

  /**
   * Sipariş durumunun metin karşılığını döndürür
   * @param status Sipariş durumu enum değeri
   * @returns Durumun Türkçe metin karşılığı
   */
  getOrderStatusText(status: OrderStatus): string {
    const numericStatus = Number(status);
    
    switch (numericStatus) {
      case OrderStatus.Pending:
        return 'Bekliyor';
      case OrderStatus.Approved:
        return 'Onaylandı';
      case OrderStatus.Rejected:
        return 'Reddedildi';
      default:
        console.error('Bilinmeyen status değeri:', numericStatus);
        return 'Bekliyor';
    }
  }
}
