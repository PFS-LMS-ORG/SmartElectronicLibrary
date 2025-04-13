// contexts/authcontext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, login, logout as authLogout } from '../services/auth';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin'; // Use union type for type safety
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isUser: () => boolean;
  requireRole: (requiredRole: 'user' | 'admin') => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Initializing auth state');
      const token = localStorage.getItem('token');
      console.log('Token found:', token ? 'Yes' : 'No');
      if (token) {
        try {
          const userData = await getCurrentUser();
          console.log('User fetched:', userData);
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          authLogout();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        console.log('No token, setting unauthenticated');
        setIsAuthenticated(false);
      }
      console.log('Auth initialization complete, isLoading=false');
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    console.log('Logging in:', email);
    const { user } = await login({ email, password });
    console.log('Login successful, user:', user);
    setUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    console.log('Logging out');
    authLogout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Role-based functions
  const isAdmin = () => {
    return isAuthenticated && user?.role === 'admin';
  };

  const isUser = () => {
    return isAuthenticated && user?.role === 'user';
  };

  const requireRole = (requiredRole: 'user' | 'admin') => {
    return isAuthenticated && user?.role === requiredRole;
  };

  if (isLoading) {
    console.log('Rendering loading state');
    return <div className="flex h-screen items-center justify-center bg-gray-100">Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
        isAdmin,
        isUser,
        requireRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};