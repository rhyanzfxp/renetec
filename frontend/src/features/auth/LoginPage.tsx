import React, { useState } from 'react';
import { Lock, Mail, Shield, UserCheck, Wrench, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const LoginPage: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      setError('Por favor preencha todos os campos.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await login(email, senha);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (type: 'admin' | 'joao' | 'samuel' | 'qualidade') => {
    try {
      setIsLoading(true);
      setError(null);
      await quickLogin(type);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao realizar login rápido.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden border border-brand-500/40 shadow-glow-primary bg-[#050b2c] p-1">
            <img
              src="/logo.png"
              alt="Logo Renetec"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white italic">RENETEC</h1>
          <p className="text-[10px] font-bold tracking-[0.2em] text-gray-300 uppercase italic">
            SERVIÇOS E TECNOLOGIA
          </p>
        </div>

        {/* Card de Login */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface-card border border-surface-border shadow-panel space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">Acesse sua conta</h2>
            <p className="text-xs text-gray-400">Informe suas credenciais para acessar o painel de produção.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail Corporativo"
              type="email"
              placeholder="ex: joao@renetec.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              disabled={isLoading}
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Entrar no Sistema
            </Button>
          </form>

          {/* Divisor */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-surface-border"></div>
            <span className="flex-shrink mx-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Acesso Rápido de Teste
            </span>
            <div className="flex-grow border-t border-surface-border"></div>
          </div>

          {/* Quick Login Profiles */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              disabled={isLoading}
              className="p-2.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-border border border-surface-border/80 text-left transition-colors flex flex-col gap-1 disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </div>
              <span className="text-[11px] text-gray-400 truncate">Acesso Geral</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('joao')}
              disabled={isLoading}
              className="p-2.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-border border border-surface-border/80 text-left transition-colors flex flex-col gap-1 disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
                <Wrench className="w-3.5 h-3.5" />
                <span>João (Técnico)</span>
              </div>
              <span className="text-[11px] text-gray-400 truncate">Chão de Fábrica</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('samuel')}
              disabled={isLoading}
              className="p-2.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-border border border-surface-border/80 text-left transition-colors flex flex-col gap-1 disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
                <Wrench className="w-3.5 h-3.5" />
                <span>Samuel (Técnico)</span>
              </div>
              <span className="text-[11px] text-gray-400 truncate">Chão de Fábrica</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('qualidade')}
              disabled={isLoading}
              className="p-2.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-border border border-surface-border/80 text-left transition-colors flex flex-col gap-1 disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Qualidade (CQ)</span>
              </div>
              <span className="text-[11px] text-gray-400 truncate">Mesa de Testes</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-xs text-gray-500">
          RENETEC &copy; {new Date().getFullYear()} — Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};
