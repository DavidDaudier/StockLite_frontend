import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Product, CreateProductDto, UpdateProductDto } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  /**
   * Normalise les données d'un produit en s'assurant que les types sont corrects
   * (convertit les chaînes en nombres pour les champs numériques)
   */
  private normalizeProduct(product: any): Product {
    return {
      ...product,
      price: Number(product.price) || 0,
      costPrice: Number(product.costPrice) || 0,
      quantity: Number(product.quantity) || 0,
      minStock: Number(product.minStock) || 0,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt)
    };
  }

  getAll(search?: string, category?: string): Observable<Product[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);

    return this.http.get<Product[]>(this.apiUrl, { params }).pipe(
      map(products => products.map(p => this.normalizeProduct(p)))
    );
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(
      map(product => this.normalizeProduct(product))
    );
  }

  getLowStock(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/low-stock`).pipe(
      map(products => products.map(p => this.normalizeProduct(p)))
    );
  }

  create(product: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product).pipe(
      map(product => this.normalizeProduct(product))
    );
  }

  update(id: string, product: UpdateProductDto): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}`, product).pipe(
      map(product => this.normalizeProduct(product))
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleStatus(id: string): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}/toggle-status`, {}).pipe(
      map(product => this.normalizeProduct(product))
    );
  }
}
