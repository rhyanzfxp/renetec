import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench,
  CheckCircle,
  BarChart2,
  AlertTriangle,
  Building2,
  RefreshCw,
  Download,
  Printer,
  User,
  Package,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { relatorioApiService } from './relatorio.service';
import type {
  TipoRelatorio,
  PeriodoRapido,
  FiltrosRelatorio,
  ResponseRelatorioProducao,
  ResponseRelatorioQualidade,
  ResponseRelatorioRetrabalho,
  ResponseRelatorioConsolidado,
  ResponseRelatorioClientes,
  ItemRelatorioProducao,
  ItemRelatorioQualidade,
  ItemRelatorioRetrabalho,
  ConsolidadoTecnico,
  ConsolidadoInspetor,
  ItemRelatorioCliente,
} from './relatorio.types';

// ─── Utilitários ──────────────────────────────────────────────────────────────
const fmtData = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtDataCurta = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getPeriodoDates = (periodo: PeriodoRapido): { dataInicio: string; dataFim: string } => {
  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().split('T')[0];
  const clone = () => new Date(hoje);
  switch (periodo) {
    case 'hoje': { const d = iso(hoje); return { dataInicio: d, dataFim: d }; }
    case 'ontem': { const d = clone(); d.setDate(d.getDate() - 1); const s = iso(d); return { dataInicio: s, dataFim: s }; }
    case '7dias': { const d = clone(); d.setDate(d.getDate() - 7); return { dataInicio: iso(d), dataFim: iso(hoje) }; }
    case '30dias': { const d = clone(); d.setDate(d.getDate() - 30); return { dataInicio: iso(d), dataFim: iso(hoje) }; }
    case 'mes_atual': { const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1); return { dataInicio: iso(d), dataFim: iso(hoje) }; }
    default: return { dataInicio: '', dataFim: '' };
  }
};

const exportCSV = (rows: Record<string, unknown>[], filename: string) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(';')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ─── Hook de Paginação ────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function usePagination<T>(items: T[], initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Volta pra página 1 quando os itens mudam
  useEffect(() => { setPage(1); }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return { page: safePage, setPage, pageSize, setPageSize, totalPages, pageItems, total: items.length, start };
}

// ─── Componente de Paginação ──────────────────────────────────────────────────
const PaginacaoBar: React.FC<{
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  start: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}> = ({ page, totalPages, pageSize, total, start, onPageChange, onPageSizeChange }) => {
  const pageItems = Math.min(pageSize, total - start);
  const windowPages: number[] = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    windowPages.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-surface-border bg-surface-elevated/30 text-xs text-gray-400">
      {/* Info */}
      <span>
        Exibindo <span className="font-semibold text-gray-200">{start + 1}–{start + pageItems}</span> de{' '}
        <span className="font-semibold text-gray-200">{total}</span> registros
      </span>

      <div className="flex items-center gap-3">
        {/* Itens por página */}
        <div className="flex items-center gap-1.5">
          <span>Por página:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-surface-base border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Botões de página */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="px-2 py-1 rounded border border-surface-border bg-surface-base disabled:opacity-30 hover:bg-surface-elevated transition-colors"
            title="Primeira página"
          >
            «
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-2 py-1 rounded border border-surface-border bg-surface-base disabled:opacity-30 hover:bg-surface-elevated transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {windowPages[0] > 1 && <span className="px-1">…</span>}
          {windowPages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[28px] px-2 py-1 rounded border text-xs font-medium transition-colors ${
                p === page
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'border-surface-border bg-surface-base hover:bg-surface-elevated text-gray-300'
              }`}
            >
              {p}
            </button>
          ))}
          {windowPages[windowPages.length - 1] < totalPages && <span className="px-1">…</span>}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-2 py-1 rounded border border-surface-border bg-surface-base disabled:opacity-30 hover:bg-surface-elevated transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 rounded border border-surface-border bg-surface-base disabled:opacity-30 hover:bg-surface-elevated transition-colors"
            title="Última página"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Componentes Auxiliares ───────────────────────────────────────────────────
const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple' }> = ({
  children, color = 'gray',
}) => {
  const cls = {
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    gray: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls[color]}`}>
      {children}
    </span>
  );
};

const KpiCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color?: string; sub?: string }> = ({
  label, value, icon, color = 'blue', sub,
}) => {
  const map: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    red: 'text-red-400 bg-red-500/10 border-red-500/25',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
    gray: 'text-gray-400 bg-gray-500/10 border-gray-500/25',
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${map[color] ?? map.blue}`}>
      <div className="text-2xl">{icon}</div>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-xl font-bold tabular-nums text-white">{value}</div>
        {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ message?: string }> = ({ message = 'Nenhum dado encontrado para os filtros selecionados.' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
    <FileSpreadsheet className="w-12 h-12 mb-3 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─── Barra de Filtros Locais (busca + dropdowns) ──────────────────────────────
interface FiltrosLocais {
  busca: string;
  tecnico: string;
  inspetor: string;
  cliente: string;
  status: string;
}

const FiltrosLocaisBar: React.FC<{
  filtros: FiltrosLocais;
  onChange: (f: FiltrosLocais) => void;
  tecnicoOpts: string[];
  inspetorOpts: string[];
  clienteOpts: string[];
  statusOpts?: string[];
  showInspetor?: boolean;
  showTecnico?: boolean;
  showStatus?: boolean;
  placeholder?: string;
  totalFiltrado: number;
  totalOriginal: number;
}> = ({
  filtros, onChange,
  tecnicoOpts, inspetorOpts, clienteOpts, statusOpts = [],
  showInspetor = false, showTecnico = true, showStatus = false,
  placeholder = 'Buscar por OS, empresa ou técnico...',
  totalFiltrado, totalOriginal,
}) => {
  const temFiltro = filtros.busca || filtros.tecnico || filtros.inspetor || filtros.cliente || filtros.status;
  const limpar = () => onChange({ busca: '', tecnico: '', inspetor: '', cliente: '', status: '' });

  return (
    <div className="space-y-2 p-3 bg-surface-elevated/30 border border-surface-border/60 rounded-xl">
      <div className="flex flex-wrap gap-2">
        {/* Busca textual */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={filtros.busca}
            onChange={(e) => onChange({ ...filtros, busca: e.target.value })}
            placeholder={placeholder}
            className="w-full pl-8 pr-3 py-2 bg-surface-base border border-surface-border rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Dropdown Cliente */}
        {clienteOpts.length > 0 && (
          <select
            value={filtros.cliente}
            onChange={(e) => onChange({ ...filtros, cliente: e.target.value })}
            className="bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[180px]"
          >
            <option value="">Todos os Clientes</option>
            {clienteOpts.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {/* Dropdown Técnico */}
        {showTecnico && tecnicoOpts.length > 0 && (
          <select
            value={filtros.tecnico}
            onChange={(e) => onChange({ ...filtros, tecnico: e.target.value })}
            className="bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[160px]"
          >
            <option value="">Todos os Técnicos</option>
            {tecnicoOpts.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        {/* Dropdown Inspetor */}
        {showInspetor && inspetorOpts.length > 0 && (
          <select
            value={filtros.inspetor}
            onChange={(e) => onChange({ ...filtros, inspetor: e.target.value })}
            className="bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[160px]"
          >
            <option value="">Todos os Inspetores</option>
            {inspetorOpts.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        )}

        {/* Dropdown Status */}
        {showStatus && statusOpts.length > 0 && (
          <select
            value={filtros.status}
            onChange={(e) => onChange({ ...filtros, status: e.target.value })}
            className="bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[160px]"
          >
            <option value="">Todos os Status</option>
            {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {/* Limpar filtros */}
        {temFiltro && (
          <button
            onClick={limpar}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Contador de resultados filtrados */}
      {temFiltro && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Filter className="w-3 h-3" />
          <span>
            <span className="text-gray-300 font-semibold">{totalFiltrado}</span> de {totalOriginal} registros correspondendo aos filtros
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Templates de Relatório ───────────────────────────────────────────────────
const templateCards: { id: TipoRelatorio; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: 'producao', label: 'Produção de Técnicos', desc: 'Apontamentos de bancada: reparadas, sem defeito e sucata por OS', icon: <Wrench className="w-5 h-5" />, color: 'from-blue-600/30 to-blue-600/10 border-blue-500/30 text-blue-300' },
  { id: 'qualidade', label: 'Inspeções e Testes CQ', desc: 'Laudos de controle de qualidade, aprovações e rotas de retrabalho', icon: <CheckCircle className="w-5 h-5" />, color: 'from-emerald-600/30 to-emerald-600/10 border-emerald-500/30 text-emerald-300' },
  { id: 'consolidado', label: 'Consolidado Diário', desc: 'Totais e FPY% agregados por técnico e inspetor', icon: <BarChart2 className="w-5 h-5" />, color: 'from-purple-600/30 to-purple-600/10 border-purple-500/30 text-purple-300' },
  { id: 'retrabalho', label: 'Retrabalhos & Defeitos', desc: 'Histórico de não-conformidades, motivos e técnicos envolvidos', icon: <AlertTriangle className="w-5 h-5" />, color: 'from-amber-600/30 to-amber-600/10 border-amber-500/30 text-amber-300' },
  { id: 'clientes', label: 'Resumo por Cliente', desc: 'Volume total processado por empresa no período', icon: <Building2 className="w-5 h-5" />, color: 'from-pink-600/30 to-pink-600/10 border-pink-500/30 text-pink-300' },
];

// ─── Tabela de Produção ───────────────────────────────────────────────────────
const TabelaProducao: React.FC<{ dados: ItemRelatorioProducao[]; onExport: () => void }> = ({ dados, onExport }) => {
  const [filtros, setFiltros] = useState<FiltrosLocais>({ busca: '', tecnico: '', inspetor: '', cliente: '', status: '' });

  const tecnicoOpts = useMemo(() => [...new Set(dados.map((d) => d.tecnicoNome))].sort(), [dados]);
  const clienteOpts = useMemo(() => [...new Set(dados.map((d) => d.clienteNome))].sort(), [dados]);

  const filtrados = useMemo(() => {
    const b = filtros.busca.toLowerCase();
    return dados.filter((d) => {
      if (b && !`${d.numeroOS ?? ''} ${d.clienteNome} ${d.tecnicoNome} ${d.tipoEquipamentoNome}`.toLowerCase().includes(b)) return false;
      if (filtros.tecnico && d.tecnicoNome !== filtros.tecnico) return false;
      if (filtros.cliente && d.clienteNome !== filtros.cliente) return false;
      return true;
    });
  }, [dados, filtros]);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, start } = usePagination(filtrados);

  if (!dados.length) return <EmptyState />;

  return (
    <div className="space-y-3">
      <FiltrosLocaisBar
        filtros={filtros} onChange={setFiltros}
        tecnicoOpts={tecnicoOpts} inspetorOpts={[]} clienteOpts={clienteOpts}
        showTecnico showInspetor={false}
        placeholder="Buscar por OS, empresa, técnico ou equipamento..."
        totalFiltrado={filtrados.length} totalOriginal={dados.length}
      />
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className="flex justify-end px-3 py-2 border-b border-surface-border bg-surface-elevated/20">
          <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar CSV ({filtrados.length})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
                <th className="px-3 py-2 text-left font-semibold">OS</th>
                <th className="px-3 py-2 text-left font-semibold">Empresa</th>
                <th className="px-3 py-2 text-left font-semibold">Técnico</th>
                <th className="px-3 py-2 text-left font-semibold">Equipamento</th>
                <th className="px-3 py-2 text-right font-semibold">Reparadas</th>
                <th className="px-3 py-2 text-right font-semibold">Sem Def.</th>
                <th className="px-3 py-2 text-right font-semibold">Sucata</th>
                <th className="px-3 py-2 text-right font-semibold">Tot. Caixa</th>
                <th className="px-3 py-2 text-right font-semibold">Pontos</th>
                <th className="px-3 py-2 text-left font-semibold">Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={10}><EmptyState message="Nenhum resultado para os filtros aplicados." /></td></tr>
              ) : pageItems.map((item, i) => (
                <tr key={item.id} className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-card/20'}`}>
                  <td className="px-3 py-2.5">{item.numeroOS ? <span className="font-mono font-bold text-brand-300">#{item.numeroOS}</span> : <span className="text-gray-500">—</span>}</td>
                  <td className="px-3 py-2.5 text-gray-200 max-w-[120px] truncate">{item.clienteNome}</td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-1.5"><User className="w-3 h-3 text-gray-500" /><span className="text-gray-200">{item.tecnicoNome}</span></div></td>
                  <td className="px-3 py-2.5 text-gray-400 max-w-[130px] truncate">{item.tipoEquipamentoNome}</td>
                  <td className="px-3 py-2.5 text-right"><Badge color="blue">{item.quantidadeReparada}</Badge></td>
                  <td className="px-3 py-2.5 text-right"><Badge color="gray">{item.quantidadeSemDefeito}</Badge></td>
                  <td className="px-3 py-2.5 text-right"><Badge color="red">{item.quantidadeSucata}</Badge></td>
                  <td className="px-3 py-2.5 text-right font-bold text-white">{item.totalCaixa}</td>
                  <td className="px-3 py-2.5 text-right text-amber-300 font-semibold">{item.pontosTotal.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtData(item.dataRegistro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginacaoBar page={page} totalPages={totalPages} pageSize={pageSize} total={filtrados.length} start={start} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
};

// ─── Tabela de Qualidade ──────────────────────────────────────────────────────
const TabelaQualidade: React.FC<{ dados: ItemRelatorioQualidade[]; onExport: () => void }> = ({ dados, onExport }) => {
  const [filtros, setFiltros] = useState<FiltrosLocais>({ busca: '', tecnico: '', inspetor: '', cliente: '', status: '' });

  const inspetorOpts = useMemo(() => [...new Set(dados.map((d) => d.inspetorNome))].sort(), [dados]);
  const tecnicoOpts = useMemo(() => [...new Set(dados.map((d) => d.tecnicoReparoNome))].sort(), [dados]);
  const clienteOpts = useMemo(() => [...new Set(dados.map((d) => d.clienteNome))].sort(), [dados]);
  const statusOpts = ['APROVADO_TOTAL', 'APROVADO_PARCIAL', 'REPROVADO_TOTAL'];

  const filtrados = useMemo(() => {
    const b = filtros.busca.toLowerCase();
    return dados.filter((d) => {
      if (b && !`${d.numeroOS ?? ''} ${d.clienteNome} ${d.inspetorNome} ${d.tecnicoReparoNome} ${d.tipoEquipamentoNome}`.toLowerCase().includes(b)) return false;
      if (filtros.inspetor && d.inspetorNome !== filtros.inspetor) return false;
      if (filtros.tecnico && d.tecnicoReparoNome !== filtros.tecnico) return false;
      if (filtros.cliente && d.clienteNome !== filtros.cliente) return false;
      if (filtros.status && d.statusAprovacao !== filtros.status) return false;
      return true;
    });
  }, [dados, filtros]);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, start } = usePagination(filtrados);

  if (!dados.length) return <EmptyState />;

  return (
    <div className="space-y-3">
      <FiltrosLocaisBar
        filtros={filtros} onChange={setFiltros}
        tecnicoOpts={tecnicoOpts} inspetorOpts={inspetorOpts} clienteOpts={clienteOpts}
        statusOpts={statusOpts.map((s) => s)}
        showTecnico showInspetor showStatus
        placeholder="Buscar por OS, empresa, inspetor ou técnico..."
        totalFiltrado={filtrados.length} totalOriginal={dados.length}
      />
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className="flex justify-end px-3 py-2 border-b border-surface-border bg-surface-elevated/20">
          <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar CSV ({filtrados.length})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
                <th className="px-3 py-2 text-left font-semibold">OS</th>
                <th className="px-3 py-2 text-left font-semibold">Empresa</th>
                <th className="px-3 py-2 text-left font-semibold">Inspetor CQ</th>
                <th className="px-3 py-2 text-left font-semibold">Técnico Reparo</th>
                <th className="px-3 py-2 text-right font-semibold">Testadas</th>
                <th className="px-3 py-2 text-right font-semibold">Aprovadas</th>
                <th className="px-3 py-2 text-right font-semibold">Retrab.</th>
                <th className="px-3 py-2 text-left font-semibold">→ Destino</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={10}><EmptyState message="Nenhum resultado para os filtros aplicados." /></td></tr>
              ) : pageItems.map((item, i) => (
                <tr key={item.id} className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-card/20'}`}>
                  <td className="px-3 py-2.5">{item.numeroOS ? <span className="font-mono font-bold text-brand-300">#{item.numeroOS}</span> : <span className="text-gray-500">—</span>}</td>
                  <td className="px-3 py-2.5 text-gray-200 max-w-[120px] truncate">{item.clienteNome}</td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-gray-200">{item.inspetorNome}</span></div></td>
                  <td className="px-3 py-2.5 text-gray-400">{item.tecnicoReparoNome}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-white">{item.quantidadeTestada}</td>
                  <td className="px-3 py-2.5 text-right"><Badge color="green">{item.quantidadeAprovada} ✓</Badge></td>
                  <td className="px-3 py-2.5 text-right">{item.quantidadeReprovada > 0 ? <Badge color="amber">{item.quantidadeReprovada} ↩</Badge> : <span className="text-gray-600">—</span>}</td>
                  <td className="px-3 py-2.5">{item.tecnicoDestinoRetrabalho ? <div className="flex items-center gap-1 text-amber-400"><ArrowRight className="w-3 h-3" /><span>{item.tecnicoDestinoRetrabalho}</span></div> : <span className="text-gray-600">—</span>}</td>
                  <td className="px-3 py-2.5">
                    {item.statusAprovacao === 'APROVADO_TOTAL' ? <Badge color="green">Aprovado</Badge>
                      : item.statusAprovacao === 'APROVADO_PARCIAL' ? <Badge color="amber">Parcial</Badge>
                      : <Badge color="red">Reprovado</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtData(item.dataTeste)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginacaoBar page={page} totalPages={totalPages} pageSize={pageSize} total={filtrados.length} start={start} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
};

// ─── Tabela de Retrabalho ─────────────────────────────────────────────────────
const TabelaRetrabalho: React.FC<{ dados: ItemRelatorioRetrabalho[]; onExport: () => void }> = ({ dados, onExport }) => {
  const [filtros, setFiltros] = useState<FiltrosLocais>({ busca: '', tecnico: '', inspetor: '', cliente: '', status: '' });

  const tecnicoOpts = useMemo(() => [...new Set([...dados.map((d) => d.tecnicoOrigem), ...dados.map((d) => d.tecnicoDestino)])].sort(), [dados]);
  const clienteOpts = useMemo(() => [...new Set(dados.map((d) => d.clienteNome))].sort(), [dados]);

  const filtrados = useMemo(() => {
    const b = filtros.busca.toLowerCase();
    return dados.filter((d) => {
      if (b && !`${d.numeroOS ?? ''} ${d.clienteNome} ${d.tecnicoOrigem} ${d.tecnicoDestino} ${d.motivoDescricao} ${d.tipoEquipamentoNome}`.toLowerCase().includes(b)) return false;
      if (filtros.tecnico && d.tecnicoOrigem !== filtros.tecnico && d.tecnicoDestino !== filtros.tecnico) return false;
      if (filtros.cliente && d.clienteNome !== filtros.cliente) return false;
      if (filtros.status && d.status !== filtros.status) return false;
      return true;
    });
  }, [dados, filtros]);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, start } = usePagination(filtrados);

  if (!dados.length) return <EmptyState />;

  return (
    <div className="space-y-3">
      <FiltrosLocaisBar
        filtros={filtros} onChange={setFiltros}
        tecnicoOpts={tecnicoOpts} inspetorOpts={[]} clienteOpts={clienteOpts}
        statusOpts={['PENDENTE', 'CONCLUIDO']}
        showTecnico showInspetor={false} showStatus
        placeholder="Buscar por OS, empresa, técnico ou motivo..."
        totalFiltrado={filtrados.length} totalOriginal={dados.length}
      />
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className="flex justify-end px-3 py-2 border-b border-surface-border bg-surface-elevated/20">
          <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar CSV ({filtrados.length})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
                <th className="px-3 py-2 text-left font-semibold">OS</th>
                <th className="px-3 py-2 text-left font-semibold">Empresa</th>
                <th className="px-3 py-2 text-left font-semibold">Equipamento</th>
                <th className="px-3 py-2 text-right font-semibold">Un.</th>
                <th className="px-3 py-2 text-left font-semibold">Motivo / Defeito</th>
                <th className="px-3 py-2 text-left font-semibold">Inspetor CQ</th>
                <th className="px-3 py-2 text-left font-semibold">Origem → Destino</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={9}><EmptyState message="Nenhum resultado para os filtros aplicados." /></td></tr>
              ) : pageItems.map((item, i) => (
                <tr key={item.id} className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-card/20'}`}>
                  <td className="px-3 py-2.5">{item.numeroOS ? <span className="font-mono font-bold text-brand-300">#{item.numeroOS}</span> : <span className="text-gray-500">—</span>}</td>
                  <td className="px-3 py-2.5 text-gray-200 max-w-[110px] truncate">{item.clienteNome}</td>
                  <td className="px-3 py-2.5 text-gray-400 max-w-[120px] truncate">{item.tipoEquipamentoNome}</td>
                  <td className="px-3 py-2.5 text-right"><Badge color="amber">{item.quantidadeRetrabalho}</Badge></td>
                  <td className="px-3 py-2.5 max-w-[160px]">
                    <span className="text-red-300 truncate block">{item.motivoDescricao}</span>
                    {item.detalhesDefeito && <span className="text-gray-500 text-[11px] truncate block">{item.detalhesDefeito}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-400">{item.inspetorNome}</td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-1 text-xs"><span className="text-gray-300">{item.tecnicoOrigem}</span><ArrowRight className="w-3 h-3 text-amber-500" /><span className="text-amber-300">{item.tecnicoDestino}</span></div></td>
                  <td className="px-3 py-2.5">{item.status === 'CONCLUIDO' ? <Badge color="green">Concluído</Badge> : <Badge color="amber">Pendente</Badge>}</td>
                  <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDataCurta(item.dataCriacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginacaoBar page={page} totalPages={totalPages} pageSize={pageSize} total={filtrados.length} start={start} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
};

// ─── Tabela Consolidado ───────────────────────────────────────────────────────
const TabelaConsolidado: React.FC<{
  tecnicos: ConsolidadoTecnico[];
  inspetores: ConsolidadoInspetor[];
  onExportTecnicos: () => void;
  onExportInspetores: () => void;
}> = ({ tecnicos, inspetores, onExportTecnicos, onExportInspetores }) => {
  const [buscaTec, setBuscaTec] = useState('');
  const [buscaIns, setBuscaIns] = useState('');

  const tecsFiltrados = useMemo(() => {
    const b = buscaTec.toLowerCase();
    return !b ? tecnicos : tecnicos.filter((t) => t.nome.toLowerCase().includes(b));
  }, [tecnicos, buscaTec]);

  const insFiltrados = useMemo(() => {
    const b = buscaIns.toLowerCase();
    return !b ? inspetores : inspetores.filter((i) => i.nome.toLowerCase().includes(b));
  }, [inspetores, buscaIns]);

  const tecPag = usePagination(tecsFiltrados, 25);
  const insPag = usePagination(insFiltrados, 25);

  return (
    <div className="space-y-8">
      {/* Técnicos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Wrench className="w-4 h-4 text-blue-400" /> Técnicos de Produção</h3>
          <button onClick={onExportTecnicos} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"><Download className="w-3.5 h-3.5" /> CSV</button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input value={buscaTec} onChange={(e) => setBuscaTec(e.target.value)} placeholder="Filtrar técnico..." className="w-full pl-8 pr-3 py-2 bg-surface-base border border-surface-border rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        {tecsFiltrados.length === 0 ? <EmptyState message="Nenhum técnico encontrado." /> : (
          <div className="rounded-xl border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
                    <th className="px-3 py-2 text-left font-semibold">Técnico</th>
                    <th className="px-3 py-2 text-right font-semibold">Lotes</th>
                    <th className="px-3 py-2 text-right font-semibold">Reparadas</th>
                    <th className="px-3 py-2 text-right font-semibold">Sem Def.</th>
                    <th className="px-3 py-2 text-right font-semibold">Sucata</th>
                    <th className="px-3 py-2 text-right font-semibold">Retrabalhos</th>
                    <th className="px-3 py-2 text-right font-semibold">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {tecPag.pageItems.map((t, i) => (
                    <tr key={t.nome} className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 ${i % 2 === 0 ? '' : 'bg-surface-card/20'}`}>
                      <td className="px-3 py-2.5 font-semibold text-white"><div className="flex items-center gap-1.5"><User className="w-3 h-3 text-blue-400" />{t.nome}</div></td>
                      <td className="px-3 py-2.5 text-right text-gray-400">{t.totalLotes}</td>
                      <td className="px-3 py-2.5 text-right"><Badge color="blue">{t.totalReparadas}</Badge></td>
                      <td className="px-3 py-2.5 text-right"><Badge color="gray">{t.totalSemDefeito}</Badge></td>
                      <td className="px-3 py-2.5 text-right"><Badge color="red">{t.totalSucata}</Badge></td>
                      <td className="px-3 py-2.5 text-right">{t.retrabalhosRecebidos > 0 ? <Badge color="amber">{t.retrabalhosRecebidos}</Badge> : <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-amber-300">{t.pontosTotal.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginacaoBar page={tecPag.page} totalPages={tecPag.totalPages} pageSize={tecPag.pageSize} total={tecsFiltrados.length} start={tecPag.start} onPageChange={tecPag.setPage} onPageSizeChange={tecPag.setPageSize} />
          </div>
        )}
      </div>

      {/* Inspetores */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Inspetores de Controle de Qualidade</h3>
          <button onClick={onExportInspetores} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"><Download className="w-3.5 h-3.5" /> CSV</button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input value={buscaIns} onChange={(e) => setBuscaIns(e.target.value)} placeholder="Filtrar inspetor..." className="w-full pl-8 pr-3 py-2 bg-surface-base border border-surface-border rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        {insFiltrados.length === 0 ? <EmptyState message="Nenhum inspetor encontrado." /> : (
          <div className="rounded-xl border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
                    <th className="px-3 py-2 text-left font-semibold">Inspetor</th>
                    <th className="px-3 py-2 text-right font-semibold">Laudos</th>
                    <th className="px-3 py-2 text-right font-semibold">Testadas</th>
                    <th className="px-3 py-2 text-right font-semibold">Aprovadas</th>
                    <th className="px-3 py-2 text-right font-semibold">Reprovadas</th>
                    <th className="px-3 py-2 text-right font-semibold">FPY%</th>
                    <th className="px-3 py-2 text-right font-semibold">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {insPag.pageItems.map((ins, i) => (
                    <tr key={ins.nome} className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 ${i % 2 === 0 ? '' : 'bg-surface-card/20'}`}>
                      <td className="px-3 py-2.5 font-semibold text-white"><div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-400" />{ins.nome}</div></td>
                      <td className="px-3 py-2.5 text-right text-gray-400">{ins.totalLaudos}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-white">{ins.totalTestadas}</td>
                      <td className="px-3 py-2.5 text-right"><Badge color="green">{ins.totalAprovadas}</Badge></td>
                      <td className="px-3 py-2.5 text-right">{ins.totalReprovadas > 0 ? <Badge color="red">{ins.totalReprovadas}</Badge> : <span className="text-gray-600">0</span>}</td>
                      <td className="px-3 py-2.5 text-right"><span className={`font-bold ${ins.fpy >= 95 ? 'text-emerald-400' : ins.fpy >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{ins.fpy.toFixed(1)}%</span></td>
                      <td className="px-3 py-2.5 text-right font-bold text-amber-300">{ins.pontosTotal.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginacaoBar page={insPag.page} totalPages={insPag.totalPages} pageSize={insPag.pageSize} total={insFiltrados.length} start={insPag.start} onPageChange={insPag.setPage} onPageSizeChange={insPag.setPageSize} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tabela de Clientes ───────────────────────────────────────────────────────
const TabelaClientes: React.FC<{ dados: ItemRelatorioCliente[]; onExport: () => void }> = ({ dados, onExport }) => {
  const [busca, setBusca] = useState('');
  const filtrados = useMemo(() => {
    const b = busca.toLowerCase();
    return !b ? dados : dados.filter((d) => d.clienteNome.toLowerCase().includes(b));
  }, [dados, busca]);
  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, start } = usePagination(filtrados);

  if (!dados.length) return <EmptyState />;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar por cliente..." className="w-full pl-8 pr-3 py-2 bg-surface-base border border-surface-border rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className="flex justify-end px-3 py-2 border-b border-surface-border bg-surface-elevated/20">
          <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"><Download className="w-3.5 h-3.5" /> Exportar CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
                <th className="px-3 py-2 text-left font-semibold">Cliente / Empresa</th>
                <th className="px-3 py-2 text-right font-semibold">Apontamentos</th>
                <th className="px-3 py-2 text-right font-semibold">Reparadas</th>
                <th className="px-3 py-2 text-right font-semibold">Sem Def.</th>
                <th className="px-3 py-2 text-right font-semibold">Sucata</th>
                <th className="px-3 py-2 text-right font-semibold">Vol. Caixas</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={6}><EmptyState message="Nenhum cliente encontrado." /></td></tr>
              ) : pageItems.map((c, i) => (
                <tr key={c.clienteNome} className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 ${i % 2 === 0 ? '' : 'bg-surface-card/20'}`}>
                  <td className="px-3 py-2.5 font-semibold text-white"><div className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-pink-400" />{c.clienteNome}</div></td>
                  <td className="px-3 py-2.5 text-right text-gray-400">{c.totalApontamentos}</td>
                  <td className="px-3 py-2.5 text-right"><Badge color="blue">{c.totalReparadas}</Badge></td>
                  <td className="px-3 py-2.5 text-right"><Badge color="gray">{c.totalSemDefeito}</Badge></td>
                  <td className="px-3 py-2.5 text-right"><Badge color="red">{c.totalSucata}</Badge></td>
                  <td className="px-3 py-2.5 text-right font-bold text-white">{c.totalVolumeCaixas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginacaoBar page={page} totalPages={totalPages} pageSize={pageSize} total={filtrados.length} start={start} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
};

// ─── Página Principal ─────────────────────────────────────────────────────────
const periodoLabel: Record<PeriodoRapido, string> = {
  hoje: 'Hoje', ontem: 'Ontem', '7dias': 'Últimos 7 dias',
  '30dias': 'Últimos 30 dias', mes_atual: 'Este Mês', personalizado: 'Personalizado',
};

export const RelatoriosPage: React.FC = () => {
  const [tipo, setTipo] = useState<TipoRelatorio>('producao');
  const [periodo, setPeriodo] = useState<PeriodoRapido>('mes_atual');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [loading, setLoading] = useState(false);
  const [dataProducao, setDataProducao] = useState<ResponseRelatorioProducao | null>(null);
  const [dataQualidade, setDataQualidade] = useState<ResponseRelatorioQualidade | null>(null);
  const [dataRetrabalho, setDataRetrabalho] = useState<ResponseRelatorioRetrabalho | null>(null);
  const [dataConsolidado, setDataConsolidado] = useState<ResponseRelatorioConsolidado | null>(null);
  const [dataClientes, setDataClientes] = useState<ResponseRelatorioClientes | null>(null);

  const getFiltros = useCallback((): FiltrosRelatorio => {
    if (periodo === 'personalizado') return { dataInicio: dataInicio || undefined, dataFim: dataFim || undefined };
    return getPeriodoDates(periodo);
  }, [periodo, dataInicio, dataFim]);

  const carregarRelatorio = useCallback(async (t: TipoRelatorio) => {
    const filtros = getFiltros();
    setLoading(true);
    try {
      if (t === 'producao') { const d = await relatorioApiService.getProducao(filtros); setDataProducao(d); }
      else if (t === 'qualidade') { const d = await relatorioApiService.getQualidade(filtros); setDataQualidade(d); }
      else if (t === 'retrabalho') { const d = await relatorioApiService.getRetrabalho(filtros); setDataRetrabalho(d); }
      else if (t === 'consolidado') { const d = await relatorioApiService.getConsolidado(filtros); setDataConsolidado(d); }
      else if (t === 'clientes') { const d = await relatorioApiService.getClientes(filtros); setDataClientes(d); }
    } catch (err) { console.error('Erro ao carregar relatório:', err); }
    finally { setLoading(false); }
  }, [getFiltros]);

  useEffect(() => { carregarRelatorio(tipo); }, [tipo, periodo]);

  // Exportações CSV
  const exportarProducao = () => exportCSV((dataProducao?.dados ?? []).map((d) => ({ OS: d.numeroOS ?? '', Empresa: d.clienteNome, Tecnico: d.tecnicoNome, Equipamento: d.tipoEquipamentoNome, Reparadas: d.quantidadeReparada, SemDefeito: d.quantidadeSemDefeito, Sucata: d.quantidadeSucata, TotalCaixa: d.totalCaixa, Pontos: d.pontosTotal.toFixed(1), Data: fmtData(d.dataRegistro) })), `producao-${new Date().toISOString().split('T')[0]}.csv`);
  const exportarQualidade = () => exportCSV((dataQualidade?.dados ?? []).map((d) => ({ OS: d.numeroOS ?? '', Empresa: d.clienteNome, Inspetor: d.inspetorNome, TecnicoReparo: d.tecnicoReparoNome, Destino: d.tecnicoDestinoRetrabalho ?? '', Testadas: d.quantidadeTestada, Aprovadas: d.quantidadeAprovada, Reprovadas: d.quantidadeReprovada, Motivo: d.motivoReprovacao ?? '', Data: fmtData(d.dataTeste) })), `qualidade-${new Date().toISOString().split('T')[0]}.csv`);
  const exportarRetrabalho = () => exportCSV((dataRetrabalho?.dados ?? []).map((d) => ({ OS: d.numeroOS ?? '', Empresa: d.clienteNome, Equipamento: d.tipoEquipamentoNome, Unidades: d.quantidadeRetrabalho, Motivo: d.motivoDescricao, Origem: d.tecnicoOrigem, Destino: d.tecnicoDestino, Status: d.status, Data: fmtDataCurta(d.dataCriacao) })), `retrabalho-${new Date().toISOString().split('T')[0]}.csv`);
  const exportarConsolidadoTecnicos = () => exportCSV((dataConsolidado?.tecnicos ?? []).map((t) => ({ Tecnico: t.nome, Lotes: t.totalLotes, Reparadas: t.totalReparadas, SemDefeito: t.totalSemDefeito, Sucata: t.totalSucata, Retrabalhos: t.retrabalhosRecebidos, Pontos: t.pontosTotal.toFixed(1) })), `consolidado-tecnicos-${new Date().toISOString().split('T')[0]}.csv`);
  const exportarConsolidadoInspetores = () => exportCSV((dataConsolidado?.inspetores ?? []).map((i) => ({ Inspetor: i.nome, Laudos: i.totalLaudos, Testadas: i.totalTestadas, Aprovadas: i.totalAprovadas, Reprovadas: i.totalReprovadas, FPY: i.fpy.toFixed(1) + '%', Pontos: i.pontosTotal.toFixed(1) })), `consolidado-inspetores-${new Date().toISOString().split('T')[0]}.csv`);
  const exportarClientes = () => exportCSV((dataClientes?.dados ?? []).map((c) => ({ Cliente: c.clienteNome, Apontamentos: c.totalApontamentos, Reparadas: c.totalReparadas, SemDefeito: c.totalSemDefeito, Sucata: c.totalSucata, VolumeCaixas: c.totalVolumeCaixas })), `clientes-${new Date().toISOString().split('T')[0]}.csv`);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const renderKpis = () => {
    if (tipo === 'producao' && dataProducao) {
      const t = dataProducao.totais;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total de Lotes" value={t.totalItens} icon={<Package className="w-5 h-5" />} color="blue" />
          <KpiCard label="Reparadas" value={t.totalReparadas} icon={<Wrench className="w-5 h-5" />} color="blue" />
          <KpiCard label="Sem Defeito" value={t.totalSemDefeito} icon={<Minus className="w-5 h-5" />} color="purple" />
          <KpiCard label="Sucata / Morta" value={t.totalSucata} icon={<TrendingDown className="w-5 h-5" />} color="red" />
          <KpiCard label="Total Processado" value={t.totalProcessadoHoje} icon={<BarChart2 className="w-5 h-5" />} color="green" />
          <KpiCard label="Pontos Gerados" value={t.totalPontos.toFixed(1)} icon={<TrendingUp className="w-5 h-5" />} color="amber" sub="pts" />
        </div>
      );
    }
    if (tipo === 'qualidade' && dataQualidade) {
      const t = dataQualidade.totais;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total de Laudos" value={t.totalLaudos} icon={<CheckCircle className="w-5 h-5" />} color="green" />
          <KpiCard label="Testadas" value={t.totalTestadas} icon={<Package className="w-5 h-5" />} color="blue" />
          <KpiCard label="Aprovadas" value={t.totalAprovadas} icon={<TrendingUp className="w-5 h-5" />} color="green" />
          <KpiCard label="Retrabalho" value={t.totalReprovadas} icon={<TrendingDown className="w-5 h-5" />} color="amber" />
          <KpiCard label="FPY Global" value={`${t.fpy.toFixed(1)}%`} icon={<BarChart2 className="w-5 h-5" />} color={t.fpy >= 95 ? 'green' : t.fpy >= 80 ? 'amber' : 'red'} />
          <KpiCard label="Pontos Gerados" value={t.totalPontos.toFixed(1)} icon={<TrendingUp className="w-5 h-5" />} color="amber" sub="pts" />
        </div>
      );
    }
    if (tipo === 'retrabalho' && dataRetrabalho) {
      const t = dataRetrabalho.totais;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Ocorrências" value={t.totalOcorrencias} icon={<AlertTriangle className="w-5 h-5" />} color="amber" />
          <KpiCard label="Unidades" value={t.totalUnidades} icon={<Package className="w-5 h-5" />} color="red" />
          <KpiCard label="Pendentes" value={t.pendentes} icon={<Clock className="w-5 h-5" />} color="amber" />
          <KpiCard label="Concluídos" value={t.concluidos} icon={<CheckCircle className="w-5 h-5" />} color="green" />
        </div>
      );
    }
    if (tipo === 'consolidado' && dataConsolidado) {
      const t = dataConsolidado.totaisGerais;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiCard label="Reparadas" value={t.totalReparadas} icon={<Wrench className="w-5 h-5" />} color="blue" />
          <KpiCard label="Sem Defeito" value={t.totalSemDefeito} icon={<Minus className="w-5 h-5" />} color="purple" />
          <KpiCard label="Sucata" value={t.totalSucata} icon={<TrendingDown className="w-5 h-5" />} color="red" />
          <KpiCard label="Testadas CQ" value={t.totalTestadas} icon={<Package className="w-5 h-5" />} color="blue" />
          <KpiCard label="Aprovadas CQ" value={t.totalAprovadasCQ} icon={<CheckCircle className="w-5 h-5" />} color="green" />
          <KpiCard label="Retrabalho CQ" value={t.totalRetrabalhoCQ} icon={<AlertTriangle className="w-5 h-5" />} color="amber" />
          <KpiCard label="FPY Global" value={`${t.fpyGeral.toFixed(1)}%`} icon={<BarChart2 className="w-5 h-5" />} color={t.fpyGeral >= 95 ? 'green' : t.fpyGeral >= 80 ? 'amber' : 'red'} />
        </div>
      );
    }
    if (tipo === 'clientes' && dataClientes) {
      const t = dataClientes.totais;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Clientes Ativos" value={t.totalClientes} icon={<Building2 className="w-5 h-5" />} color="purple" />
          <KpiCard label="Total Reparadas" value={t.totalReparadas} icon={<Wrench className="w-5 h-5" />} color="blue" />
          <KpiCard label="Sem Defeito" value={t.totalSemDefeito} icon={<Minus className="w-5 h-5" />} color="gray" />
          <KpiCard label="Sucata" value={t.totalSucata} icon={<TrendingDown className="w-5 h-5" />} color="red" />
        </div>
      );
    }
    return null;
  };

  const renderTabela = () => {
    if (loading) return <LoadingSpinner />;
    if (tipo === 'producao') return <TabelaProducao dados={dataProducao?.dados ?? []} onExport={exportarProducao} />;
    if (tipo === 'qualidade') return <TabelaQualidade dados={dataQualidade?.dados ?? []} onExport={exportarQualidade} />;
    if (tipo === 'retrabalho') return <TabelaRetrabalho dados={dataRetrabalho?.dados ?? []} onExport={exportarRetrabalho} />;
    if (tipo === 'consolidado') return <TabelaConsolidado tecnicos={dataConsolidado?.tecnicos ?? []} inspetores={dataConsolidado?.inspetores ?? []} onExportTecnicos={exportarConsolidadoTecnicos} onExportInspetores={exportarConsolidadoInspetores} />;
    if (tipo === 'clientes') return <TabelaClientes dados={dataClientes?.dados ?? []} onExport={exportarClientes} />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Cards de Template */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {templateCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setTipo(card.id)}
            className={`relative p-4 rounded-xl border text-left transition-all duration-200 bg-gradient-to-br ${card.color} ${
              tipo === card.id
                ? 'ring-2 ring-offset-2 ring-offset-surface-base ring-white/20 shadow-lg scale-[1.02]'
                : 'opacity-60 hover:opacity-90 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{card.icon}</div>
              <div>
                <div className="text-xs font-bold leading-tight">{card.label}</div>
                <div className="text-[11px] opacity-70 mt-1 leading-snug">{card.desc}</div>
              </div>
            </div>
            {tipo === card.id && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/60 animate-pulse" />}
          </button>
        ))}
      </div>

      {/* Barra de Filtros de Período */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(periodoLabel) as PeriodoRapido[]).map((p) => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${periodo === p ? 'bg-brand-600 text-white' : 'bg-surface-elevated text-gray-400 hover:text-gray-200'}`}>
                {periodoLabel[p]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => carregarRelatorio(tipo)} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-elevated text-gray-300 border border-surface-border hover:bg-surface-elevated/80 transition-colors">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
          </div>
        </div>
        {periodo === 'personalizado' && (
          <div className="flex flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">De:</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-surface-base border border-surface-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Até:</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-surface-base border border-surface-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <button onClick={() => carregarRelatorio(tipo)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors">Filtrar</button>
          </div>
        )}
      </div>

      {/* KPIs */}
      {renderKpis()}

      {/* Tabela com filtros e paginação */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-gray-200">{templateCards.find((c) => c.id === tipo)?.label}</span>
            <span className="text-xs text-gray-500">· {periodoLabel[periodo]}</span>
          </div>
          {loading && <div className="flex items-center gap-1.5 text-xs text-gray-400"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Carregando...</div>}
        </div>
        <div className="p-4">{renderTabela()}</div>
      </div>
    </div>
  );
};
