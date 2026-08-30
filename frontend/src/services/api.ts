import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injetar JWT no header se estiver salvo no sessionStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('@renetec:token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar expiração de sessão 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Se não for rota de login, limpa token inválido
      if (!error.config?.url?.includes('/auth/login')) {
        sessionStorage.removeItem('@renetec:token');
        sessionStorage.removeItem('@renetec:user');
      }
    }
    return Promise.reject(error);
  }
);
