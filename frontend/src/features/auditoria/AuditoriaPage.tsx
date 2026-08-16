import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { auditoriaApiService } from './auditoria.service';
import type { AuditLogEntry, AuditAcao } from './auditoria.types';
import { Table, type Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ACOES_DISPONIVEIS: { value: AuditAcao; label: string; cor: string }[] = [
  { value: 'OS_CRIADA', label: 'OS Criada', cor: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'OS_STATUS_ALTERADO', label: 'Status OS Alterado', cor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  { value: 'PRODUCAO_INICIADA', label: 'Produção Iniciada', cor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { value: 'PRODUCAO_FINALIZADA', label: 'Produção Finalizada', cor: 'bg-teal-500/10 text-teal-400 border-teal-500/30' },
  { value: 'TESTE_REALIZADO', label: 'Teste Realizado', cor: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  { value: 'TESTE_APROVADO', label: 'CQ Aprovado', cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { value: 'TESTE_REPROVADO', label: 'CQ Reprovado', cor: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  { value: 'RETRABALHO_INICIADO', label: 'Retrabalho Iniciado', cor: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { value: 'RETRABALHO_CONCLUIDO', label: 'Retrabalho Concluído', cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { value: 'META_ATUALIZADA', label: 'Meta Atualizada', cor: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'USUARIO_LOGIN', label: 'Login de Usuário', cor: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  { value: 'CONFIGURACAO_ALTERADA', label: 'Configuração', cor: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
];

export const AuditoriaPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Filtros
  const [filtroAcao, setFiltroAcao] = useState<string>('');
  const [filtroEntidade, setFiltroEntidade] = useState<string>('');
  const [buscaTexto, setBuscaTexto] = useState<string>('');

  const carregarLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await auditoriaApiService.getLogs({
        acao: (filtroAcao as AuditAcao) || undefined,
        entidade: filtroEntidade || undefined,
        page,
        limit: 25,
      });
      setLogs(resp.data || []);
      setTotal(resp.total || 0);
      setTotalPages(resp.totalPages || 1);
    } catch (err) {
      console.error('Erro ao carregar logs de auditoria:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filtroAcao, filtroEntidade, page]);

  useEffect(() => {
    carregarLogs();
  }, [carregarLogs]);

  // Filtragem local por texto (busca rápida na descrição ou usuário)
  const logsFiltrados = useMemo(() => {
    if (!buscaTexto.trim()) return logs;
    const termo = buscaTexto.toLowerCase();
    return logs.filter(
      (l) =>
        l.descricao.toLowerCase().includes(termo) ||
        l.usuarioNome?.toLowerCase().includes(termo) ||
        l.entidade.toLowerCase().includes(termo) ||
        l.acao.toLowerCase().includes(termo)
    );
  }, [logs, buscaTexto]);

  const getBadgeAcao = (acao: AuditAcao) => {
    const config = ACOES_DISPONIVEIS.find((a) => a.value === acao);
    const cor = config?.cor || 'bg-gray-800 text-gray-300 border-gray-700';
    const label = config?.label || acao;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${cor}`}>
        {label}
      </span>
    );
  };

  const getBadgePerfil = (perfil: string | null) => {
    if (!perfil) return <span className="text-gray-500 text-xs">-</span>;
    const cores: Record<string, string> = {
      ADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      QUALIDADE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      TECNICO: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    };
    return (
      <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border ${cores[perfil] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
        {perfil}
      </span>
    );
  };

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'dataHora',
      header: 'Data / Hora',
      width: '160px',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          {new Date(row.criadoEm).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
      ),
    },
    {
      key: 'acao',
      header: 'Ação Registrada',
      width: '170px',
      render: (row) => getBadgeAcao(row.acao),
    },
    {
      key: 'descricao',
      header: 'Descrição do Evento',
      render: (row) => (
        <div className="font-medium text-gray-200 line-clamp-1 max-w-xl" title={row.descricao}>
          {row.descricao}
        </div>
      ),
    },
    {
      key: 'usuario',
      header: 'Responsável',
      width: '180px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-200 font-medium">
              {row.usuarioNome || 'Sistema / Anônimo'}
            </span>
            {row.usuarioPerfil && <div>{getBadgePerfil(row.usuarioPerfil)}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'entidade',
      header: 'Entidade',
      width: '130px',
      render: (row) => (
        <span className="text-xs font-mono text-gray-400 bg-surface-elevated px-2 py-0.5 rounded border border-surface-border">
          {row.entidade}
        </span>
      ),
    },
    {
      key: 'acoes',
      header: 'Detalhes',
      width: '90px',
      align: 'center',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
          className="px-2.5 py-1 text-xs text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded transition-colors"
        >
          Ver Mais
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-500/10">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Trilha de Auditoria & Logs
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Rastreabilidade de ponta a ponta: todas as alterações, logins, inspeções e produções
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarLogs}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-surface-card border border-surface-border rounded-xl">
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, operador ou entidade..."
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            className="w-full bg-surface-base border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={filtroAcao}
            onChange={(e) => {
              setFiltroAcao(e.target.value);
              setPage(1);
            }}
            className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="">Todas as Ações Registradas</option>
            {ACOES_DISPONIVEIS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={filtroEntidade}
            onChange={(e) => {
              setFiltroEntidade(e.target.value);
              setPage(1);
            }}
            className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="">Todas as Entidades</option>
            <option value="Producao">Produção</option>
            <option value="Teste">Qualidade (CQ)</option>
            <option value="Retrabalho">Retrabalho</option>
            <option value="MetaConfig">Metas Coletivas</option>
            <option value="Usuario">Usuários</option>
            <option value="OrdemServico">Ordens de Serviço</option>
          </select>
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="space-y-4">
        <Table
          columns={columns}
          data={logsFiltrados}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="Nenhum registro de auditoria encontrado com os filtros selecionados."
          onRowClick={(row) => setSelectedLog(row)}
        />

        {/* Paginação */}
        <div className="flex items-center justify-between px-2 text-xs sm:text-sm text-gray-400">
          <div>
            Exibindo <span className="font-semibold text-white">{logsFiltrados.length}</span> de{' '}
            <span className="font-semibold text-white">{total}</span> registros de auditoria
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-gray-300 font-medium">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Log */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Detalhes do Registro de Auditoria"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-surface-elevated/60 p-4 rounded-lg border border-surface-border">
              <div>
                <span className="text-xs text-gray-400">Ação:</span>
                <div className="mt-1">{getBadgeAcao(selectedLog.acao)}</div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Data e Hora:</span>
                <div className="text-gray-200 font-mono mt-1">
                  {new Date(selectedLog.criadoEm).toLocaleString('pt-BR')}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Responsável:</span>
                <div className="text-white font-medium mt-1">
                  {selectedLog.usuarioNome || 'Sistema / Automático'}
                </div>
                {selectedLog.usuarioPerfil && (
                  <div className="mt-1">{getBadgePerfil(selectedLog.usuarioPerfil)}</div>
                )}
              </div>
              <div>
                <span className="text-xs text-gray-400">Entidade / ID:</span>
                <div className="text-gray-200 font-mono text-xs mt-1">
                  {selectedLog.entidade} {selectedLog.entidadeId ? `(#${selectedLog.entidadeId})` : ''}
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-400 block mb-1 font-semibold">Descrição do Evento:</span>
              <div className="p-3 bg-surface-base border border-surface-border rounded-lg text-gray-200">
                {selectedLog.descricao}
              </div>
            </div>

            {selectedLog.detalhes && (
              <div>
                <span className="text-xs text-gray-400 block mb-1 font-semibold">
                  Payload de Dados (Snapshot JSON):
                </span>
                <pre className="p-3 bg-surface-base border border-surface-border rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.detalhes, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-surface-border">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
