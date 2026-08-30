import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthState } from '../../types/auth';
import { api } from '../../services/api';

interface AuthContextData extends AuthState {
  login: (email: string, senha: string) => Promise<void>;
  quickLogin: (userType: 'admin' | 'joao' | 'samuel' | 'qualidade') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sempre limpa a sessão ao abrir o site — usuário deve fazer login toda vez
    localStorage.removeItem('@renetec:token');
    localStorage.removeItem('@renetec:user');
    setIsLoading(false);
  }, []);

  const login = async (email: string, senha: string) => {
    const response = await api.post('/auth/login', { email, senha });
    if (response.data?.success) {
      const userData = response.data.data?.user || response.data.data;
      const accessToken = response.data.data?.accessToken;
      if (userData && accessToken) {
        setUser(userData);
        setToken(accessToken);
        localStorage.setItem('@renetec:token', accessToken);
        localStorage.setItem('@renetec:user', JSON.stringify(userData));
      }
    }
  };

  const quickLogin = async (userType: 'admin' | 'joao' | 'samuel' | 'qualidade') => {
    const credentials = {
      admin: { email: 'admin@renetec.com.br', senha: 'renetec123' },
      joao: { email: 'joao@renetec.com.br', senha: 'renetec123' },
      samuel: { email: 'samuel@renetec.com.br', senha: 'renetec123' },
      qualidade: { email: 'qualidade@renetec.com.br', senha: 'renetec123' },
    };

    const cred = credentials[userType];
    if (cred) {
      await login(cred.email, cred.senha);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignora erro de rede em logout
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('@renetec:token');
    localStorage.removeItem('@renetec:user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        quickLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
