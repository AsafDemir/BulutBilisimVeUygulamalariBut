import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../../services/room.service';
import { Room } from '../../../models/room.model';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Oda yönetimi bileşeni
 * Oda ekleme, silme, güncelleme ve listeleme işlemlerini yönetir
 */
@Component({
  selector: 'oda-islem',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oda-islem.component.html',
  styleUrls: ['./oda-islem.component.css']
})
export class OdaIslemComponent implements OnInit, OnDestroy {
  // Sistemdeki tüm odaların listesi
  rooms: Room[] = [];
  
  // Form için seçili oda
  selectedRoom: Room = {
    id: 0,
    name: ''
  };
  
  // Düzenleme modunda olup olmadığını belirtir
  isEditing = false;

  // Hata mesajı
  hataMesaji: string = '';
  
  // Başarı mesajı
  basariMesaji: string = '';

  // Yükleme durumu
  yukleniyor: boolean = true;

  // Mesaj zamanlayıcısı
  private mesajZamanlayici: any;

  constructor(private roomService: RoomService) {}

  /**
   * Bileşen başlatıldığında odaları yükler
   */
  ngOnInit(): void {
    this.loadRooms();
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
   * Sistemdeki tüm odaları yükler
   */
  loadRooms(): void {
    console.log('Odalar yükleniyor...');
    this.yukleniyor = true;
    this.roomService.getRooms().subscribe({
      next: (data) => {
        console.log('Yüklenen odalar:', data);
        this.rooms = data;
        this.yukleniyor = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Oda yükleme hatası:', error);
        this.mesajGoster('Odalar yüklenirken bir hata oluştu: ' + error.message, true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * Güncelleme veya ekleme sonrası odaları yeniden yükler
   */
  loadRoomsAfterUpdate(): void {
    // Odaları yeniden yükle, fakat bildirimi etkilemesin
    this.roomService.getRooms().subscribe({
      next: (data) => {
        this.rooms = data;
        this.yukleniyor = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Odaları yükleme hatası:', error);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * Oda ekleme veya güncelleme formunu gönderir
   * Düzenleme moduna göre ilgili servisi çağırır
   */
  onSubmit(): void {
    // Form validasyonu - oda adı boş kontrolü
    if (!this.selectedRoom.name || this.selectedRoom.name.trim() === '') {
      this.mesajGoster('Oda adı boş olamaz', true);
      return;
    }

    if (this.isEditing) {
      this.yukleniyor = true;
      const roomName = this.selectedRoom.name;
      
      console.log('Oda güncelleniyor:', this.selectedRoom);
      this.roomService.updateRoom(this.selectedRoom.id!, this.selectedRoom).subscribe({
        next: () => {
          console.log('Oda başarıyla güncellendi');
          // Form işlemlerini yapalım
          this.resetForm();
          
          // Güncelleme başarılı mesajını gösterelim
          this.mesajGoster(`"${roomName}" isimli oda başarıyla güncellendi`);
          
          // Odaları yeniden yükleyelim
          this.loadRoomsAfterUpdate();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Güncelleme hatası:', error);
          this.mesajGoster(`"${roomName}" isimli oda güncellenirken bir hata oluştu: ${error.message}`, true);
          this.yukleniyor = false;
        }
      });
    } else {
      this.yukleniyor = true;
      const roomName = this.selectedRoom.name;
      
      console.log('Yeni oda ekleniyor:', this.selectedRoom);
      this.roomService.addRoom(this.selectedRoom).subscribe({
        next: () => {
          console.log('Oda başarıyla eklendi');
          // Form işlemlerini yapalım
          this.resetForm();
          
          // Ekleme başarılı mesajını gösterelim
          this.mesajGoster(`"${roomName}" isimli oda başarıyla eklendi`);
          
          // Odaları yeniden yükleyelim
          this.loadRoomsAfterUpdate();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Ekleme hatası:', error);
          this.mesajGoster(`"${roomName}" isimli oda eklenirken bir hata oluştu: ${error.message}`, true);
          this.yukleniyor = false;
        }
      });
    }
  }

  /**
   * Odayı düzenleme modunda açar
   * @param room Düzenlenecek oda
   */
  editRoom(room: Room): void {
    console.log('Düzenlenecek oda:', room);
    this.selectedRoom = { ...room };
    this.isEditing = true;
  }

  /**
   * Odayı sistemden siler
   * @param id Silinecek oda ID'si
   */
  deleteRoom(id: number): void {
    // Silinecek odanın adını bulalım
    const roomToDelete = this.rooms.find(r => r.id === id);
    const roomName = roomToDelete?.name || 'Bilinmeyen oda';
    
    if (confirm(`"${roomName}" isimli odayı silmek istediğinizden emin misiniz?`)) {
      this.yukleniyor = true;
      console.log('Silinecek oda ID:', id);
      this.roomService.deleteRoom(id).subscribe({
        next: () => {
          console.log('Oda başarıyla silindi');
          this.mesajGoster(`"${roomName}" isimli oda başarıyla silindi`);
          this.loadRoomsAfterUpdate();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Silme hatası:', error);
          this.mesajGoster(`"${roomName}" isimli oda silinirken bir hata oluştu: ${error.message}`, true);
          this.yukleniyor = false;
        }
      });
    }
  }

  /**
   * Form alanlarını temizler ve düzenleme modunu kapatır
   */
  resetForm(): void {
    this.selectedRoom = {
      id: 0,
      name: ''
    };
    this.isEditing = false;
  }

  // Bileşen yok edildiğinde zamanlayıcıyı temizle
  ngOnDestroy(): void {
    if (this.mesajZamanlayici) {
      clearTimeout(this.mesajZamanlayici);
    }
  }
}
