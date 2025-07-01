import { Routes } from '@angular/router';
import { AnasayfaComponent } from './pages/admin/anasayfa/anasayfa.component';
import { TamamlananSiparislerComponent } from './pages/admin/tamamlanan-siparisler/tamamlanan-siparisler.component';
import { IcecekIslemComponent } from './pages/admin/icecek-islem/icecek-islem.component';
import { OdaIslemComponent } from './pages/admin/oda-islem/oda-islem.component';
import { SiparisVerComponent } from './pages/user/siparis-ver/siparis-ver.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { KullaniciIslemComponent } from './pages/admin/kullanici-islem/kullanici-islem.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // Admin sayfaları
  { 
    path: 'admin', 
    component: AnasayfaComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  { 
    path: 'tamamlanan-siparisler', 
    component: TamamlananSiparislerComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  { 
    path: 'icecek-islem', 
    component: IcecekIslemComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  { 
    path: 'oda-islem', 
    component: OdaIslemComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  { 
    path: 'kullanici-islem', 
    component: KullaniciIslemComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },

  // Kullanıcı sayfaları
  { 
    path: 'siparis-ver', 
    component: SiparisVerComponent, 
    canActivate: [AuthGuard] 
  },
  
  { path: '**', redirectTo: 'login' }
];
