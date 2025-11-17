import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

// Note: Vous devrez installer socket.io-client: npm install socket.io-client @types/socket.io-client

declare const io: any;

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: any;
  private connected$ = new Subject<boolean>();

  // Événements
  private newSale$ = new Subject<any>();
  private productUpdate$ = new Subject<any>();
  private stockAlert$ = new Subject<any>();
  private lowStockAlert$ = new Subject<any>();
  private newDeletionRequest$ = new Subject<any>();
  private deletionRequestApproved$ = new Subject<any>();
  private deletionRequestRejected$ = new Subject<any>();

  constructor() {}

  connect(userId: string, role: string): void {
    if (this.socket && this.socket.connected) {
      console.log('⚠️ WebSocket déjà connecté');
      return;
    }

    try {
      // Assurez-vous d'avoir installé socket.io-client
      // npm install socket.io-client
      this.socket = (window as any).io(environment.wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket connecté');
        this.connected$.next(true);

        // Enregistrer l'utilisateur
        this.socket.emit('register', { userId, role });
      });

      this.socket.on('disconnect', () => {
        console.log('🔴 WebSocket déconnecté');
        this.connected$.next(false);
      });

      this.socket.on('reconnect', (attemptNumber: number) => {
        console.log(`🔄 WebSocket reconnecté après ${attemptNumber} tentative(s)`);
        this.socket.emit('register', { userId, role });
      });

      // Écouter les événements métier
      this.socket.on('new-sale', (data: any) => {
        console.log('🛒 Nouvelle vente reçue:', data);
        this.newSale$.next(data);
      });

      this.socket.on('product-updated', (data: any) => {
        console.log('📦 Produit mis à jour:', data);
        this.productUpdate$.next(data);
      });

      this.socket.on('stock-alert', (data: any) => {
        console.log('⚠️ Alerte stock:', data);
        this.stockAlert$.next(data);
      });

      this.socket.on('low-stock-alert', (data: any) => {
        console.log('🔻 Alerte stock faible:', data);
        this.lowStockAlert$.next(data);
      });

      this.socket.on('sale-update', (data: any) => {
        console.log('🔄 Mise à jour vente:', data);
        this.newSale$.next(data);
      });

      this.socket.on('product-update', (data: any) => {
        console.log('🔄 Mise à jour produit:', data);
        this.productUpdate$.next(data);
      });

      // Événements de demandes de suppression
      this.socket.on('new-deletion-request', (data: any) => {
        console.log('📨 Nouvelle demande de suppression:', data);
        this.newDeletionRequest$.next(data);
      });

      this.socket.on('deletion-request-approved', (data: any) => {
        console.log('✅ Demande de suppression approuvée:', data);
        this.deletionRequestApproved$.next(data);
      });

      this.socket.on('deletion-request-rejected', (data: any) => {
        console.log('❌ Demande de suppression rejetée:', data);
        this.deletionRequestRejected$.next(data);
      });

      this.socket.on('error', (error: any) => {
        console.error('❌ Erreur WebSocket:', error);
      });
    } catch (error) {
      console.error('❌ Erreur connexion WebSocket:', error);
      console.warn('💡 Assurez-vous d\'avoir installé socket.io-client: npm install socket.io-client');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔴 WebSocket déconnecté manuellement');
    }
  }

  isConnected(): boolean {
    return this.socket && this.socket.connected;
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  // Événements de vente
  onNewSale(): Observable<any> {
    return this.newSale$.asObservable();
  }

  emitSaleCreated(sale: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('sale-created', sale);
    }
  }

  // Événements de produit
  onProductUpdate(): Observable<any> {
    return this.productUpdate$.asObservable();
  }

  emitProductUpdated(product: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('product-updated', product);
    }
  }

  // Événements d'alerte
  onStockAlert(): Observable<any> {
    return this.stockAlert$.asObservable();
  }

  onLowStockAlert(): Observable<any> {
    return this.lowStockAlert$.asObservable();
  }

  emitStockAlert(data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('stock-alert', data);
    }
  }

  // Événements de demandes de suppression
  onNewDeletionRequest(): Observable<any> {
    return this.newDeletionRequest$.asObservable();
  }

  onDeletionRequestApproved(): Observable<any> {
    return this.deletionRequestApproved$.asObservable();
  }

  onDeletionRequestRejected(): Observable<any> {
    return this.deletionRequestRejected$.asObservable();
  }
}
