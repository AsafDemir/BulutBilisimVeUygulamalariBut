import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../services/order.service';
import { RoomService } from '../../../services/room.service';
import { BeverageService } from '../../../services/beverage.service';
import { Order, OrderItem } from '../../../models/order.model';
import { Room } from '../../../models/room.model';
import { Beverage } from '../../../models/beverage.model';
import { OrderStatus } from '../../../models/order-status.enum';
import { OrderDrinkService } from '../../../services/order-drink.service';
import { OrderDrink } from '../../../models/order-drink.model';

/**
 * Tamamlanan siparişler bileşeni
 * Onaylanmış ve reddedilmiş siparişlerin listesini gösterir
 */
@Component({
  selector: 'app-tamamlanan-siparisler',
  templateUrl: './tamamlanan-siparisler.component.html',
  styleUrls: ['./tamamlanan-siparisler.component.css'],
  imports: [CommonModule],
  providers: [OrderService, RoomService, BeverageService, OrderDrinkService],
  standalone: true
})
export class TamamlananSiparislerComponent implements OnInit {
  // Tamamlanmış siparişlerin listesi
  orders: Order[] = [];
  // Sistemdeki tüm odaların listesi
  rooms: Room[] = [];
  // Sistemdeki tüm içeceklerin listesi
  beverages: Beverage[] = [];
  // Yükleme sırasında oluşan hata mesajı
  loadingError: string = '';
  // Sipariş durumu enum'u template'de kullanmak için
  OrderStatus = OrderStatus;

  constructor(
    private orderService: OrderService,
    private roomService: RoomService,
    private beverageService: BeverageService,
    private orderDrinkService: OrderDrinkService
  ) {}

  /**
   * Bileşen başlatıldığında gerekli verileri yükler
   */
  ngOnInit(): void {
    console.log('TamamlananSiparislerComponent başlatılıyor...');
    this.loadOrders();
    this.loadRooms();
    this.loadBeverages();
  }

  /**
   * Tamamlanmış siparişleri ve içeriklerini yükler
   * Her sipariş için içecek detaylarını da getirir
   */
  loadOrders(): void {
    console.log('Tamamlanan siparişler yükleniyor...');
    this.beverageService.getAllBeverages().subscribe({
      next: (beverages) => {
        this.beverages = beverages;

        this.orderService.getCompletedOrders().subscribe({
          next: (orders) => {
            this.orders = orders.map(order => {
              const numericStatus = typeof order.status === 'number' ? order.status : 
                                  typeof order.status === 'string' ? parseInt(order.status) : 
                                  Number(order.status);
              
              return {
                ...order,
                status: numericStatus
              };
            });
            
            this.orders.forEach(order => {
              this.orderDrinkService.getOrderDrinksByOrderId(order.id!).subscribe({
                next: (orderDrinks) => {
                  order.orderDrinks = orderDrinks.map(od => {
                    const drink = this.beverages.find(b => b.id === od.beverageid);
                    return {
                      ...od,
                      BeverageNavigation: drink || undefined
                    };
                  });
                },
                error: (error) => {
                  console.error(`Sipariş ${order.id} içerikleri yüklenirken hata:`, error);
                  this.loadingError = `Sipariş içerikleri yüklenirken hata oluştu: ${error.error?.message || error.message}`;
                }
              });
            });
          },
          error: (error) => {
            console.error('Sipariş yükleme hatası:', error);
            this.loadingError = `Siparişler yüklenirken hata oluştu: ${error.error?.message || error.message}`;
          }
        });
      },
      error: (error) => {
        console.error('İçecek yükleme hatası:', error);
        this.loadingError = 'İçecekler yüklenirken bir hata oluştu';
      }
    });
  }

  /**
   * Sistemdeki tüm odaları yükler
   */
  loadRooms(): void {
    console.log('Odalar yükleniyor...');
    this.roomService.getRooms().subscribe({
      next: (rooms) => {
        console.log('Odalar alındı:', rooms);
        this.rooms = rooms;
      },
      error: (error) => {
        console.error('Oda yükleme hatası:', error);
        this.loadingError = 'Odalar yüklenirken bir hata oluştu';
      }
    });
  }

  /**
   * Sistemdeki tüm içecekleri yükler
   */
  loadBeverages(): void {
    console.log('İçecekler yükleniyor...');
    this.beverageService.getAllBeverages().subscribe({
      next: (beverages) => {
        console.log('İçecekler alındı:', beverages);
        this.beverages = beverages;
      },
      error: (error) => {
        console.error('İçecek yükleme hatası:', error);
        this.loadingError = 'İçecekler yüklenirken bir hata oluştu';
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
   * Siparişteki tüm ürünlerin toplam tutarını hesaplar
   * @param order Hesaplanacak sipariş
   * @returns Toplam tutar
   */
  calculateOrderTotal(order: Order): number {
    if (!order.orderDrinks) return 0;
    
    return order.orderDrinks.reduce((total: number, drink: OrderDrink) => {
      const price = drink.BeverageNavigation?.price || 0;
      return total + (price * drink.piece);
    }, 0);
  }

  /**
   * Sipariş durumunun metin karşılığını döndürür
   * @param status Sipariş durumu enum değeri
   * @returns Durumun Türkçe metin karşılığı
   */
  getOrderStatusText(status: OrderStatus): string {
    const numericStatus = typeof status === 'number' ? status : 
                         typeof status === 'string' ? parseInt(status) : 
                         Number(status);

    if (numericStatus === OrderStatus.Approved) {
      return 'Onaylandı';
    } else if (numericStatus === OrderStatus.Rejected) {
      return 'Reddedildi';
    } else {
      console.error('Beklenmeyen durum değeri:', numericStatus);
      return 'Bilinmeyen Durum';
    }
  }
}
