import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StatusOS, PerfilUsuario } from '../../types/auth';

interface StatusBadgeProps {
  status?: StatusOS;
  perfil?: PerfilUsuario;
  prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  perfil,
  prioridade,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  // 1. Badge para Perfil de Usuário
  if (perfil) {
    const perfilConfigs = {
      ADMIN: {
        label: 'Administrador',
        dotColor: 'bg-purple-400',
        classes: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      },
      TECNICO: {
        label: 'Técnico',
        dotColor: 'bg-sky-400',
        classes: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      },
      QUALIDADE: {
        label: 'Controle de Qualidade',
        dotColor: 'bg-emerald-400',
        classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      },
    };

    const cfg = perfilConfigs[perfil];
    return (
      <span
        className={twMerge(
          clsx(
            'inline-flex items-center font-medium rounded-md border tracking-wide select-none',
            sizeClasses[size],
            cfg.classes,
            className
          )
        )}
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dotColor)} />
        {cfg.label}
      </span>
    );
  }

  // 2. Badge para Prioridade da OS
  if (prioridade) {
    const prioridadeConfigs = {
      BAIXA: { label: 'Baixa', classes: 'bg-gray-500/10 text-gray-300 border-gray-500/30' },
      MEDIA: { label: 'Média', classes: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
      ALTA: { label: 'Alta', classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
      URGENTE: { label: 'Urgente', classes: 'bg-red-500/10 text-red-300 border-red-500/30 animate-pulse' },
    };
    const cfg = prioridadeConfigs[prioridade];
    return (
      <span
        className={twMerge(
          clsx(
            'inline-flex items-center font-semibold uppercase tracking-wider rounded-md border text-[10px] px-2 py-0.5',
            cfg.classes,
            className
          )
        )}
      >
        {cfg.label}
      </span>
    );
  }

  // 3. Badge para Status da OS / Item
  if (status) {
    const statusConfigs: Record<StatusOS, { label: string; dot: string; classes: string }> = {
      RECEBIDO: {
        label: 'Recebido',
        dot: 'bg-slate-400',
        classes: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
      },
      AGUARDANDO_PRODUCAO: {
        label: 'Aguardando Produção',
        dot: 'bg-sky-400',
        classes: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      },
      EM_PRODUCAO: {
        label: 'Em Produção',
        dot: 'bg-amber-400 animate-ping',
        classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      },
      AGUARDANDO_TESTE: {
        label: 'Aguardando Teste',
        dot: 'bg-indigo-400',
        classes: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      },
      APROVADO: {
        label: 'Aprovado',
        dot: 'bg-emerald-400',
        classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      },
      REPROVADO: {
        label: 'Reprovado',
        dot: 'bg-red-400',
        classes: 'bg-red-500/10 text-red-300 border-red-500/30',
      },
      RETRABALHO: {
        label: 'Retrabalho',
        dot: 'bg-amber-500',
        classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      },
      AGUARDANDO_NOVO_TESTE: {
        label: 'Aguardando Reteste',
        dot: 'bg-purple-400',
        classes: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      },
      CONCLUIDO: {
        label: 'Concluído',
        dot: 'bg-teal-400',
        classes: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      },
      AGUARDANDO_PECA: {
        label: 'Aguardando Peça',
        dot: 'bg-orange-400',
        classes: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
      },
      AGUARDANDO_CLIENTE: {
        label: 'Aguardando Cliente',
        dot: 'bg-yellow-400',
        classes: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      },
      SEM_REPARO: {
        label: 'Sem Reparo',
        dot: 'bg-zinc-500',
        classes: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
      },
      CANCELADO: {
        label: 'Cancelado',
        dot: 'bg-red-600',
        classes: 'bg-red-950/40 text-red-400 border-red-800/40 line-through',
      },
    };

    const cfg = statusConfigs[status] || {
      label: status,
      dot: 'bg-gray-400',
      classes: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
    };

    return (
      <span
        className={twMerge(
          clsx(
            'inline-flex items-center font-medium rounded-md border tracking-wide select-none',
            sizeClasses[size],
            cfg.classes,
            className
          )
        )}
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
        <span className="truncate">{cfg.label}</span>
      </span>
    );
  }

  return null;
};
