import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrinkService } from '../../../services/drink.service';
import { RoomService } from '../../../services/room.service';
import { OrderService } from '../../../services/order.service';
import { OrderDrinkService } from '../../../services/order-drink.service';
import { Drink } from '../../../models/drink.model';
import { Room } from '../../../models/room.model';
import { OrderStatus } from '../../../models/order-status.enum';
import { forkJoin, firstValueFrom } from 'rxjs';
import { AppComponent } from '../../../app.component';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Sipariş verme bileşeni
 * Kullanıcıların içecek siparişi vermesini sağlar
 */
@Component({
  selector: 'siparis-ver',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './siparis-ver.component.html',
  styleUrls: ['./siparis-ver.component.css']
})
export class SiparisVerComponent implements OnInit, OnDestroy {
  // Aktif içeceklerin listesi
  drinks: Drink[] = [];
  // Mevcut odaların listesi
  rooms: Room[] = [];
  // Sepetteki ürünler
  cart: { drink: Drink, quantity: number }[] = [];
  // Seçili oda ID'si
  selectedRoom: number | null = null;
  // Sipariş notu
  orderNote: string = '';
  kullaniciFisSayisi: number = 0; // Kullanıcının sahip olduğu fiş sayısı
  pricesLoaded: boolean = false; // Fiyatların güncellenme durumunu takip etmek için
  
  // Hata mesajı
  hataMesaji: string = '';
  
  // Başarı mesajı
  basariMesaji: string = '';

  // Yükleme durumu
  yukleniyor: boolean = true;

  // Mesaj zamanlayıcısı
  private mesajZamanlayici: any;
  
  constructor(
    private drinkService: DrinkService,
    private roomService: RoomService,
    private orderService: OrderService,
    private orderDrinkService: OrderDrinkService,
    private appComponent: AppComponent,
    private userService: UserService,
    private authService: AuthService
  ) {
    this.appComponent.isUserPage = true;
  }

  /**
   * Bileşen başlatıldığında gerekli verileri yükler
   */
  ngOnInit(): void {
    this.loadDrinks();
    this.loadRooms();
    this.loadCartFromStorage();
    this.getKullaniciFisSayisi();
  }

  // Mesajı göster ve zamanlayıcıyı başlat
  mesajGoster(mesaj: string, hata: boolean = false): void {
    // Varsa önceki zamanlayıcıyı temizle
    this.mesajlariTemizle();

    // Mesajı ayarla
    if (hata) {
      this.hataMesaji = mesaj;
      this.basariMesaji = '';
    } else {
      this.basariMesaji = mesaj;
      this.hataMesaji = '';
    }

    // 5 saniye sonra mesajı temizle
    this.mesajZamanlayici = setTimeout(() => {
      this.hataMesaji = '';
      this.basariMesaji = '';
    }, 5000);
  }

  // Mesajları temizle
  mesajlariTemizle(): void {
    if (this.mesajZamanlayici) {
      clearTimeout(this.mesajZamanlayici);
    }
    this.hataMesaji = '';
    this.basariMesaji = '';
  }

  /**
   * Sepeti local storage'dan yükler
   */
  private loadCartFromStorage(): void {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      this.cart = JSON.parse(savedCart);
      this.pricesLoaded = false; // Fiyatlar güncelleniyor
      
      // Sepetteki her içeceğin fiyatını güncellemek için Promise'ler oluştur
      if (this.cart.length > 0) {
        const updatePromises = this.cart.map((item) => {
          return this.drinkService.getDrink(item.drink.id!).toPromise()
            .then(drinkFromApi => {
              if (drinkFromApi && drinkFromApi.price) {
                item.drink.price = drinkFromApi.price;
                console.log(`İçecek güncellemesi: ${drinkFromApi.name || 'İsimsiz'}, Fiyat: ${drinkFromApi.price}`);
              } else {
                console.warn(`İçecek fiyatı bulunamadı: ${item.drink.id}`);
              }
            })
            .catch(err => {
              console.error(`İçecek fiyatı güncellenirken hata: ${err}`);
            });
        });
        
        // Tüm fiyatlar güncellendiğinde
        Promise.all(updatePromises)
          .then(() => {
            console.log('Tüm içecek fiyatları güncellendi');
            console.log(`Sepet toplamı: ${this.getCartTotal()}`);
            this.pricesLoaded = true; // Fiyatlar güncellendi
          })
          .catch(err => {
            console.error('Fiyat güncellemesi sırasında hata:', err);
            this.pricesLoaded = true; // Hata olsa da devam et
          });
      } else {
        this.pricesLoaded = true; // Sepet boşsa, fiyat güncellemeye gerek yok
      }
    } else {
      this.pricesLoaded = true; // Sepet yoksa, fiyat güncellemeye gerek yok
    }
  }

  /**
   * Sepeti local storage'a kaydeder
   */
  private saveCartToStorage(): void {
    localStorage.setItem('cart', JSON.stringify(this.cart));
  }

  /**
   * Tüm içecekleri servisten yükler
   * Aktif olmayan içecekler de gösterilir ama pasif olarak işaretlenir
   */
  loadDrinks(): void {
    console.log('Sipariş ekranı - Tüm içecekler yükleniyor...');
    this.yukleniyor = true;
    
    // Yeni eklenen with-inactive endpoint'ini kullan
    this.drinkService.getAllDrinksWithInactive().subscribe({
      next: (drinks) => {
        console.log('Sipariş ekranı - Yüklenen içecek sayısı:', drinks.length);
        
        // Tüm içecekleri göster (aktif ve pasif)
        this.drinks = drinks;
        
        // Aktif ve pasif içecek sayılarını kontrol et
        const activeCount = this.drinks.filter(d => d.active).length;
        const inactiveCount = this.drinks.filter(d => !d.active).length;
        console.log(`Sipariş ekranı - Aktif içecek: ${activeCount}, Pasif içecek: ${inactiveCount}, Toplam: ${this.drinks.length}`);
        this.yukleniyor = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('İçecekleri yükleme hatası:', error);
        // Fallback: Yeni endpoint çalışmazsa eski yöntemi kullan
        if (error.status === 404) {
          console.warn('with-inactive endpoint bulunamadı, manuel yönteme dönülüyor...');
          this.loadDrinksLegacy();
        } else {
          this.mesajGoster('İçecekler yüklenirken bir hata oluştu!', true);
          this.yukleniyor = false;
        }
      }
    });
  }

  /**
   * Eski yöntem - Manuel pasif içecek ekleme
   * API'de with-inactive endpoint'i olmadığında bu metot kullanılır
   */
  private loadDrinksLegacy(): void {
    // Standart API endpoint'ini kullan - sadece aktif içecekleri getir
    this.drinkService.getActiveDrinks().subscribe({
      next: (drinks) => {
        console.log('Sipariş ekranı (Legacy) - Aktif içecek sayısı:', drinks.length);
        
        // Bu noktada backend'den sadece aktif içecekler alındığı için
        // pasif içecekleri kendiniz ekleyebilirsiniz
        const additionalInactiveDrinks: Drink[] = [
          {
            id: 2, // Bilinen pasif içecek ID'si
            name: 'Türk Kahvesi',
            price: 15,
            active: false,
            pics: undefined // Resim olmadığı için undefined yapıyoruz
          }
          // Diğer bilinen pasif içecekleri buraya ekleyebilirsiniz
        ];
        
        // Tüm içecekleri birleştir (aktif olanlar API'den, pasif olanlar manuel)
        this.drinks = [...drinks, ...additionalInactiveDrinks];
        
        // Aktif ve pasif içecek sayılarını kontrol et
        const activeCount = this.drinks.filter(d => d.active).length;
        const inactiveCount = this.drinks.filter(d => !d.active).length;
        console.log(`Sipariş ekranı (Legacy) - Aktif içecek: ${activeCount}, Pasif içecek: ${inactiveCount}, Toplam: ${this.drinks.length}`);
        this.yukleniyor = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('İçecekleri yükleme hatası:', error);
        this.mesajGoster('İçecekler yüklenirken bir hata oluştu!', true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * Odaları servisten yükler
   */
  loadRooms(): void {
    this.roomService.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Odaları yükleme hatası:', error);
        this.mesajGoster('Odalar yüklenirken bir hata oluştu!', true);
      }
    });
  }

  /**
   * Belirli bir içeceğin sepetteki miktarını döndürür
   * @param drink Kontrol edilecek içecek
   * @returns Sepetteki miktar
   */
  getQuantityInCart(drink: Drink): number {
    const cartItem = this.cart.find(item => item.drink.id === drink.id);
    return cartItem ? cartItem.quantity : 0;
  }

  /**
   * Sepetteki bir içeceğin miktarını azaltır
   * @param drink Miktarı azaltılacak içecek
   */
  decreaseQuantity(drink: Drink): void {
    if (!drink.active) {
      // Bu içecek artık aktif değil, sepetten çıkarılması gerekiyor
      this.mesajGoster(`${drink.name} şu anda mevcut değil ve sipariş verilemez.`, true);
      this.removeFromCartByDrinkId(drink.id!);
      return;
    }

    const cartItemIndex = this.cart.findIndex(item => item.drink.id === drink.id);
    if (cartItemIndex !== -1) {
      // Miktarı azalt, 0'sa sepetten çıkar
      if (this.cart[cartItemIndex].quantity > 1) {
        this.cart[cartItemIndex].quantity--;
      } else {
        this.cart.splice(cartItemIndex, 1);
      }
      this.saveCartToStorage();
    }
  }

  /**
   * Sepete ürün ekler
   * @param drink Sepete eklenecek içecek
   */
  addToCart(drink: Drink): void {
    if (!drink.active) {
      // Bu içecek aktif değil, sepete eklenemez
      this.mesajGoster(`${drink.name} şu anda mevcut değil ve sipariş verilemez.`, true);
      return;
    }

    // Sepette bu içecek var mı kontrol et
    const cartItemIndex = this.cart.findIndex(item => item.drink.id === drink.id);
    if (cartItemIndex !== -1) {
      // Varsa miktarını artır
      this.cart[cartItemIndex].quantity++;
    } else {
      // Yoksa sepete ekle
      this.cart.push({
        drink: drink,
        quantity: 1
      });
    }
    this.saveCartToStorage();
  }

  /**
   * Sepetten ürün çıkarır
   * @param index Sepetten çıkarılacak ürünün indeksi
   */
  removeFromCart(index: number): void {
    if (index >= 0 && index < this.cart.length) {
      this.cart.splice(index, 1);
      this.saveCartToStorage();
    }
  }

  /**
   * İçecek ID'sine göre sepetten ürün çıkarır
   * @param drinkId Sepetten çıkarılacak içeceğin ID'si
   */
  removeFromCartByDrinkId(drinkId: number): void {
    const cartItemIndex = this.cart.findIndex(item => item.drink.id === drinkId);
    if (cartItemIndex !== -1) {
      this.cart.splice(cartItemIndex, 1);
      this.saveCartToStorage();
    }
  }

  /**
   * Sepet toplamını hesaplar
   * @returns Sepet toplamı
   */
  getCartTotal(): number {
    return this.cart.reduce((total, item) => {
      return total + ((item.drink.price ?? 0) * item.quantity);
    }, 0);
  }

  /**
   * Siparişi gönderir
   */
  submitOrder(): void {
    // Önce fiyatların güncellenmiş olduğunu kontrol et
    if (!this.pricesLoaded) {
      this.mesajGoster('Lütfen bekleyin, içecek fiyatları güncelleniyor...', true);
      return;
    }

    // Sepette pasif içecek var mı kontrol et
    const inactiveItems = this.cart.filter(item => !item.drink.active);
    if (inactiveItems.length > 0) {
      const inactiveNames = inactiveItems.map(item => item.drink.name).join(', ');
      this.mesajGoster(`Sepetinizde mevcut olmayan içecekler var: ${inactiveNames}. Bu içecekleri sepetten çıkarın.`, true);
      return;
    }

    // Toplam fiş sayısı yeterli mi kontrol et
    const sepetToplam = this.getCartTotal();
    if (sepetToplam > this.kullaniciFisSayisi) {
      this.mesajGoster(`Yetersiz fiş! Sepet toplamı: ${sepetToplam}, Mevcut fişiniz: ${this.kullaniciFisSayisi}`, true);
      return;
    }

    // Oda seçilmiş mi kontrol et
    if (!this.selectedRoom) {
      this.mesajGoster('Lütfen bir oda seçin', true);
      return;
    }

    // Sepet boş mu kontrol et
    if (this.cart.length === 0) {
      this.mesajGoster('Sepetiniz boş', true);
      return;
    }

    // Sipariş oluştur
    const orderData = {
      roomid: this.selectedRoom,
      totalAmount: this.getCartTotal(),
      notes: this.orderNote,
      status: OrderStatus.Pending // Beklemede durumu ile başlat
    };

    // Yükleniyor durumunu göster
    this.yukleniyor = true;

    // Siparişi kaydet
    this.orderService.createOrder(orderData).subscribe({
      next: async (createdOrder) => {
        console.log('Sipariş oluşturuldu:', createdOrder);

        try {
          // Sipariş içeriklerini kaydet
          const orderDrinkPromises = this.cart.map(cartItem => {
            // ID değerleri için tip kontrolü yaparak hataları engelleyelim
            if (!createdOrder.order?.id || !cartItem.drink.id) {
              throw new Error('Sipariş ID veya içecek ID değeri eksik');
            }
            
            const orderDrinkData = {
              orderid: createdOrder.order.id,
              beverageid: cartItem.drink.id,
              piece: cartItem.quantity
            };
            
            return firstValueFrom(this.orderDrinkService.createOrderDrink(orderDrinkData));
          });

          // Tüm içerik kayıtlarını bekle
          const results = await Promise.all(orderDrinkPromises);
          console.log('Sipariş içerikleri kaydedildi:', results);

          // Siparişi tamamla
          this.resetOrder();
          
          // Mesaj göster
          this.mesajGoster('Siparişiniz başarıyla oluşturuldu');
          
          // Kullanıcı fiş sayısını güncelle
          this.getKullaniciFisSayisi();
          
          // Yükleme durumunu kapat
          this.yukleniyor = false;
        } catch (error) {
          console.error('Sipariş içerikleri kaydedilirken hata:', error);
          
          if (error instanceof HttpErrorResponse && error.error && error.error.message) {
            this.mesajGoster(error.error.message, true);
          } else {
            this.mesajGoster('Sipariş içerikleri kaydedilirken bir hata oluştu', true);
          }
          
          // Siparişi iptal etmek gerekebilir burada
          
          // Yükleme durumunu kapat
          this.yukleniyor = false;
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Sipariş oluşturulurken hata:', error);
        
        let errorMessage = 'Sipariş oluşturulurken bir hata oluştu';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        this.mesajGoster(errorMessage, true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * Siparişi sıfırlar
   */
  resetOrder(): void {
    this.cart = []; // Sepeti temizle
    this.selectedRoom = null; // Oda seçimini sıfırla
    this.orderNote = ''; // Notu temizle
    localStorage.removeItem('cart'); // Local storage'dan sepeti sil
    this.mesajlariTemizle();
  }

  /**
   * Kullanıcının fiş sayısını getirir
   */
  getKullaniciFisSayisi(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userService.getUserById(user.id).subscribe({
        next: (user) => {
          console.log('Kullanıcı bilgileri:', user);
          this.kullaniciFisSayisi = user.TicketCount;
          console.log('Kullanıcı fiş sayısı:', this.kullaniciFisSayisi);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Kullanıcı bilgileri getirilirken hata:', error);
          
          if (error.status === 401 || error.status === 403) {
            // Oturum sonlandırılmış olabilir
            this.authService.logout();
            window.location.href = '/login';
          } else {
            this.mesajGoster('Kullanıcı bilgileri getirilirken bir hata oluştu', true);
          }
        }
      });
    }
  }

  /**
   * Çıkış yapar
   */
  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }

  // Bileşen yok edildiğinde zamanlayıcıyı temizle
  ngOnDestroy(): void {
    if (this.mesajZamanlayici) {
      clearTimeout(this.mesajZamanlayici);
    }
  }
}
