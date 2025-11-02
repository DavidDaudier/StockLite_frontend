import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface IDBConfig {
  databaseName: string;
  version: number;
  stores: {
    name: string;
    keyPath: string;
    autoIncrement?: boolean;
    indexes?: { name: string; keyPath: string; unique?: boolean }[];
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private isBrowser: boolean;
  private readonly config: IDBConfig = {
    databaseName: 'StockLiteDB',
    version: 1,
    stores: [
      {
        name: 'sales',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'synced', keyPath: 'synced', unique: false },
          { name: 'createdAt', keyPath: 'createdAt', unique: false },
          { name: 'sellerId', keyPath: 'sellerId', unique: false }
        ]
      },
      {
        name: 'products',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'sku', keyPath: 'sku', unique: true },
          { name: 'category', keyPath: 'category', unique: false },
          { name: 'updatedAt', keyPath: 'updatedAt', unique: false }
        ]
      },
      {
        name: 'categories',
        keyPath: 'id',
        autoIncrement: false
      },
      {
        name: 'syncQueue',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'synced', keyPath: 'synced', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false }
        ]
      }
    ]
  };

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initDatabase();
    }
  }

  private async initDatabase(): Promise<void> {
    if (!this.isBrowser) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.databaseName, this.config.version);

      request.onerror = () => {
        console.error('Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialisée avec succès');
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        this.config.stores.forEach(storeConfig => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const objectStore = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
              autoIncrement: storeConfig.autoIncrement || false
            });

            if (storeConfig.indexes) {
              storeConfig.indexes.forEach(index => {
                objectStore.createIndex(index.name, index.keyPath, {
                  unique: index.unique || false
                });
              });
            }

            console.log(`✅ Object store '${storeConfig.name}' créé`);
          }
        });
      };
    });
  }

  async add(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    if (!this.isBrowser || !this.db) {
      return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        // Pour les valeurs boolean, récupérer tous les éléments et filtrer
        if (typeof value === 'boolean') {
          const request = store.getAll();

          request.onsuccess = () => {
            const results = request.result.filter((item: any) => item[indexName] === value);
            resolve(results as T[]);
          };
          request.onerror = () => reject(request.error);
        } else {
          // Pour les autres types, utiliser l'index normalement
          const index = store.index(indexName);
          const request = index.getAll(value);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
