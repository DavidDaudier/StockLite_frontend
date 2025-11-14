import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DailyReport {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageSaleValue: number;
  salesByPaymentMethod: Record<string, number>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface TopSeller {
  sellerId: string;
  sellerName: string;
  totalSales: number;
  totalRevenue: number;
}

export interface InventoryReport {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    minStock: number;
  }>;
  outOfStockProducts: Array<{
    id: string;
    name: string;
  }>;
}

export interface FinancialReport {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  totalSales: number;
  averageSaleValue: number;
  topProducts: TopProduct[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getDailyReport(date?: string): Observable<DailyReport> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<DailyReport>(`${this.apiUrl}/daily`, { params });
  }

  getWeeklyReport(startDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    return this.http.get<any>(`${this.apiUrl}/weekly`, { params });
  }

  getMonthlyReport(year?: number, month?: number): Observable<any> {
    let params = new HttpParams();
    if (year !== undefined) params = params.set('year', year.toString());
    if (month !== undefined) params = params.set('month', month.toString());
    return this.http.get<any>(`${this.apiUrl}/monthly`, { params });
  }

  getTopProducts(startDate?: string, endDate?: string, limit: number = 10): Observable<TopProduct[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<TopProduct[]>(`${this.apiUrl}/top-products`, { params });
  }

  getTopSellers(startDate?: string, endDate?: string, limit: number = 10): Observable<TopSeller[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<TopSeller[]>(`${this.apiUrl}/top-sellers`, { params });
  }

  getInventoryReport(): Observable<InventoryReport> {
    return this.http.get<InventoryReport>(`${this.apiUrl}/inventory`);
  }

  getFinancialReport(startDate?: string, endDate?: string): Observable<FinancialReport> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<FinancialReport>(`${this.apiUrl}/financial`, { params });
  }
}
