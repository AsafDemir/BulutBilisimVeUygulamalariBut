import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface User {
  id: number;
  username: string;
  token: string;
  role: 'Admin' | 'User';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Local storage'dan kullanıcı bilgisini al
    const user = localStorage.getItem('user');
    if (user) {
      this.userSubject.next(JSON.parse(user));
    }
  }

  login(username: string, password: string): Observable<any> {
    console.log('🔐 Login isteği başlatılıyor:', { 
      url: `${this.apiUrl}/login`,
      body: { username, password: '***gizli***' },
      timestamp: new Date().toISOString()
    });
    
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap({
          next: response => {
            console.log('✅ Backend yanıtı alındı:', {
              response: response,
              timestamp: new Date().toISOString()
            });
            
            if (!response || !response.token) {
              console.error('❌ Token alınamadı:', response);
              throw new Error('Geçersiz sunucu yanıtı: Token bulunamadı');
            }
            
            // Token formatını kontrol et
            const token = response.token;
            console.log('🔑 Alınan token:', token.substring(0, 20) + '...');
            
            try {
              // Backend'den gelen role bilgisini kullan
              const payload = JSON.parse(atob(token.split('.')[1]));
              console.log('📄 Token payload:', payload);
              
              const user: User = {
                id: payload.nameid || payload.sub || payload.id || payload.userId || payload.UserId || payload.userID || payload.Id || payload.ID || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || 0,
                username,
                token: token,
                role: this.extractRoleFromToken(token)
              };
              
              console.log('👤 Oluşturulan kullanıcı objesi:', user);
              
              localStorage.setItem('user', JSON.stringify(user));
              console.log('💾 LocalStorage kontrol:', localStorage.getItem('user') ? 'Kullanıcı verisi kaydedildi' : 'Kayıt başarısız');
              
              this.userSubject.next(user);
  
              console.log('🧢 Kullanıcı rolü:', user.role);
              
              // Role göre yönlendirme
              if (user.role === 'Admin') {
                console.log('👑 Admin rolü tespit edildi');
              } else {
                console.log('👨‍💼 User rolü tespit edildi');
              }
            } catch (error) {
              console.error('❌ Token parsing hatası:', error);
              throw new Error('Token yapısı işlenirken hata oluştu');
            }
          },
          error: error => {
            console.error('❌ Login hatası detayları:', {
              status: error.status,
              statusText: error.statusText,
              error: error.error,
              message: error.message,
              url: `${this.apiUrl}/login`,
              requestBody: { username, password: '***gizli***' },
              timestamp: new Date().toISOString(),
              fullErrorObject: JSON.stringify(error)
            });

            if (error.status === 0) {
              throw new Error('Sunucuya bağlanılamıyor. SSL sertifikası veya CORS sorunu olabilir. API adresinin doğru yapılandırıldığından emin olun: https://cayocagiyonetimi-api.azurewebsites.net');
            } else if (error.status === 401) {
              throw new Error('Kullanıcı adı veya şifre hatalı');
            } else if (error.status === 404) {
              throw new Error('API endpoint bulunamadı. API URL kontrol edilmeli.');
            } else if (error.status === 500) {
              let errorMessage = 'Sunucu hatası (500). API tarafında bir sorun var veya CORS yapılandırması eksik olabilir.';
              if (error.error && typeof error.error === 'string' && error.error.includes('ConnectionString')) {
                errorMessage = 'Veritabanı bağlantı dizesi hatası: Azure PostgreSQL bağlantısı yapılandırması kontrol edilmeli.';
              }
              throw new Error(errorMessage);
            } else {
              throw new Error(`Giriş yapılırken bir hata oluştu: ${error.message} (${error.status})`);
            }
          }
        })
      );
  }

  private extractRoleFromToken(token: string): 'Admin' | 'User' {
    try {
      // Token'ı parçalara ayır
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Geçersiz JWT token formatı');
        return 'User'; // Varsayılan olarak User
      }

      // Token'ın payload kısmını decode et
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('Token payload:', payload);

      // role claim'ini kontrol et
      const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role;
      console.log('Bulunan rol:', role);

      return role === 'Admin' ? 'Admin' : 'User';
    } catch (error) {
      console.error('Token parse hatası:', error);
      return 'User'; // Hata durumunda varsayılan olarak User
    }
  }

  logout() {
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  getToken(): string | null {
    const user = this.userSubject.value;
    return user ? user.token : null;
  }

  isAdmin(): boolean {
    const user = this.userSubject.value;
    return user?.role === 'Admin';
  }

  isUser(): boolean {
    const user = this.userSubject.value;
    return user?.role === 'User';
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  /**
   * Kullanıcı bilgilerini günceller
   * @param user Güncellenecek kullanıcı bilgileri
   */
  updateUser(user: User): void {
    this.userSubject.next(user);
    localStorage.setItem('user', JSON.stringify(user));
  }
} 