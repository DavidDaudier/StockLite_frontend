export enum InventoryStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productBarcode?: string;
  expectedQuantity: number;
  theoreticalQuantity?: number; // Alias for expectedQuantity
  countedQuantity: number;
  physicalQuantity?: number; // Alias for countedQuantity
  difference: number;
  status?: string; // 'pending' | 'counted' | 'discrepancy'
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: string;
  name: string;
  inventoryNumber?: string; // Unique inventory number
  description?: string;
  status: InventoryStatus;
  startedAt?: string;
  completedAt?: string;
  createdById: string;
  createdBy?: {
    id: string;
    fullName: string;
    username: string;
  };
  items: InventoryItem[];
  totalItems?: number;
  countedItems?: number;
  itemsWithDiscrepancy?: number;
  totalDiscrepancy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryDto {
  name?: string;
  description?: string;
  items?: Array<{
    productId: string;
    theoreticalQuantity: number;
  }>;
}

export interface UpdateInventoryDto {
  name?: string;
  description?: string;
  status?: InventoryStatus;
}

export interface CreateInventoryItemDto {
  productId: string;
  expectedQuantity: number;
  countedQuantity: number;
  notes?: string;
}

export interface UpdateInventoryItemDto {
  countedQuantity?: number;
  physicalQuantity?: number; // Alias for countedQuantity
  notes?: string;
}

export interface InventoryStats {
  totalItems: number;
  itemsWithDifferences: number;
  totalDifference: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
}
