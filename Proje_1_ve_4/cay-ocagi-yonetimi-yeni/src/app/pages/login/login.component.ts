import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    console.log('📝 Login form gönderiliyor...');
    this.submitted = true;

    if (this.loginForm.invalid) {
      console.warn('⚠️ Form geçerli değil:', this.loginForm.errors);
      return;
    }

    this.loading = true;
    this.error = '';

    const username = this.loginForm.get('username')?.value;
    const password = this.loginForm.get('password')?.value;

    if (username && password) {
      console.log('🔒 Giriş denemesi:', { username });
      
      this.authService.login(username, password)
        .subscribe({
          next: () => {
            console.log('✅ Giriş başarılı, rol:', this.authService.isAdmin() ? 'Admin' : 'User');
            
            setTimeout(() => {
              console.log('🔄 Yönlendirme yapılıyor...');
              if (this.authService.isAdmin()) {
                this.router.navigate(['/admin']);
              } else {
                this.router.navigate(['/siparis-ver']);
              }
            }, 100);
          },
          error: error => {
            console.error('❌ Login Bileşeni - Hata:', error);
            this.error = error.message || 'Kullanıcı adı veya şifre hatalı';
            
            if (error.message && error.message.includes('veritabanı')) {
              console.error('💾 Veritabanı hatası tespit edildi:', error.message);
              this.error = 'Veritabanı bağlantı hatası. Lütfen sistem yöneticisiyle iletişime geçin.';
            }
            
            this.loading = false;
          }
        });
    }
  }
} 