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
    // Usa sessionStorage: sessão dura enquanto a aba estiver aberta.
    // F5 mantém o login, mas fechar o navegador/aba força novo login.
    const storedToken = sessionStorage.getItem('@renetec:token');
    const storedUser = sessionStorage.getItem('@renetec:user');

    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const validUser: User = parsed?.user ? parsed.user : parsed;
        if (validUser && validUser.id && validUser.perfil) {
          setToken(storedToken);
          setUser(validUser);
        }

        // Valida o token com o servidor em background
        api
          .get('/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          })
          .then((res) => {
            const freshUser = res.data?.data?.user || res.data?.data;
            if (freshUser && freshUser.id && freshUser.perfil) {
              setUser(freshUser);
              sessionStorage.setItem('@renetec:user', JSON.stringify(freshUser));
            }
          })
          .catch((err) => {
            // Limpa a sessão se o token for rejeitado pelo servidor (401 / 403)
            if (err?.response?.status === 401 || err?.response?.status === 403) {
              setUser(null);
              setToken(null);
              sessionStorage.removeItem('@renetec:token');
              sessionStorage.removeItem('@renetec:user');
            }
          });
      } catch {
        sessionStorage.removeItem('@renetec:token');
        sessionStorage.removeItem('@renetec:user');
      }
    }

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
        sessionStorage.setItem('@renetec:token', accessToken);
        sessionStorage.setItem('@renetec:user', JSON.stringify(userData));
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
    sessionStorage.removeItem('@renetec:token');
    sessionStorage.removeItem('@renetec:user');
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
