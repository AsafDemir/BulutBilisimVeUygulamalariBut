import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService, UserDto, UserRole, UpdateTicketCountDto } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-kullanici-islem',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [UserService, AuthService],
  templateUrl: './kullanici-islem.component.html',
  styleUrls: ['./kullanici-islem.component.css']
})
export class KullaniciIslemComponent implements OnInit, OnDestroy {
  // Kullanıcı listesi
  kullanicilar: UserDto[] = [];
  
  // Seçili kullanıcı
  seciliKullanici: UserDto | null = null;
  
  // Yeni fiş sayısı
  yeniFisSayisi: number = 0;
  
  // Hata mesajı
  hataMesaji: string = '';
  
  // Başarı mesajı
  basariMesaji: string = '';

  // Yükleme durumu
  yukleniyor: boolean = true;

  // Mesaj zamanlayıcısı
  private mesajZamanlayici: any;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Kullanıcının admin olup olmadığını kontrol et
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']); // Ana sayfaya yönlendir
      return;
    }
    
    this.kullanicilariGetir();
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

    // 4.7 saniye sonra mesajı temizle - CSS animasyonu ile aynı sürede
    this.mesajZamanlayici = setTimeout(() => {
      this.hataMesaji = '';
      this.basariMesaji = '';
    }, 4700);
  }

  // Mesajları temizle
  mesajlariTemizle(): void {
    if (this.mesajZamanlayici) {
      clearTimeout(this.mesajZamanlayici);
    }
    this.hataMesaji = '';
    this.basariMesaji = '';
  }

  // Tüm kullanıcıları getir
  kullanicilariGetir(): void {
    this.yukleniyor = true;
    
    // Seçili kullanıcı ID'sini saklayalım
    const seciliKullaniciId = this.seciliKullanici?.id;
    
    this.userService.getAllUsers().subscribe({
      next: (kullanicilar: UserDto[]) => {
        this.kullanicilar = kullanicilar;
        
        // Eğer önceden seçili bir kullanıcı varsa, güncel bilgilerle güncelle
        if (seciliKullaniciId) {
          const guncelKullanici = this.kullanicilar.find(k => k.id === seciliKullaniciId);
          if (guncelKullanici) {
            this.seciliKullanici = guncelKullanici;
            this.yeniFisSayisi = guncelKullanici.TicketCount;
          }
        }
        
        this.yukleniyor = false;
      },
      error: (hata: HttpErrorResponse) => {
        if (hata.status === 401 || hata.status === 403) {
          this.mesajGoster('Bu sayfaya erişim yetkiniz bulunmamaktadır.', true);
          this.router.navigate(['/']);
        } else {
          this.mesajGoster('Kullanıcılar getirilirken bir hata oluştu: ' + hata.message, true);
        }
        this.yukleniyor = false;
      }
    });
  }

  // Kullanıcı seç
  kullaniciSec(kullanici: UserDto): void {
    this.seciliKullanici = kullanici;
    this.yeniFisSayisi = kullanici.TicketCount;
    this.mesajlariTemizle();
  }

  // Fiş sayısını güncelle
  fisSayisiGuncelle(): void {
    if (!this.seciliKullanici) {
      this.mesajGoster('Lütfen bir kullanıcı seçin', true);
      return;
    }

    const dto: UpdateTicketCountDto = {
      userId: this.seciliKullanici.id,
      newTicketCount: this.yeniFisSayisi
    };

    this.userService.updateTicketCount(dto).subscribe({
      next: () => {
        this.mesajGoster('Fiş sayısı başarıyla güncellendi');
        this.kullanicilariGetir();
      },
      error: (hata: HttpErrorResponse) => {
        this.mesajGoster('Fiş sayısı güncellenirken bir hata oluştu: ' + hata.message, true);
      }
    });
  }

  // 100 fiş ekle
  yuzFisEkle(): void {
    if (!this.seciliKullanici) {
      this.mesajGoster('Lütfen bir kullanıcı seçin', true);
      return;
    }

    this.yeniFisSayisi += 100;
    this.mesajGoster('100 fiş eklendi');
  }

  // Kullanıcıyı deaktif et
  kullaniciyiDeaktifEt(): void {
    if (!this.seciliKullanici) {
      this.mesajGoster('Lütfen bir kullanıcı seçin', true);
      return;
    }

    this.yukleniyor = true;
    const username = this.seciliKullanici.username;

    this.userService.deactivateUser(this.seciliKullanici.id).subscribe({
      next: () => {
        console.log('Kullanıcı başarıyla deaktif edildi');
        
        // Seçili kullanıcı durumunu anında güncelle
        if (this.seciliKullanici) {
          this.seciliKullanici.isActive = false;
          
          // Kullanıcılar listesindeki kullanıcıyı da güncelle
          const kullaniciIndex = this.kullanicilar.findIndex(k => k.id === this.seciliKullanici!.id);
          if (kullaniciIndex !== -1) {
            this.kullanicilar[kullaniciIndex].isActive = false;
          }
        }
        
        this.mesajGoster(`"${username}" kullanıcısı başarıyla deaktif edildi`);
        this.yukleniyor = false;
        
        // Burada kullanıcıları tekrar getirme işlemini geciktiriyoruz
        // böylece önce UI güncellenir, ardından arka planda veri yenilenir
        setTimeout(() => {
          this.kullanicilariGetir();
        }, 500);
      },
      error: (hata: HttpErrorResponse) => {
        console.error('Deaktif etme hatası:', hata);
        // Hata mesajını daha anlamlı hale getiriyoruz
        let hataMesaji = `"${username}" kullanıcısı deaktif edilirken bir hata oluştu`;
        
        if (hata.status === 0) {
          hataMesaji += ': Sunucuya bağlanılamadı';
        } else if (hata.status) {
          hataMesaji += `: ${hata.status} ${hata.statusText}`;
        } else if (hata.message) {
          hataMesaji += `: ${hata.message}`;
        }
        
        this.mesajGoster(hataMesaji, true);
        this.yukleniyor = false;
      }
    });
  }

  // Kullanıcıyı aktif et
  kullaniciyiAktifEt(): void {
    if (!this.seciliKullanici) {
      this.mesajGoster('Lütfen bir kullanıcı seçin', true);
      return;
    }

    this.yukleniyor = true;
    const username = this.seciliKullanici.username;

    this.userService.activateUser(this.seciliKullanici.id).subscribe({
      next: () => {
        console.log('Kullanıcı başarıyla aktif edildi');
        
        // Seçili kullanıcı durumunu anında güncelle
        if (this.seciliKullanici) {
          this.seciliKullanici.isActive = true;
          
          // Kullanıcılar listesindeki kullanıcıyı da güncelle
          const kullaniciIndex = this.kullanicilar.findIndex(k => k.id === this.seciliKullanici!.id);
          if (kullaniciIndex !== -1) {
            this.kullanicilar[kullaniciIndex].isActive = true;
          }
        }
        
        this.mesajGoster(`"${username}" kullanıcısı başarıyla aktif edildi`);
        this.yukleniyor = false;
        
        // Burada kullanıcıları tekrar getirme işlemini geciktiriyoruz
        // böylece önce UI güncellenir, ardından arka planda veri yenilenir
        setTimeout(() => {
          this.kullanicilariGetir();
        }, 500);
      },
      error: (hata: HttpErrorResponse) => {
        console.error('Aktif etme hatası:', hata);
        // Hata mesajını daha anlamlı hale getiriyoruz
        let hataMesaji = `"${username}" kullanıcısı aktif edilirken bir hata oluştu`;
        
        if (hata.status === 0) {
          hataMesaji += ': Sunucuya bağlanılamadı';
        } else if (hata.status) {
          hataMesaji += `: ${hata.status} ${hata.statusText}`;
        } else if (hata.message) {
          hataMesaji += `: ${hata.message}`;
        }
        
        this.mesajGoster(hataMesaji, true);
        this.yukleniyor = false;
      }
    });
  }

  // Kullanıcı seçimini kapat
  kullaniciSeciminiKapat(): void {
    this.seciliKullanici = null;
    this.yeniFisSayisi = 0;
    this.mesajlariTemizle();
  }

  // Kullanıcı rolünü Türkçe olarak döndür
  getRolAdi(rol: UserRole): string {
    return rol === UserRole.Admin ? 'Yönetici' : 'Kullanıcı';
  }

  // Kullanıcı durumunu Türkçe olarak döndür
  getDurumAdi(aktif: boolean): string {
    return aktif ? 'Aktif' : 'Pasif';
  }

  // Bileşen yok edildiğinde zamanlayıcıyı temizle
  ngOnDestroy(): void {
    if (this.mesajZamanlayici) {
      clearTimeout(this.mesajZamanlayici);
    }
  }
} 