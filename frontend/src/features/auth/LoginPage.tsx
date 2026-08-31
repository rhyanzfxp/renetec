import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
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
              type={showSenha ? 'text' : 'password'}
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  title={showSenha ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex={-1}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
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


        </div>

        {/* Footer Info */}
        <p className="text-center text-xs text-gray-500">
          RENETEC &copy; {new Date().getFullYear()} — Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};
