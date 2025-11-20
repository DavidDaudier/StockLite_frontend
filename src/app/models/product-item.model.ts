export interface ProductItem {
    id: string;
    name: string;
    price: number;
    stock: number;
    qty: number;
    minStock?: number;
    categoryId?: string;
    isActive: boolean;
}