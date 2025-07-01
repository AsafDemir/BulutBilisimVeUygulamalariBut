import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrinkService } from '../../../services/drink.service';
import { Drink } from '../../../models/drink.model';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * İçecek yönetimi bileşeni
 * İçecek ekleme, silme, güncelleme ve listeleme işlemlerini yönetir
 */
@Component({
  selector: 'icecek-islem',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './icecek-islem.component.html',
  styleUrls: ['./icecek-islem.component.css']
})
export class IcecekIslemComponent implements OnInit, OnDestroy {
  // Tüm içeceklerin listesi
  drinks: Drink[] = [];
  
  // Form için seçili içecek
  selectedDrink: Drink = {
    name: '',
    price: 0,
    active: true,
    pics: ''
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

  constructor(private drinkService: DrinkService) {}

  /**
   * Bileşen başlatıldığında içecekleri yükler
   */
  ngOnInit(): void {
    this.loadDrinks();
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
   * Tüm içecekleri servisten yükler
   */
  loadDrinks(): void {
    console.log('İçecekler yükleniyor...');
    this.yukleniyor = true;
    this.drinkService.getDrinks().subscribe({
      next: (data) => {
        console.log('Yüklenen içecek sayısı (API):', data.length);
        
        // Aktif ve pasif içecek sayılarını kontrol et
        const activeCount = data.filter(drink => drink.active).length;
        const inactiveCount = data.filter(drink => !drink.active).length;
        console.log(`Aktif içecek: ${activeCount}, Pasif içecek: ${inactiveCount}`);
        
        // Verileri doğrudan drinks dizisine kopyala
        this.drinks = [...data];
        
        console.log('Yüklenen içecekler (bileşen):', this.drinks.length);
        console.log('İçecekler:', this.drinks);
        this.yukleniyor = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('İçecekleri yükleme hatası:', error);
        this.mesajGoster('İçecekler yüklenirken bir hata oluştu: ' + error.message, true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * İçecek ekleme veya güncelleme formunu gönderir
   * Düzenleme moduna göre ilgili servisi çağırır
   */
  onSubmit(): void {
    // Form validasyonu
    if (!this.selectedDrink.name || this.selectedDrink.name.trim() === '') {
      this.mesajGoster('İçecek adı boş olamaz', true);
      return;
    }

    if (this.selectedDrink.price === undefined || this.selectedDrink.price <= 0) {
      this.mesajGoster('İçecek fiyatı 0\'dan büyük olmalıdır', true);
      return;
    }

    // İçeceğin güncellenmesi veya eklenmesi
    if (this.isEditing && this.selectedDrink.id) {
      this.yukleniyor = true;
      // İçecek adını önceden saklayalım
      const drinkName = this.selectedDrink.name;
      const drinkID = this.selectedDrink.id;
      
      this.drinkService.updateDrink(this.selectedDrink.id, this.selectedDrink).subscribe({
        next: () => {
          console.log(`İçecek #${drinkID} başarıyla güncellendi`);
          
          // Form işlemlerini yapalım, ama yükleme durumunu false yapmayalım
          this.resetForm();
          
          // Güncelleme başarılı mesajını gösterelim
          this.mesajGoster(`"${drinkName}" isimli içecek başarıyla güncellendi`);
          
          // İçecekleri yeniden yükleyelim
          this.loadDrinksAfterUpdate();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Güncelleme hatası:', error);
          this.mesajGoster(`"${drinkName}" isimli içecek güncellenirken bir hata oluştu: ${error.message}`, true);
          this.yukleniyor = false;
        }
      });
    } else {
      this.yukleniyor = true;
      const drinkName = this.selectedDrink.name; // İçecek adını saklayalım
      
      this.drinkService.addDrink(this.selectedDrink).subscribe({
        next: () => {
          // Form işlemlerini yapalım, ama yükleme durumunu false yapmayalım
          this.resetForm();
          
          // Ekleme başarılı mesajını gösterelim
          this.mesajGoster(`"${drinkName}" isimli içecek başarıyla eklendi`);
          
          // İçecekleri yeniden yükleyelim
          this.loadDrinksAfterUpdate();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Ekleme hatası:', error);
          this.mesajGoster(`"${drinkName}" isimli içecek eklenirken bir hata oluştu: ${error.message}`, true);
          this.yukleniyor = false;
        }
      });
    }
  }
  
  /**
   * Güncelleme veya ekleme sonrası içecekleri yeniden yükler
   */
  loadDrinksAfterUpdate(): void {
    // İçecekleri yeniden yükle, fakat bildirimi etkilemesin
    this.drinkService.getDrinks().subscribe({
      next: (data) => {
        this.drinks = [...data];
        this.yukleniyor = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('İçecekleri yükleme hatası:', error);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * İçeceğin aktif/pasif durumunu değiştirir
   * @param drink Durumu değiştirilecek içecek
   */
  toggleStatus(drink: Drink): void {
    if (!drink.id) {
      console.error('İçecek ID\'si bulunamadı!');
      this.mesajGoster('İçecek ID\'si bulunamadı!', true);
      return;
    }
    
    console.log('Durum değiştiriliyor:', drink.name, 'Mevcut durum:', drink.active);
    const updatedDrink = { ...drink, active: !drink.active };
    const newStatus = updatedDrink.active ? 'aktif' : 'pasif';
    console.log('Yeni durum:', updatedDrink.active);
    
    this.yukleniyor = true;
    this.drinkService.updateDrink(drink.id, updatedDrink).subscribe({
      next: (response) => {
        console.log('İçecek durumu başarıyla güncellendi:', response);
        this.mesajGoster(`"${drink.name}" isimli içecek ${newStatus} durumuna getirildi`);
        this.loadDrinks();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Durum güncelleme hatası:', error);
        
        let hataMetni = `"${drink.name}" isimli içeceğin durumu güncellenirken bir hata oluştu`;
        if (error.status === 405) {
          hataMetni = 'API bu işlemi desteklemiyor. API yöneticisiyle iletişime geçin.';
        } else if (error.error && error.error.message) {
          hataMetni = error.error.message;
        }
        
        this.mesajGoster(hataMetni, true);
        this.yukleniyor = false;
      }
    });
  }

  /**
   * İçecek resmini yükler ve base64 formatında saklar
   * @param event Dosya seçim eventi
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedDrink.pics = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * İçeceği düzenleme modunda açar
   * @param drink Düzenlenecek içecek
   */
  editDrink(drink: Drink): void {
    this.selectedDrink = { ...drink };
    this.isEditing = true;
    this.mesajlariTemizle();
  }

  /**
   * İçeceği sistemden siler
   * @param id Silinecek içecek ID'si
   */
  deleteDrink(id: number): void {
    // Silinecek içeceğin adını bulalım
    const drinkToDelete = this.drinks.find(d => d.id === id);
    const drinkName = drinkToDelete?.name || 'Bilinmeyen içecek';
    
    if (confirm(`"${drinkName}" isimli içeceği silmek istediğinizden emin misiniz?`)) {
      this.yukleniyor = true;
      this.drinkService.deleteDrink(id).subscribe({
        next: () => {
          this.mesajGoster(`"${drinkName}" isimli içecek başarıyla silindi`);
          this.loadDrinks();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Silme hatası:', error);
          this.mesajGoster(`"${drinkName}" isimli içecek silinirken bir hata oluştu: ${error.message}`, true);
          this.yukleniyor = false;
        }
      });
    }
  }

  /**
   * Form alanlarını temizler ve düzenleme modunu kapatır
   */
  resetForm(): void {
    this.selectedDrink = {
      name: '',
      price: 0,
      active: true,
      pics: ''
    };
    this.isEditing = false;
    this.mesajlariTemizle();
  }

  /**
   * Seçili içeceğin resmini kaldırır
   */
  removeImage(): void {
    this.selectedDrink.pics = '';
  }

  // Bileşen yok edildiğinde zamanlayıcıyı temizle
  ngOnDestroy(): void {
    if (this.mesajZamanlayici) {
      clearTimeout(this.mesajZamanlayici);
    }
  }
}
