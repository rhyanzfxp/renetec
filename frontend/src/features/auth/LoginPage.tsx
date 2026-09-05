import React, { useState } from 'react';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Clock,
  Layers,
  Package,
} from 'lucide-react';
import { useAuth } from './AuthContext';

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
    <div className="min-h-screen w-full bg-[#061024] bg-[radial-gradient(ellipse_80%_80%_at_20%_-20%,rgba(29,78,216,0.35),rgba(255,255,255,0))] flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden font-sans select-none">
      {/* Luzes e Brilhos de Fundo */}
      <div className="w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none absolute -top-40 -left-40" />
      <div className="w-[450px] h-[450px] rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none absolute -bottom-20 -right-20" />

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10 py-6">
        
        {/* ─── COLUNA DA ESQUERDA: APRESENTAÇÃO INSTITUCIONAL ─── */}
        <div className="lg:col-span-7 space-y-7 text-left">
          
          {/* Badge de status */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md text-xs text-slate-300 font-medium w-fit shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Sistema de Gestão & Assistência Técnica</span>
          </div>

          {/* Título Principal */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
              Renetec <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-white">
                Assistência Em Telecom
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300/90 max-w-lg leading-relaxed pt-1 font-normal">
              Centralize ordens de serviço, produção de bancada, testes de controle de qualidade e relatórios em uma interface clara, moderna e fácil de usar.
            </p>
          </div>

          {/* 3 Cards de Destaque */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            {/* Card 1: Seguro */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/90 backdrop-blur-md hover:border-slate-700 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Seguro</h4>
              <p className="text-xs text-slate-400 mt-0.5">Controle por perfil</p>
            </div>

            {/* Card 2: 24h / Ao Vivo */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/90 backdrop-blur-md hover:border-slate-700 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">24h</h4>
              <p className="text-xs text-slate-400 mt-0.5">Acesso em tempo real</p>
            </div>

            {/* Card 3: Bancada & Estoque */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/90 backdrop-blur-md hover:border-slate-700 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Bancada & CQ</h4>
              <p className="text-xs text-slate-400 mt-0.5">Movimentações rastreáveis</p>
            </div>
          </div>
        </div>

        {/* ─── COLUNA DA DIREITA: CARD FLUTUANTE DE LOGIN (ESTILO REFERÊNCIA) ─── */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white text-slate-900 p-8 sm:p-10 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_35px_rgba(37,99,235,0.15)] w-full max-w-md mx-auto relative overflow-hidden border border-slate-100 animate-fadeIn">
            
            {/* Ícone azul no topo do card */}
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/35 mb-6">
              <Package className="w-7 h-7 stroke-[2.2]" />
            </div>

            {/* Título e Subtítulo */}
            <div className="space-y-1.5 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Bem-vindo de volta
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                Faça login para acessar o sistema de assistência técnica e produção.
              </p>
            </div>

            {/* Alerta de erro */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 mb-5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Formulário de Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo E-mail */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 block">
                  E-mail
                </label>
                <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 block">
                  Senha
                </label>
                <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                  <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1 focus:outline-none cursor-pointer"
                    title={showSenha ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all duration-150 disabled:opacity-60 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Autenticando...
                  </span>
                ) : (
                  <>
                    <span>Entrar no sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Rodapé do Card */}
            <div className="text-center space-y-1.5 pt-6">
              <p className="text-xs font-bold text-slate-500">
                Renetec Assistência Em Telecom
              </p>
              <button
                type="button"
                onClick={() => setError('Para redefinir sua senha, entre em contato com o suporte ou administrador do sistema.')}
                className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
