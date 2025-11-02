export enum UserRole {
  ADMIN = 'admin',
  SELLER = 'seller',
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
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  permissions?: UserPermissions;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  permissions?: UserPermissions;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  permissions?: UserPermissions;
}
