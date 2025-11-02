import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sale, CreateSaleDto, SalesStats } from '../models/sale.model';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private apiUrl = `${environment.apiUrl}/sales`;

  constructor(private http: HttpClient) {}

  getAll(sellerId?: string, startDate?: string, endDate?: string): Observable<Sale[]> {
    let params = new HttpParams();
    if (sellerId) params = params.set('sellerId', sellerId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<Sale[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<Sale> {
    return this.http.get<Sale>(`${this.apiUrl}/${id}`);
  }

  getTodaySales(): Observable<Sale[]> {
    return this.http.get<Sale[]>(`${this.apiUrl}/today`);
  }

  getStats(sellerId?: string, startDate?: string, endDate?: string): Observable<SalesStats> {
    let params = new HttpParams();
    if (sellerId) params = params.set('sellerId', sellerId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<SalesStats>(`${this.apiUrl}/stats`, { params });
  }

  create(sale: CreateSaleDto): Observable<Sale> {
    return this.http.post<Sale>(this.apiUrl, sale);
  }

  syncSales(saleIds: string[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/sync`, { saleIds });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
