import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { OrderDrink } from '../models/order-drink.model';
import { tap, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../environments/environment';

/**
 * Sipariş içerikleriyle ilgili API işlemlerini yöneten servis
 * Bu servis, siparişlerin içindeki içecek detaylarını yönetir
 */
@Injectable({
  providedIn: 'root'
})
export class OrderDrinkService {
  // API'nin temel URL'i
  private apiUrl = `${environment.apiUrl}/orderdrinks`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Bir hata oluştu';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side hata
      errorMessage = `Hata: ${error.error.message}`;
    } else {
      // Backend'den gelen hata
      switch (error.status) {
        case 401:
          errorMessage = 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.';
          break;
        case 403:
          errorMessage = 'Bu işlem için yetkiniz bulunmuyor.';
          break;
        case 404:
          errorMessage = 'Sipariş bulunamadı.';
          break;
        case 500:
          errorMessage = 'Sunucu hatası: ' + (error.error?.message || 'Bilinmeyen bir hata oluştu');
          break;
        default:
          errorMessage = `Hata kodu: ${error.status}, Mesaj: ${error.error?.message || error.message}`;
      }
    }

    console.error('Sipariş içerikleri getirme hatası:', {
      status: error.status,
      message: errorMessage,
      error: error.error
    });

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Tüm sipariş içeriklerini getirir
   * Bu metod veritabanındaki tüm sipariş-içecek ilişkilerini listeler
   * @returns Tüm sipariş içeriklerinin listesi
   */
  getOrderDrinks(): Observable<OrderDrink[]> {
    console.log('Sipariş içerikleri getiriliyor...');
    return this.http.get<OrderDrink[]>(this.apiUrl).pipe(
      tap(
        response => console.log('Gelen sipariş içerikleri:', response),
        error => console.error('Sipariş içerikleri getirme hatası:', error)
      )
    );
  }

  /**
   * Belirli bir siparişe ait içerikleri getirir
   * @param orderId Sipariş ID'si
   * @returns Belirtilen siparişe ait içeceklerin listesi
   * Örnek: Sipariş ID=1 için tüm içecekleri ve adetlerini getirir
   */
  getOrderDrinksByOrderId(orderId: number): Observable<OrderDrink[]> {
    console.log(`${orderId} ID'li siparişin içerikleri getiriliyor...`);
    return this.http.get<OrderDrink[]>(`${this.apiUrl}/by-order/${orderId}`, { headers: this.getHeaders() }).pipe(
      tap(response => console.log(`${orderId} ID'li siparişin içerikleri:`, response)),
      catchError(this.handleError)
    );
  }

  /**
   * Yeni bir sipariş içeriği oluşturur
   * @param orderDrink Eklenecek sipariş içeriği bilgileri
   * @returns Oluşturulan sipariş içeriği
   * Örnek: {orderid: 1, beverageid: 2, piece: 3} şeklinde bir kayıt oluşturur
   * Bu, 1 numaralı siparişe 2 numaralı içecekten 3 adet eklendiğini gösterir
   */
  createOrderDrink(orderDrink: OrderDrink): Observable<OrderDrink> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    console.log('İçecek siparişi gönderiliyor:', orderDrink);
    return this.http.post<OrderDrink>(this.apiUrl, orderDrink, { headers });
  }
} 