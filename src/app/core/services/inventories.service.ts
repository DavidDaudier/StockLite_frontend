import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Inventory,
  CreateInventoryDto,
  UpdateInventoryDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryStats
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InventoriesService {
  private apiUrl = `${environment.apiUrl}/inventories`;

  constructor(private http: HttpClient) {}

  // CRUD Operations for Inventories
  getAll(): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(this.apiUrl);
  }

  getAllInventories(): Observable<Inventory[]> {
    return this.getAll();
  }

  getById(id: string): Observable<Inventory> {
    return this.http.get<Inventory>(`${this.apiUrl}/${id}`);
  }

  getInventoryById(id: string): Observable<Inventory> {
    return this.getById(id);
  }

  create(dto: any): Observable<Inventory> {
    return this.http.post<Inventory>(this.apiUrl, dto);
  }

  createInventory(dto: CreateInventoryDto): Observable<Inventory> {
    return this.create(dto);
  }

  update(id: string, dto: UpdateInventoryDto): Observable<Inventory> {
    return this.http.patch<Inventory>(`${this.apiUrl}/${id}`, dto);
  }

  updateInventory(id: string, dto: UpdateInventoryDto): Observable<Inventory> {
    return this.update(id, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  deleteInventory(id: string): Observable<void> {
    return this.delete(id);
  }

  // Inventory status management
  start(id: string): Observable<Inventory> {
    return this.http.post<Inventory>(`${this.apiUrl}/${id}/start`, {});
  }

  startInventory(id: string): Observable<Inventory> {
    return this.start(id);
  }

  complete(id: string): Observable<Inventory> {
    return this.http.patch<Inventory>(`${this.apiUrl}/${id}/complete`, {});
  }

  completeInventory(id: string): Observable<Inventory> {
    return this.complete(id);
  }

  cancel(id: string): Observable<Inventory> {
    return this.http.patch<Inventory>(`${this.apiUrl}/${id}/cancel`, {});
  }

  cancelInventory(id: string): Observable<Inventory> {
    return this.cancel(id);
  }

  // Inventory items management
  addItemToInventory(inventoryId: string, dto: CreateInventoryItemDto): Observable<Inventory> {
    return this.http.post<Inventory>(`${this.apiUrl}/${inventoryId}/items`, dto);
  }

  updateItem(inventoryId: string, itemId: string, dto: any): Observable<Inventory> {
    return this.http.patch<Inventory>(`${this.apiUrl}/${inventoryId}/items/${itemId}`, dto);
  }

  updateInventoryItem(inventoryId: string, itemId: string, dto: UpdateInventoryItemDto): Observable<Inventory> {
    return this.updateItem(inventoryId, itemId, dto);
  }

  removeItemFromInventory(inventoryId: string, itemId: string): Observable<Inventory> {
    return this.http.delete<Inventory>(`${this.apiUrl}/${inventoryId}/items/${itemId}`);
  }

  // Bulk operations
  addMultipleItems(inventoryId: string, items: CreateInventoryItemDto[]): Observable<Inventory> {
    return this.http.post<Inventory>(`${this.apiUrl}/${inventoryId}/items/bulk`, { items });
  }

  importFromCurrentStock(inventoryId: string): Observable<Inventory> {
    return this.http.post<Inventory>(`${this.apiUrl}/${inventoryId}/import-stock`, {});
  }

  // Statistics
  getInventoryStats(id: string): Observable<InventoryStats> {
    return this.http.get<InventoryStats>(`${this.apiUrl}/${id}/stats`);
  }

  // Apply adjustments to stock after completing inventory
  applyStockAdjustments(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/apply-adjustments`, {});
  }
}
