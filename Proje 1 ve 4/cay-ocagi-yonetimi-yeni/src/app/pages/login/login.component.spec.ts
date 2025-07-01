import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    // Mocklar
    authServiceMock = {
      login: jasmine.createSpy('login'),
      isAdmin: jasmine.createSpy('isAdmin')
    };
    routerMock = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form invalid when empty', () => {
    expect(component.loginForm.valid).toBeFalsy();
  });

  it('username field validity', () => {
    const username = component.loginForm.get('username');
    expect(username?.valid).toBeFalsy();

    username?.setValue('');
    expect(username?.hasError('required')).toBeTruthy();

    username?.setValue('test');
    expect(username?.valid).toBeTruthy();
  });

  it('password field validity', () => {
    const password = component.loginForm.get('password');
    expect(password?.valid).toBeFalsy();

    password?.setValue('');
    expect(password?.hasError('required')).toBeTruthy();

    password?.setValue('password');
    expect(password?.valid).toBeTruthy();
  });

  it('should call auth service on form submit', () => {
    authServiceMock.login.and.returnValue(of({}));
    authServiceMock.isAdmin.and.returnValue(true);

    component.loginForm.setValue({
      username: 'admin',
      password: 'password'
    });
    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith('admin', 'password');
    expect(authServiceMock.isAdmin).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should navigate to user page for non-admin users', () => {
    authServiceMock.login.and.returnValue(of({}));
    authServiceMock.isAdmin.and.returnValue(false);

    component.loginForm.setValue({
      username: 'user',
      password: 'password'
    });
    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith('user', 'password');
    expect(authServiceMock.isAdmin).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/siparis-ver']);
  });

  it('should handle login error', () => {
    authServiceMock.login.and.returnValue(throwError(() => new Error('Invalid credentials')));

    component.loginForm.setValue({
      username: 'invalid',
      password: 'wrong'
    });
    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith('invalid', 'wrong');
    expect(component.error).toBe('Kullanıcı adı veya şifre hatalı');
    expect(component.loading).toBe(false);
  });
}); 