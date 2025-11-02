import { Product } from './product.model';
import { User } from './user.model';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer'
}

export interface SaleItem {
  id?: string;
  saleId?: string;
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  subtotal: number;
  product?: Product;
}

export interface Sale {
  id: string;
  saleNumber: string;
  sellerId: string;
  seller?: User;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  synced: boolean;
  clientSaleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSaleItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CreateSaleDto {
  items: CreateSaleItemDto[];
  discount?: number;
  tax?: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  clientSaleId?: string;
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageSaleValue: number;
}
