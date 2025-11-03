export enum UserRole {
  ADMIN = 'admin',
  SELLER = 'seller'
}

// Permissions simples pour les vendeurs (boolean pour chaque page)
export interface SellerPermissions {
  dashboard?: boolean;
  pos?: boolean;
  history?: boolean;
  reports?: boolean;
  profile?: boolean;
}

// Actions granulaires pour les admins
export interface PageActions {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
}

// Permissions granulaires pour les admins
export interface AdminPermissions {
  dashboard?: PageActions;
  products?: PageActions;
  pos?: PageActions;
  'stock-tracking'?: PageActions;
  history?: PageActions;
  reports?: PageActions;
  'report-vendor'?: PageActions;
  inventories?: PageActions;
  zoom?: PageActions;
  users?: PageActions;
  profile?: PageActions;
  'pos-printer'?: PageActions;
  settings?: PageActions;
}

// Type générique pour permissions (peut être Admin ou Seller)
export type UserPermissions = SellerPermissions | AdminPermissions;

export interface User {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isSuperAdmin?: boolean;
  permissions?: UserPermissions;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface CreateUserDto {
  username: string;
  email?: string;
  fullName?: string;
  password: string;
  role: UserRole;
  permissions?: UserPermissions;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  fullName?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
  permissions?: UserPermissions;
}
