import React from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { RealtimeProvider } from './features/realtime/RealtimeContext';
import { RealtimeToastContainer } from './features/realtime/RealtimeToastContainer';
import { LoginPage } from './features/auth/LoginPage';
import { AppShell } from './layouts/AppShell';

const MainContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
          <span className="text-xs text-gray-400 font-medium">Carregando sistema Renetec...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? (
    <>
      <AppShell />
      <RealtimeToastContainer />
    </>
  ) : (
    <LoginPage />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <MainContent />
      </RealtimeProvider>
    </AuthProvider>
  );
}
