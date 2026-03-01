import { apiClient } from './api-client';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  displayName: string;
  collegeName: string;
  collegeDomain: string;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: string;
  };
  accessToken?: string;
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    
    // Store token if login successful
    if (response.accessToken) {
      localStorage.setItem('auth_token', response.accessToken);
    }
    
    return response;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token');
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
