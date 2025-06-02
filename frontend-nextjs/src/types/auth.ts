export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  active: boolean;
  permissions: Permission[];
  createdAt: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  roleId: number;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  roleId?: number;
  active?: boolean;
}

export interface ApiError {
  error: string;
}

export interface UserWithRole extends Omit<User, 'role'> {
  role: {
    id: number;
    name: string;
  };
  active: boolean;
} 