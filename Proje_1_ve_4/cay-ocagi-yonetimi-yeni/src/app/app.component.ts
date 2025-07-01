import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule]
})
export class AppComponent implements OnInit {
  title = 'Çay Ocağı Yönetimi';
  isUserPage = false;
  isLoginPage = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Router olaylarını dinleyerek sayfada olup olmadığımızı kontrol et
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updatePageStatus(event.url);
    });
  }

  ngOnInit(): void {
    // Başlangıçta mevcut URL'ye göre durumu kontrol et
    this.updatePageStatus(this.router.url);
  }

  // Sayfa durumunu güncelleme
  private updatePageStatus(url: string): void {
    // Login sayfasında mıyız?
    this.isLoginPage = url === '/login';
    // Kullanıcı sayfasında mıyız?
    this.isUserPage = url.includes('/siparis-ver') || url.includes('/user');
    
    console.log('Sayfa durumu güncellendi:', {
      url,
      isLoginPage: this.isLoginPage,
      isUserPage: this.isUserPage,
      isLoggedIn: this.authService.isLoggedIn(),
      isAdmin: this.authService.isAdmin()
    });
  }

  // Çıkış yapma fonksiyonu
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}