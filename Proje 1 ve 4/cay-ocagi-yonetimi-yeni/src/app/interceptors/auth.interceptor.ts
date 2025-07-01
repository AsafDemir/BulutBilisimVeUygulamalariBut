import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  
  // İstek detaylarını loglama
  console.log('HTTP İsteği Detayları:', {
    url: req.url,
    method: req.method,
    headers: req.headers.keys().map(key => ({ key, value: req.headers.get(key) })),
    body: req.body,
    timestamp: new Date().toISOString(),
    urlWithoutProxy: req.url.replace('/api', '')
  });
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } else if (!req.headers.has('Content-Type')) {
    // Token yoksa ve Content-Type header'ı yoksa ekleyelim
    req = req.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('💥 HTTP HATA OLUŞTU 💥:', error);

      // Hata detaylarını tam olarak logla
      console.error('Tam hata detayları:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        name: error.name,
        error: typeof error.error === 'string' 
          ? error.error 
          : JSON.stringify(error.error, null, 2),
        url: error.url,
        ok: error.ok,
        type: error.type,
        headers: Array.from(error.headers.keys()).map(key => ({
          key,
          value: error.headers.get(key)
        })),
        timestamp: new Date().toISOString()
      });

      if (error.status === 401) {
        console.log('⚠️ Oturum süresi doldu veya geçersiz token');
        authService.logout();
        router.navigate(['/login']);
      } else if (error.status === 403) {
        console.error('⚠️ Yetkisiz erişim denemesi');
      } else if (error.status === 500) {
        console.error('❌ Sunucu hatası (500):', {
          url: req.url,
          method: req.method,
          body: req.body,
          errorMessage: error.message,
          errorDetails: error.error,
          possibleCause: 'API sunucusunda bir hata oluştu veya CORS yapılandırması eksik'
        });
      } else if (error.status === 0) {
        console.error('🔌 Sunucuya bağlanılamıyor:', {
          url: req.url,
          method: req.method,
          errorMessage: 'CORS hatası veya sunucu çevrimdışı',
          possibleSolution: 'API adresinin doğru olduğunu kontrol edin: https://cayocagiyonetimi-api.azurewebsites.net'
        });
      }

      // Cors check for debugging
      if (error.message && error.message.includes('CORS')) {
        console.error('⚠️ CORS Hatası Tespit Edildi:', {
          originUrl: window.location.origin,
          targetUrl: req.url,
          solution: 'API sunucusunda CORS politikası kontrol edilmeli.'
        });
      }

      return throwError(() => error);
    })
  );
}; 