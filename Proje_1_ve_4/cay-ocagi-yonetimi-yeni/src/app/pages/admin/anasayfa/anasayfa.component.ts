import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgFor, NgIf } from '@angular/common';
import { Order, OrderItem } from '../../../models/order.model';
import { OrderService } from '../../../services/order.service';
import { RoomService } from '../../../services/room.service';
import { Room } from '../../../models/room.model';
import { BeverageService } from '../../../services/beverage.service';
import { OrderDrinkService } from '../../../services/order-drink.service';
import { Beverage } from '../../../models/beverage.model';
import { ApiResponse } from '../../../models/api-response.model';
import { OrderDrink } from '../../../models/order-drink.model';
import { RouterModule } from '@angular/router';

/**
 * Admin paneli ana sayfa bileşeni
 * Bekleyen siparişleri, odaları ve içecekleri yönetir
 */
@Component({
  selector: 'app-anasayfa',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf, RouterModule],
  templateUrl: './anasayfa.component.html',
  styleUrls: ['./anasayfa.component.css'],
  providers: [OrderService, RoomService, BeverageService, OrderDrinkService]
})
export class AnasayfaComponent implements OnInit, OnDestroy {
  // Bekleyen siparişlerin listesi
  orders: Order[] = [];
  // Sistemdeki tüm odaların listesi
  rooms: Room[] = [];
  // Sistemdeki tüm içeceklerin listesi
  beverages: Beverage[] = [];
  // Yükleme sırasında oluşan hata mesajı
  loadingError: string = '';
  // Sipariş içeriklerinin listesi
  orderDrinks: OrderDrink[] = [];
  
  // Hata mesajı
  hataMesaji: string = '';
  
  // Başarı mesajı
  basariMesaji: string = '';

  // Yükleme durumu
  yukleniyor: boolean = true;

  // Mesaj zamanlayıcısı
  private mesajZamanlayici: any;

  /**
   * Bileşen constructor'ı
   * Gerekli servislerin enjekte edilmesi
   */
  constructor(
    private orderService: OrderService,
    private roomService: RoomService,
    private beverageService: BeverageService,
    private orderDrinkService: OrderDrinkService
  ) {}

  /**
   * Bileşen başlatıldığında çalışan yaşam döngüsü kancası
   * Tüm gerekli verileri yükler
   */
  ngOnInit(): void {
    this.loadOrders();
    this.loadRooms();
    this.loadBeverages();
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
   * Sistemdeki tüm içecekleri yükler
   */
  loadBeverages(): void {
    console.log('İçecekler yükleniyor...');
    this.yukleniyor = true;
    this.beverageService.getAllBeverages().subscribe({
      next: (beverages) => {
        console.log('İçecekler alındı:', beverages);
        this.beverages = beverages;
        this.yukleniyor = false;
      },
      error: (error) => {
        console.error('İçecek yükleme hatası:', error);
        this.loadingError = 'İçecekler yüklenirken bir hata oluştu';
        this.mesajGoster('İçecekler yüklenirken bir hata oluştu', true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * Bekleyen siparişleri ve içeriklerini yükler
   * Her sipariş için içecek detaylarını da getirir
   */
  loadOrders(): void {
    console.log('Siparişler yükleniyor...');
    this.yukleniyor = true;
    this.beverageService.getAllBeverages().subscribe({
      next: (beverages) => {
        this.beverages = beverages;

        this.orderService.getPendingOrders().subscribe({
          next: (response: ApiResponse<Order[]>) => {
            if (response.success && Array.isArray(response.data)) {
              this.orders = response.data.map(order => ({
                ...order,
                status: typeof order.status === 'number' ? order.status : Number(order.status)
              }));
              
              this.orders.forEach(order => {
                this.loadOrderDrinks(order.id!);
              });

              this.yukleniyor = false;
            } else {
              console.error('Geçersiz API yanıtı:', response);
              this.loadingError = 'Siparişler yüklenirken bir hata oluştu: Geçersiz veri formatı';
              this.mesajGoster('Siparişler yüklenirken bir hata oluştu: Geçersiz veri formatı', true);
              this.yukleniyor = false;
            }
          },
          error: (error) => {
            console.error('Sipariş yükleme hatası:', error);
            this.loadingError = `Siparişler yüklenirken hata oluştu: ${error.error?.message || error.message}`;
            this.mesajGoster(`Siparişler yüklenirken hata oluştu: ${error.error?.message || error.message}`, true);
            this.yukleniyor = false;
          }
        });
      },
      error: (error) => {
        console.error('İçecek yükleme hatası:', error);
        this.loadingError = 'İçecekler yüklenirken bir hata oluştu';
        this.mesajGoster('İçecekler yüklenirken bir hata oluştu', true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * Sistemdeki tüm odaları yükler
   */
  loadRooms(): void {
    console.log('Odalar yükleniyor...');
    this.yukleniyor = true;
    this.roomService.getRooms().subscribe({
      next: (rooms) => {
        console.log('Odalar alındı:', rooms);
        this.rooms = rooms;
        this.yukleniyor = false;
      },
      error: (error) => {
        console.error('Oda yükleme hatası:', error);
        this.loadingError = 'Odalar yüklenirken bir hata oluştu';
        this.mesajGoster('Odalar yüklenirken bir hata oluştu', true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * Verilen oda ID'sine göre oda adını döndürür
   * @param roomId Oda ID'si
   * @returns Oda adı veya 'Bilinmeyen Oda'
   */
  getRoomName(roomId: number): string {
    const room = this.rooms.find(r => r.id === roomId);
    return room?.name || 'Bilinmeyen Oda';
  }

  /**
   * Siparişi onaylar ve listeyi günceller
   * @param orderId Onaylanacak sipariş ID'si
   */
  approveOrder(orderId: number): void {
    this.yukleniyor = true;
    this.orderService.approveOrder(orderId).subscribe({
      next: () => {
        this.mesajGoster(`Sipariş #${orderId} başarıyla onaylandı`);
        this.loadOrders();
      },
      error: (error) => {
        this.loadingError = 'Sipariş onaylanırken bir hata oluştu';
        this.mesajGoster(`Sipariş #${orderId} onaylanırken bir hata oluştu`, true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * Siparişi reddeder ve listeyi günceller
   * @param orderId Reddedilecek sipariş ID'si
   */
  rejectOrder(orderId: number): void {
    this.yukleniyor = true;
    this.orderService.rejectOrder(orderId).subscribe({
      next: () => {
        this.mesajGoster(`Sipariş #${orderId} başarıyla reddedildi`);
        this.loadOrders();
      },
      error: (error) => {
        this.loadingError = 'Sipariş reddedilirken bir hata oluştu';
        this.mesajGoster(`Sipariş #${orderId} reddedilirken bir hata oluştu`, true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * Siparişteki tüm ürünlerin toplam tutarını hesaplar
   * @param order Hesaplanacak sipariş
   * @returns Toplam tutar
   */
  calculateOrderTotal(order: Order): number {
    if (!order.orderDrinks) return 0;
    
    return order.orderDrinks.reduce((total, drink) => {
      const price = drink.BeverageNavigation?.price || 0;
      return total + (price * drink.piece);
    }, 0);
  }

  /**
   * Sipariş içeriklerini yükler
   * @param orderId Sipariş ID'si
   */
  loadOrderDrinks(orderId: number) {
    this.orderDrinkService.getOrderDrinksByOrderId(orderId).subscribe({
      next: (drinks) => {
        // Her siparişin kendi içeriklerini ayrı ayrı saklayalım
        const orderIndex = this.orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
          // İçecek bilgilerini ekleyelim
          this.orders[orderIndex].orderDrinks = drinks.map(drink => {
            const beverage = this.beverages.find(b => b.id === drink.beverageid);
            return {
              ...drink,
              BeverageNavigation: beverage
            };
          });
        }
      },
      error: (error) => {
        console.error(`Sipariş #${orderId} içerik yükleme hatası:`, error);
        this.mesajGoster(`Sipariş #${orderId} içerikleri yüklenirken bir hata oluştu`, true);
      }
    });
  }

  // Bileşen yok edildiğinde zamanlayıcıyı temizle
  ngOnDestroy(): void {
    if (this.mesajZamanlayici) {
      clearTimeout(this.mesajZamanlayici);
    }
  }
}
