import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, map } from 'rxjs';
import { environment } from '../../environments/environment';

// Kullanıcı rolü enum'ı
export enum UserRole {
  Admin = "Admin",
  User = "User"
}

// Kullanıcı veri transfer objesi
export interface UserDto {
  id: number;
  username: string;
  role: UserRole;
  TicketCount: number; // Frontend'de kullanılan property
  ticketCount?: number; // Backend'den gelen property
  isActive: boolean;
}

// Fiş sayısı güncelleme veri transfer objesi
export interface UpdateTicketCountDto {
  userId: number;
  newTicketCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/user`;

  constructor(private http: HttpClient) {
    console.log('UserService başlatıldı. API URL:', this.apiUrl);
  }

  // Tüm kullanıcıları getir
  getAllUsers(): Observable<UserDto[]> {
    console.log('getAllUsers API çağrısı yapılıyor...');
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(users => {
        return users.map(user => {
          // Backend'den gelen ticketCount değerini TicketCount olarak da ekle
          const userDto: UserDto = {
            ...user,
            TicketCount: user.ticketCount || 0
          };
          return userDto;
        });
      }),
      tap(users => {
        console.log('API yanıtı (getAllUsers):', users);
        // API yanıtının yapısını kontrol et
        if (users && users.length > 0) {
          const sampleUser = users[0];
          console.log('API yanıtındaki örnek kullanıcı:', sampleUser);
          
          // TicketCount özelliğinin varlığını ve tipini kontrol et
          if ('ticketCount' in sampleUser) {
            console.log('ticketCount özelliği mevcut. Tipi:', typeof sampleUser.ticketCount);
            console.log('Değeri:', sampleUser.ticketCount);
            console.log('Dönüştürülmüş TicketCount değeri:', sampleUser.TicketCount);
          } else {
            console.warn('ticketCount özelliği kullanıcı nesnesinde bulunamadı!');
            // Kullanıcı nesnesinin tüm özelliklerini listele
            console.log('Kullanıcı nesnesinin özellikleri:', Object.keys(sampleUser));
          }
        } else {
          console.warn('API boş bir kullanıcı listesi döndü veya veri formatı beklendiği gibi değil!');
        }
      }),
      catchError(error => {
        console.error('getAllUsers API çağrısında hata:', error);
        throw error;
      })
    );
  }

  // Belirli bir kullanıcıyı getir
  getUserById(id: number): Observable<UserDto> {
    console.log(`getUserById API çağrısı yapılıyor. ID: ${id}`);
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(user => {
        const userDto: UserDto = {
          ...user,
          TicketCount: user.ticketCount || 0
        };
        return userDto;
      }),
      tap(user => {
        console.log('API yanıtı (getUserById):', user);
        // TicketCount özelliğinin varlığını ve tipini kontrol et
        if (user && 'ticketCount' in user) {
          console.log('ticketCount özelliği mevcut. Tipi:', typeof user.ticketCount);
          console.log('Değeri:', user.ticketCount);
          console.log('Dönüştürülmüş TicketCount değeri:', user.TicketCount);
        } else {
          console.warn('ticketCount özelliği kullanıcı nesnesinde bulunamadı!');
        }
      }),
      catchError(error => {
        console.error(`getUserById (ID: ${id}) API çağrısında hata:`, error);
        throw error;
      })
    );
  }

  // Kullanıcının fiş sayısını güncelle
  updateTicketCount(dto: UpdateTicketCountDto): Observable<any> {
    console.log('updateTicketCount API çağrısı yapılıyor. Veri:', dto);
    return this.http.put(`${this.apiUrl}/ticket-count`, dto).pipe(
      tap(response => {
        console.log('API yanıtı (updateTicketCount):', response);
      }),
      catchError(error => {
        console.error('updateTicketCount API çağrısında hata:', error);
        throw error;
      })
    );
  }

  // Kullanıcıyı deaktif et
  deactivateUser(id: number): Observable<any> {
    console.log(`deactivateUser API çağrısı yapılıyor. ID: ${id}`);
    return this.http.post(`${this.apiUrl}/${id}/deactivate`, {}, { responseType: 'text' }).pipe(
      tap(response => {
        console.log('API yanıtı (deactivateUser):', response);
      }),
      catchError(error => {
        console.error(`deactivateUser (ID: ${id}) API çağrısında hata:`, error);
        throw error;
      })
    );
  }

  // Kullanıcıyı aktif et
  activateUser(id: number): Observable<any> {
    console.log(`activateUser API çağrısı yapılıyor. ID: ${id}`);
    return this.http.post(`${this.apiUrl}/${id}/activate`, {}, { responseType: 'text' }).pipe(
      tap(response => {
        console.log('API yanıtı (activateUser):', response);
      }),
      catchError(error => {
        console.error(`activateUser (ID: ${id}) API çağrısında hata:`, error);
        throw error;
      })
    );
  }

  // Kullanıcının fiş sayısını getir
  getUserTicketCount(id: number): Observable<number> {
    console.log(`getUserTicketCount API çağrısı yapılıyor. ID: ${id}`);
    return this.http.get<number>(`${this.apiUrl}/${id}/ticket-count`).pipe(
      tap(count => {
        console.log('API yanıtı (getUserTicketCount):', count);
        console.log('Fiş sayısı tipi:', typeof count);
      }),
      catchError(error => {
        console.error(`getUserTicketCount (ID: ${id}) API çağrısında hata:`, error);
        throw error;
      })
    );
  }
} 