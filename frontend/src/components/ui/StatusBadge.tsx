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
        dotColor: 'bg-purple-600 dark:bg-purple-400',
        classes: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
      },
      TECNICO: {
        label: 'Técnico',
        dotColor: 'bg-sky-600 dark:bg-sky-400',
        classes: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
      },
      QUALIDADE: {
        label: 'Controle de Qualidade',
        dotColor: 'bg-emerald-600 dark:bg-emerald-400',
        classes: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
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
      BAIXA: { label: 'Baixa', classes: 'bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500/30' },
      MEDIA: { label: 'Média', classes: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30' },
      ALTA: { label: 'Alta', classes: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' },
      URGENTE: { label: 'Urgente', classes: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30 animate-pulse' },
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
        dot: 'bg-slate-500 dark:bg-slate-400',
        classes: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/30',
      },
      AGUARDANDO_PRODUCAO: {
        label: 'Aguardando Produção',
        dot: 'bg-sky-500 dark:bg-sky-400',
        classes: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
      },
      EM_PRODUCAO: {
        label: 'Em Produção',
        dot: 'bg-amber-500 dark:bg-amber-400 animate-ping',
        classes: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
      },
      AGUARDANDO_TESTE: {
        label: 'Aguardando Teste',
        dot: 'bg-indigo-500 dark:bg-indigo-400',
        classes: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
      },
      APROVADO: {
        label: 'Aprovado',
        dot: 'bg-emerald-500 dark:bg-emerald-400',
        classes: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
      },
      REPROVADO: {
        label: 'Reprovado',
        dot: 'bg-red-500 dark:bg-red-400',
        classes: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30',
      },
      RETRABALHO: {
        label: 'Retrabalho',
        dot: 'bg-amber-600 dark:bg-amber-500',
        classes: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
      },
      AGUARDANDO_NOVO_TESTE: {
        label: 'Aguardando Reteste',
        dot: 'bg-purple-500 dark:bg-purple-400',
        classes: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
      },
      CONCLUIDO: {
        label: 'Concluído',
        dot: 'bg-teal-500 dark:bg-teal-400',
        classes: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30',
      },
      AGUARDANDO_PECA: {
        label: 'Aguardando Peça',
        dot: 'bg-orange-500 dark:bg-orange-400',
        classes: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
      },
      AGUARDANDO_CLIENTE: {
        label: 'Aguardando Cliente',
        dot: 'bg-yellow-500 dark:bg-yellow-400',
        classes: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30',
      },
      SEM_REPARO: {
        label: 'Sem Reparo',
        dot: 'bg-zinc-500',
        classes: 'bg-zinc-100 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-500/30',
      },
      CANCELADO: {
        label: 'Cancelado',
        dot: 'bg-red-600',
        classes: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40 line-through',
      },
    };

    const cfg = statusConfigs[status] || {
      label: status,
      dot: 'bg-gray-500 dark:bg-gray-400',
      classes: 'bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500/30',
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
