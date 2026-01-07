import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('mudAdminToken');
  });

  const isAuthenticated = !!token;

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await api.login(username, password);
      // Token is at root level: { success: true, token: "..." }
      const token = response.token || response.data?.token;
      if (response.success && token) {
        localStorage.setItem('mudAdminToken', token);
        setToken(token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mudAdminToken');
    setToken(null);
  }, []);

  // Check token validity on mount
  useEffect(() => {
    if (token) {
      // Optionally verify token by making a test API call
      api.getServerStats().catch(() => {
        logout();
      });
    }
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
