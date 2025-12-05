import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DeletionRequest,
  CreateDeletionRequestDto,
  UpdateDeletionRequestStatusDto,
  DeletionRequestStatus
} from '../models/deletion-request.model';

@Injectable({
  providedIn: 'root'
})
export class DeletionRequestService {
  private apiUrl = `${environment.apiUrl}/deletion-requests`;
  private requestsSubject = new BehaviorSubject<DeletionRequest[]>([]);
  public requests$ = this.requestsSubject.asObservable();

  // Signal pour le compteur de demandes en attente (mise à jour automatique du badge)
  pendingCount = signal<number>(0);

  // Signal pour déclencher les mises à jour (incrémenté à chaque chargement)
  lastUpdate = signal<number>(0);

  constructor(private http: HttpClient) {}

  loadRequests(): void {
    this.http.get<DeletionRequest[]>(this.apiUrl).subscribe({
      next: (requests) => {
        this.requestsSubject.next(requests);
        // Mettre à jour le signal du compteur
        const pending = requests.filter(r => r.status === DeletionRequestStatus.PENDING).length;
        this.pendingCount.set(pending);
        // Incrémenter le signal de mise à jour pour déclencher les recalculs
        this.lastUpdate.update(v => v + 1);
      },
      error: (error) => {
        console.error('[DeletionRequestService] Erreur lors du chargement:', error);
      }
    });
  }

  getAllRequests(): DeletionRequest[] {
    return this.requestsSubject.value;
  }

  getPendingRequests(): DeletionRequest[] {
    return this.requestsSubject.value.filter(r => r.status === DeletionRequestStatus.PENDING);
  }

  getPendingRequestForSale(saleId: string): DeletionRequest | undefined {
    return this.requestsSubject.value.find(
      r => r.saleId === saleId && r.status === DeletionRequestStatus.PENDING
    );
  }

  getRequestById(id: string): DeletionRequest | undefined {
    return this.requestsSubject.value.find(r => r.id === id);
  }

  createRequest(dto: CreateDeletionRequestDto): Observable<DeletionRequest> {
    return this.http.post<DeletionRequest>(this.apiUrl, dto).pipe(
      tap(() => this.loadRequests())
    );
  }

  updateRequestStatus(id: string, dto: UpdateDeletionRequestStatusDto): Observable<DeletionRequest> {
    return this.http.patch<DeletionRequest>(`${this.apiUrl}/${id}/status`, dto).pipe(
      tap(() => this.loadRequests())
    );
  }

  approveRequest(id: string): Observable<DeletionRequest> {
    return this.http.patch<DeletionRequest>(`${this.apiUrl}/${id}/approve`, {}).pipe(
      tap(() => this.loadRequests())
    );
  }

  rejectRequest(id: string, reason: string): Observable<DeletionRequest> {
    return this.http.patch<DeletionRequest>(`${this.apiUrl}/${id}/reject`, {
      adminResponse: reason
    }).pipe(
      tap(() => this.loadRequests())
    );
  }

  cancelRequest(id: string): Observable<DeletionRequest> {
    return this.updateRequestStatus(id, { status: DeletionRequestStatus.CANCELLED });
  }
}
