import axios from 'axios';
import { 
  LoginCredentials, 
  LoginResponse, 
  User, 
  UserWithRole, 
  CreateUserRequest, 
  UpdateUserRequest,
  Role,
  Permission 
} from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token is invalid or expired
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  // Authentication endpoints
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', credentials);
    return response.data;
  },

  verifyToken: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/api/auth/verify');
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // Ignore logout errors, clear local storage anyway
      console.warn('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  },

  // Admin endpoints - User management
  getUsers: async (): Promise<UserWithRole[]> => {
    const response = await api.get<UserWithRole[]>('/api/admin/users');
    return response.data;
  },

  createUser: async (userData: CreateUserRequest): Promise<{ message: string; user: User }> => {
    const response = await api.post<{ message: string; user: User }>('/api/admin/users', userData);
    return response.data;
  },

  updateUser: async (userId: number, userData: UpdateUserRequest): Promise<{ message: string; user: User }> => {
    const response = await api.put<{ message: string; user: User }>(`/api/admin/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId: number): Promise<{ message: string; user: User }> => {
    const response = await api.delete<{ message: string; user: User }>(`/api/admin/users/${userId}`);
    return response.data;
  },

  // Admin endpoints - Role management
  getRoles: async (): Promise<Role[]> => {
    const response = await api.get<Role[]>('/api/admin/roles');
    return response.data;
  },

  getPermissions: async (): Promise<Permission[]> => {
    const response = await api.get<Permission[]>('/api/admin/permissions');
    return response.data;
  },

  updateRolePermissions: async (roleId: number, permissionIds: number[]): Promise<{ message: string }> => {
    const response = await api.put<{ message: string }>(`/api/admin/roles/${roleId}/permissions`, {
      permissionIds
    });
    return response.data;
  },
};

export default api; 