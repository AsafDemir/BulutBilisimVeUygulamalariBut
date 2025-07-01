import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Beverage {
  id: number;
  name: string;
  price: number;
  pics?: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BeverageService {
  private apiUrl = `${environment.apiUrl}/beverages`;

  constructor(private http: HttpClient) { }

  getAllBeverages(): Observable<Beverage[]> {
    console.log('İçecekler getiriliyor:', this.apiUrl);
    return this.http.get<Beverage[]>(this.apiUrl);
  }

  getBeverage(id: number): Observable<Beverage> {
    return this.http.get<Beverage>(`${this.apiUrl}/${id}`);
  }

  createBeverage(beverage: Beverage): Observable<Beverage> {
    return this.http.post<Beverage>(this.apiUrl, beverage);
  }

  updateBeverage(beverage: Beverage): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${beverage.id}`, beverage);
  }

  deleteBeverage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
} 