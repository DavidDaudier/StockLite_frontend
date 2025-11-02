export enum UserRole {
  ADMIN = 'admin',
  SELLER = 'seller'
}

export interface UserPermissions {
  dashboard?: boolean;
  pos?: boolean;
  history?: boolean;
  reports?: boolean;
  profile?: boolean;
}

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
