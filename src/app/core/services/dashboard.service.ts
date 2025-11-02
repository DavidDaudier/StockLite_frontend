import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DailyReport {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  averageSaleValue: number;
  paymentMethods: Record<string, { count: number; total: number }>;
  sales: any[];
}

export interface InventoryReport {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoryBreakdown: Record<string, { count: number; totalQuantity: number; totalValue: number }>;
  lowStockProducts: LowStockProduct[];
  outOfStockProducts: any[];
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
  category: string;
  price: number;
}

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  totalSales: number;
  totalRevenue: number;
  averageDailyRevenue: number;
  dailyBreakdown: Array<{
    date: string;
    salesCount: number;
    revenue: number;
  }>;
}

export interface MonthlyReport {
  year: number;
  month: number;
  monthName: string;
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  averageSaleValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    salesCount: number;
  }>;
  topSellers: Array<{
    sellerId: string;
    sellerName: string;
    totalSales: number;
    totalRevenue: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getDailyReport(date?: string): Observable<DailyReport> {
    if (date) {
      return this.http.get<DailyReport>(`${this.apiUrl}/daily`, { params: { date } });
    }
    return this.http.get<DailyReport>(`${this.apiUrl}/daily`);
  }

  getInventoryReport(): Observable<InventoryReport> {
    return this.http.get<InventoryReport>(`${this.apiUrl}/inventory`);
  }

  getWeeklyReport(startDate?: string): Observable<WeeklyReport> {
    if (startDate) {
      return this.http.get<WeeklyReport>(`${this.apiUrl}/weekly`, { params: { startDate } });
    }
    return this.http.get<WeeklyReport>(`${this.apiUrl}/weekly`);
  }

  getMonthlyReport(year?: number, month?: number): Observable<MonthlyReport> {
    const params: any = {};
    if (year !== undefined) params.year = year.toString();
    if (month !== undefined) params.month = month.toString();

    if (Object.keys(params).length > 0) {
      return this.http.get<MonthlyReport>(`${this.apiUrl}/monthly`, { params });
    }
    return this.http.get<MonthlyReport>(`${this.apiUrl}/monthly`);
  }
}
