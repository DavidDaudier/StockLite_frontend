import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sale, CreateSaleDto, SalesStats } from '../models/sale.model';
import { DraftService } from './draft.service';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private apiUrl = `${environment.apiUrl}/sales`;
  private draftService = inject(DraftService);

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

  // Draft management methods
  getDrafts(): Observable<Sale[]> {
    return this.http.get<Sale[]>(`${this.apiUrl}/drafts`);
  }

  createDraft(sale: CreateSaleDto): Observable<Sale> {
    return this.http.post<Sale>(`${this.apiUrl}/draft`, sale).pipe(
      tap(() => this.draftService.refreshDraftsCount())
    );
  }

  completeDraft(id: string): Observable<Sale> {
    return this.http.patch<Sale>(`${this.apiUrl}/${id}/complete`, {}).pipe(
      tap(() => this.draftService.refreshDraftsCount())
    );
  }

  deleteDraft(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/draft/${id}`).pipe(
      tap(() => this.draftService.refreshDraftsCount())
    );
  }
}
