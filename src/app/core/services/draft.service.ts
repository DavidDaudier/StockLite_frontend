import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DraftItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface Draft {
  id: string;
  saleNumber: string;
  sellerId: string;
  items: DraftItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DraftService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/sales`;

  getDrafts(): Observable<Draft[]> {
    return this.http.get<Draft[]>(`${this.apiUrl}/drafts`);
  }

  createDraft(draftData: any): Observable<Draft> {
    return this.http.post<Draft>(`${this.apiUrl}/draft`, draftData);
  }

  completeDraft(id: string): Observable<Draft> {
    return this.http.patch<Draft>(`${this.apiUrl}/${id}/complete`, {});
  }

  deleteDraft(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/draft/${id}`);
  }
}
