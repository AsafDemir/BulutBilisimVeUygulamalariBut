import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError } from 'rxjs';
import { Drink } from '../models/drink.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * İçecek işlemlerini yöneten servis
 * İçecek ekleme, silme, güncelleme ve listeleme işlemlerini gerçekleştirir
 */
@Injectable({
  providedIn: 'root',
})
export class DrinkService {
  // API endpoint URL'i
  private apiUrl = `${environment.apiUrl}/beverages`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * API yanıtlarındaki içecek verilerini işler ve düzenler
   * Bu metot, API'den dönen verilerin doğru işlenmesini sağlar
   * @param response API yanıtı
   * @returns İşlenmiş içecek listesi
   */
  private processDrinkResponse(response: any): Drink[] {
    console.log('İşlenen API yanıtı:', response);
    
    if (Array.isArray(response)) {
      // Dizinin boş veya dolu olduğunu kontrol et
      console.log(`Dizi formatında yanıt: ${response.length} içecek`);
      
      // İçeceklerin doğru formatta olduğunu kontrol et
      const validDrinks = response.filter(item => {
        const isValid = (item && typeof item === 'object');
        if (!isValid) {
          console.warn('Geçersiz içecek verisi:', item);
        }
        return isValid;
      });
      
      console.log(`Geçerli içecek sayısı: ${validDrinks.length}`);
      return validDrinks;
    } 
    else if (response && typeof response === 'object') {
      // Tek bir içecek nesnesi geldi, bir diziye çevir
      console.log('Tek içecek nesnesi yanıtı:', response);
      return [response];
    }
    
    // Beklenmeyen yanıt formatı
    console.warn('Beklenmeyen API yanıt formatı:', response);
    return [];
  }

  /**
   * Tüm içecekleri getirir (Admin için)
   * @returns İçecek listesi observable'ı
   */
  getDrinks(): Observable<Drink[]> {
    console.log('İçecekler getiriliyor...');
    
    // Admin için tüm içecekleri getiren (aktif ve pasif) endpoint'i kullan
    // User için ise hem aktif hem pasif içecekleri getir
    const endpointUrl = `${this.apiUrl}/all`;
    console.log('Kullanılan endpoint:', endpointUrl);
    
    return this.http.get<any>(endpointUrl).pipe(
      tap(
        response => {
          console.log('API yanıtı:', response);
          
          // API yanıtını işle
          const drinks = this.processDrinkResponse(response);
          
          console.log('API yanıtı içecek sayısı:', drinks.length);
          // Her bir içecek için durum bilgisi
          drinks.forEach(drink => {
            console.log(`İçecek: ${drink.name}, ID: ${drink.id}, Aktif: ${drink.active}`);
          });
        },
        error => console.error('API hatası:', error)
      ),
      // Yanıtı düzenle
      map(response => this.processDrinkResponse(response)),
      catchError(error => {
        // Admin olmayan kullanıcı /all endpointine erişemediği durumda
        // standart endpointi dene
        if (error.status === 403) {
          console.warn('/all endpoint erişimi engellendi, standart endpoint deneniyor');
          return this.getAllDrinksForUser();
        }
        throw error;
      })
    );
  }

  /**
   * Tüm içecekleri (aktif ve pasif olanlar) getirir
   * Bu metot yeni eklenen /with-inactive endpoint'ini kullanır
   * @returns İçecek listesi observable'ı
   */
  getAllDrinksWithInactive(): Observable<Drink[]> {
    console.log('Tüm içecekler (aktif ve pasif) getiriliyor...');
    
    // Yeni eklenen with-inactive endpoint'ini kullan
    const endpointUrl = `${this.apiUrl}/with-inactive`;
    console.log('Kullanılan endpoint:', endpointUrl);
    
    return this.http.get<any>(endpointUrl).pipe(
      tap(
        response => {
          console.log('with-inactive API yanıtı:', response);
          
          // API yanıtını işle
          const drinks = this.processDrinkResponse(response);
          
          // Her bir içecek için durum bilgisi
          const activeCount = drinks.filter(d => d.active).length;
          const inactiveCount = drinks.filter(d => !d.active).length;
          console.log(`API yanıtı toplam: ${drinks.length}, Aktif: ${activeCount}, Pasif: ${inactiveCount}`);
        },
        error => console.error('with-inactive API hatası:', error)
      ),
      // Yanıtı düzenle
      map(response => this.processDrinkResponse(response))
    );
  }

  /**
   * Kullanıcılar için tüm içecekleri getirir
   * Bu metot sadece admin olmayan kullanıcılar için /all endpointi
   * erişim engeli olduğunda kullanılır
   */
  private getAllDrinksForUser(): Observable<Drink[]> {
    // Normal API endpointini kullan
    console.log('Kullanıcı için standart içecek endpointi kullanılıyor');
    
    return this.http.get<any>(this.apiUrl).pipe(
      tap(
        response => console.log('Standart endpoint yanıtı:', response),
        error => console.error('Standart endpoint hatası:', error)
      ),
      map(response => this.processDrinkResponse(response))
    );
  }

  /**
   * Sadece aktif içecekleri getirir
   * Bu metot kullanıcı sipariş ekranı için kullanılır
   * @returns Aktif içecek listesi observable'ı
   */
  getActiveDrinks(): Observable<Drink[]> {
    console.log('Aktif içecekler getiriliyor...');
    
    // Normal API endpoint'i (sadece aktif içecekleri döndüren)
    return this.http.get<any>(this.apiUrl).pipe(
      tap(
        response => {
          console.log('Aktif içecek API yanıtı:', response);
          console.log('Aktif içecek sayısı:', response.length);
        },
        error => console.error('Aktif içecek API hatası:', error)
      ),
      // Yanıtı düzenle
      map(response => this.processDrinkResponse(response))
    );
  }

  /**
   * Belirli bir içeceği ID'ye göre getirir
   * @param id İçecek ID'si
   * @returns İçecek detayı observable'ı
   */
  getDrink(id: number): Observable<Drink> {
    return this.http.get<Drink>(`${this.apiUrl}/${id}`);
  }

  /**
   * Yeni içecek ekler
   * @param drink Eklenecek içecek bilgileri
   * @returns Eklenen içecek observable'ı
   */
  addDrink(drink: Drink): Observable<Drink> {
    return this.http.post<Drink>(this.apiUrl, drink);
  }

  /**
   * İçecek bilgilerini günceller
   * @param id Güncellenecek içecek ID'si
   * @param drink Güncellenmiş içecek bilgileri
   * @returns Güncelleme sonucu observable'ı
   */
  updateDrink(id: number, drink: Drink): Observable<any> {
    console.log('İçecek güncelleniyor:', id, drink);
    
    // API'nin döndürdüğü içeceğin güncel durumunu kontrol et
    return this.http.put(`${this.apiUrl}/${id}`, drink).pipe(
      tap(
        response => {
          console.log('Güncelleme başarılı:', response);
          // API yanıtını kontrol et
          const responseObj = response as any;
          if (responseObj) {
            console.log('API yanıt detayları:', {
              id: responseObj.id,
              name: responseObj.name,
              active: responseObj.active
            });
            
            // Dönüş değeri beklediğimiz içecek detayları içeriyor mu?
            if (responseObj.active !== undefined) {
              console.log(`İçecek ${responseObj.name} durumu: ${responseObj.active ? 'aktif' : 'pasif'}`);
            } else {
              console.warn('API içecek aktiflik durumunu döndürmedi!');
            }
          }
        },
        error => console.error('Güncelleme hatası:', error)
      )
    );
  }

  /**
   * İçeceği sistemden siler
   * @param id Silinecek içecek ID'si
   * @returns Silme işlemi sonucu observable'ı
   */
  deleteDrink(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
} 