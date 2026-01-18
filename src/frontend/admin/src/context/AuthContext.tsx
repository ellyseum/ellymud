import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  requiresPasswordChange: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  completePasswordChange: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('mudAdminToken');
  });
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);

  const isAuthenticated = !!token;

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await api.login(username, password);
      // Token is at root level: { success: true, token: "..." }
      const responseToken = response.token || response.data?.token;
      if (response.success && responseToken) {
        localStorage.setItem('mudAdminToken', responseToken);
        setToken(responseToken);
        // Check if password change is required (using default 'admin' password)
        if (response.requiresPasswordChange) {
          setRequiresPasswordChange(true);
        }
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
    setRequiresPasswordChange(false);
  }, []);

  const completePasswordChange = useCallback(() => {
    setRequiresPasswordChange(false);
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
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        requiresPasswordChange,
        login,
        logout,
        completePasswordChange,
      }}
    >
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
