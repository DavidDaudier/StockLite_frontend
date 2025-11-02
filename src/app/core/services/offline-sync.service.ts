import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { IndexedDBService } from './indexeddb.service';
import { environment } from '../../../environments/environment';

export interface SyncQueueItem {
  id: string;
  type: 'sale' | 'product' | 'stock';
  data: any;
  timestamp: Date;
  synced: boolean;
  attempts: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private isOnline$ = new BehaviorSubject<boolean>(true);
  private syncInProgress$ = new BehaviorSubject<boolean>(false);
  private lastSyncTime$ = new BehaviorSubject<Date | null>(null);
  private isBrowser: boolean;

  private readonly apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private readonly maxRetries = 3;

  constructor(
    private http: HttpClient,
    private indexedDB: IndexedDBService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.isOnline$.next(navigator.onLine);
      this.initNetworkMonitoring();
      this.initAutoSync();
    }
  }

  /**
   * Surveille l'état de la connexion Internet
   */
  private initNetworkMonitoring(): void {
    if (!this.isBrowser) return;

    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false)),
      of(navigator.onLine)
    ).pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(isOnline => {
      console.log(isOnline ? '🟢 En ligne' : '🔴 Hors ligne');
      this.isOnline$.next(isOnline);

      if (isOnline) {
        this.syncAllPendingData();
      }
    });
  }

  /**
   * Synchronisation automatique toutes les 5 minutes si en ligne
   */
  private initAutoSync(): void {
    setInterval(() => {
      if (this.isOnline$.value && !this.syncInProgress$.value) {
        this.syncAllPendingData();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Retourne un Observable de l'état de connexion
   */
  getOnlineStatus(): Observable<boolean> {
    return this.isOnline$.asObservable();
  }

  /**
   * Retourne un Observable de l'état de synchronisation
   */
  getSyncStatus(): Observable<boolean> {
    return this.syncInProgress$.asObservable();
  }

  /**
   * Retourne un Observable de la dernière sync
   */
  getLastSyncTime(): Observable<Date | null> {
    return this.lastSyncTime$.asObservable();
  }

  /**
   * Vérifie si l'application est en ligne
   */
  isOnline(): boolean {
    return this.isOnline$.value;
  }

  /**
   * Ajoute une vente à la queue de synchronisation
   */
  async addSaleToQueue(sale: any): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: sale.id || this.generateId(),
      type: 'sale',
      data: sale,
      timestamp: new Date(),
      synced: false,
      attempts: 0
    };

    await this.indexedDB.put('syncQueue', queueItem);
    await this.indexedDB.put('sales', { ...sale, synced: false });

    console.log('📦 Vente ajoutée à la queue:', queueItem.id);

    if (this.isOnline()) {
      await this.syncAllPendingData();
    }
  }

  /**
   * Synchronise toutes les données en attente
   */
  async syncAllPendingData(): Promise<void> {
    if (this.syncInProgress$.value) {
      console.log('⏳ Synchronisation déjà en cours...');
      return;
    }

    if (!this.isOnline()) {
      console.log('🔴 Impossible de synchroniser: hors ligne');
      return;
    }

    this.syncInProgress$.next(true);

    try {
      console.log('🔄 Début de la synchronisation...');

      const unsyncedItems = await this.indexedDB.getAllByIndex<SyncQueueItem>(
        'syncQueue',
        'synced',
        false
      );

      console.log(`📊 ${unsyncedItems.length} élément(s) à synchroniser`);

      let successCount = 0;
      let failedCount = 0;

      for (const item of unsyncedItems) {
        if (item.attempts >= this.maxRetries) {
          console.warn(`⚠️ Item ${item.id} a atteint le nombre max de tentatives`);
          failedCount++;
          continue;
        }

        try {
          await this.syncItem(item);
          item.synced = true;
          await this.indexedDB.put('syncQueue', item);
          successCount++;
        } catch (error) {
          console.error(`❌ Erreur sync item ${item.id}:`, error);
          item.attempts++;
          await this.indexedDB.put('syncQueue', item);
          failedCount++;
        }
      }

      console.log(`✅ Synchronisation terminée: ${successCount} réussi(s), ${failedCount} échoué(s)`);

      this.lastSyncTime$.next(new Date());
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
    } finally {
      this.syncInProgress$.next(false);
    }
  }

  /**
   * Synchronise un élément spécifique
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'sale':
        await this.syncSale(item.data);
        break;
      case 'product':
        await this.syncProduct(item.data);
        break;
      case 'stock':
        await this.syncStockUpdate(item.data);
        break;
      default:
        throw new Error(`Type non supporté: ${item.type}`);
    }
  }

  /**
   * Synchronise une vente avec le serveur
   */
  private async syncSale(saleData: any): Promise<void> {
    try {
      const response = await this.http.post<any>(
        `${this.apiUrl}/sales`,
        saleData
      ).toPromise();

      console.log('✅ Vente synchronisée:', response);

      // Mettre à jour la vente locale avec l'ID serveur
      await this.indexedDB.put('sales', {
        ...saleData,
        serverId: response.id,
        synced: true
      });
    } catch (error) {
      console.error('❌ Erreur synchronisation vente:', error);
      throw error;
    }
  }

  /**
   * Synchronise un produit
   */
  private async syncProduct(productData: any): Promise<void> {
    try {
      const response = await this.http.put<any>(
        `${this.apiUrl}/products/${productData.id}`,
        productData
      ).toPromise();

      console.log('✅ Produit synchronisé:', response);

      await this.indexedDB.put('products', response);
    } catch (error) {
      console.error('❌ Erreur synchronisation produit:', error);
      throw error;
    }
  }

  /**
   * Synchronise une mise à jour de stock
   */
  private async syncStockUpdate(stockData: any): Promise<void> {
    try {
      const response = await this.http.patch<any>(
        `${this.apiUrl}/products/${stockData.productId}`,
        { quantity: stockData.newQuantity }
      ).toPromise();

      console.log('✅ Stock synchronisé:', response);

      await this.indexedDB.put('products', response);
    } catch (error) {
      console.error('❌ Erreur synchronisation stock:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les ventes non synchronisées
   */
  async getUnsyncedSales(): Promise<any[]> {
    return await this.indexedDB.getAllByIndex<any>('sales', 'synced', false);
  }

  /**
   * Récupère le statut de la queue de synchronisation
   */
  async getQueueStatus(): Promise<{
    total: number;
    pending: number;
    synced: number;
    failed: number;
  }> {
    const allItems = await this.indexedDB.getAll<SyncQueueItem>('syncQueue');

    return {
      total: allItems.length,
      pending: allItems.filter(i => !i.synced && i.attempts < this.maxRetries).length,
      synced: allItems.filter(i => i.synced).length,
      failed: allItems.filter(i => !i.synced && i.attempts >= this.maxRetries).length
    };
  }

  /**
   * Vide la queue de synchronisation (uniquement les éléments synchronisés)
   */
  async clearSyncedItems(): Promise<void> {
    const allItems = await this.indexedDB.getAll<SyncQueueItem>('syncQueue');
    const syncedItems = allItems.filter(i => i.synced);

    for (const item of syncedItems) {
      await this.indexedDB.delete('syncQueue', item.id);
    }

    console.log(`🗑️ ${syncedItems.length} élément(s) synchronisé(s) supprimé(s)`);
  }

  /**
   * Génère un ID unique
   */
  private generateId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Force une synchronisation immédiate
   */
  async forceSync(): Promise<void> {
    console.log('🔄 Synchronisation forcée...');
    await this.syncAllPendingData();
  }
}
