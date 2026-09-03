import React, { useState, useEffect, useCallback } from 'react';
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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtDataCurta = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getPeriodoDates = (periodo: PeriodoRapido): { dataInicio: string; dataFim: string } => {
  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().split('T')[0];
  const cloneHoje = () => new Date(hoje);

  switch (periodo) {
    case 'hoje': {
      const d = iso(hoje);
      return { dataInicio: d, dataFim: d };
    }
    case 'ontem': {
      const d = cloneHoje();
      d.setDate(d.getDate() - 1);
      const s = iso(d);
      return { dataInicio: s, dataFim: s };
    }
    case '7dias': {
      const d = cloneHoje();
      d.setDate(d.getDate() - 7);
      return { dataInicio: iso(d), dataFim: iso(hoje) };
    }
    case '30dias': {
      const d = cloneHoje();
      d.setDate(d.getDate() - 30);
      return { dataInicio: iso(d), dataFim: iso(hoje) };
    }
    case 'mes_atual': {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { dataInicio: iso(d), dataFim: iso(hoje) };
    }
    default:
      return { dataInicio: '', dataFim: '' };
  }
};

// ─── Componentes Auxiliares ───────────────────────────────────────────────────
const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple' }> = ({
  children,
  color = 'gray',
}) => {
  const classes = {
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    gray: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${classes[color]}`}>
      {children}
    </span>
  );
};

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}> = ({ label, value, icon, color = 'blue', sub }) => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    red: 'text-red-400 bg-red-500/10 border-red-500/25',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  };
  const cls = colorMap[color] || colorMap.blue;
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${cls}`}>
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

// ─── Exportar CSV ──────────────────────────────────────────────────────────────
const exportCSV = (rows: Record<string, unknown>[], filename: string) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(';'),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(';')
    ),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Templates de Relatório (Cards Superiores) ────────────────────────────────
const templateCards: { id: TipoRelatorio; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    id: 'producao',
    label: 'Produção de Técnicos',
    desc: 'Apontamentos de bancada por OS, técnico, reparadas, sem defeito e sucata',
    icon: <Wrench className="w-5 h-5" />,
    color: 'from-blue-600/30 to-blue-600/10 border-blue-500/30 text-blue-300',
  },
  {
    id: 'qualidade',
    label: 'Inspeções e Testes CQ',
    desc: 'Laudos de controle de qualidade: aprovadas, retrabalho e rotas de devolução',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'from-emerald-600/30 to-emerald-600/10 border-emerald-500/30 text-emerald-300',
  },
  {
    id: 'consolidado',
    label: 'Consolidado Diário',
    desc: 'Totais e FPY por técnico e inspetor no período filtrado',
    icon: <BarChart2 className="w-5 h-5" />,
    color: 'from-purple-600/30 to-purple-600/10 border-purple-500/30 text-purple-300',
  },
  {
    id: 'retrabalho',
    label: 'Retrabalhos & Defeitos',
    desc: 'Histórico de não-conformidades, motivos e técnicos envolvidos',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'from-amber-600/30 to-amber-600/10 border-amber-500/30 text-amber-300',
  },
  {
    id: 'clientes',
    label: 'Resumo por Cliente',
    desc: 'Volume total processado por empresa/cliente no período',
    icon: <Building2 className="w-5 h-5" />,
    color: 'from-pink-600/30 to-pink-600/10 border-pink-500/30 text-pink-300',
  },
];

// ─── Sub-tabelas ──────────────────────────────────────────────────────────────
const TabelaProducao: React.FC<{ dados: ItemRelatorioProducao[]; onExport: () => void }> = ({ dados, onExport }) => {
  if (!dados.length) return <EmptyState />;
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border">
      <div className="flex justify-end p-2 border-b border-surface-border">
        <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
            <th className="px-3 py-2 text-left font-semibold">OS</th>
            <th className="px-3 py-2 text-left font-semibold">Empresa</th>
            <th className="px-3 py-2 text-left font-semibold">Técnico</th>
            <th className="px-3 py-2 text-left font-semibold">Equipamento</th>
            <th className="px-3 py-2 text-right font-semibold">Reparadas</th>
            <th className="px-3 py-2 text-right font-semibold">Sem Defeito</th>
            <th className="px-3 py-2 text-right font-semibold">Sucata</th>
            <th className="px-3 py-2 text-right font-semibold">Total Caixa</th>
            <th className="px-3 py-2 text-right font-semibold">Pontos</th>
            <th className="px-3 py-2 text-left font-semibold">Data</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((item, i) => (
            <tr
              key={item.id}
              className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 transition-colors ${
                i % 2 === 0 ? 'bg-transparent' : 'bg-surface-card/20'
              }`}
            >
              <td className="px-3 py-2.5">
                {item.numeroOS ? (
                  <span className="font-mono font-bold text-brand-300">#{item.numeroOS}</span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-200 max-w-[120px] truncate">{item.clienteNome}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-200">{item.tecnicoNome}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-gray-400 max-w-[130px] truncate">{item.tipoEquipamentoNome}</td>
              <td className="px-3 py-2.5 text-right">
                <Badge color="blue">{item.quantidadeReparada}</Badge>
              </td>
              <td className="px-3 py-2.5 text-right">
                <Badge color="gray">{item.quantidadeSemDefeito}</Badge>
              </td>
              <td className="px-3 py-2.5 text-right">
                <Badge color="red">{item.quantidadeSucata}</Badge>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="font-bold text-white">{item.totalCaixa}</span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="text-amber-300 font-semibold">{item.pontosTotal.toFixed(1)}</span>
              </td>
              <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtData(item.dataRegistro)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TabelaQualidade: React.FC<{ dados: ItemRelatorioQualidade[]; onExport: () => void }> = ({ dados, onExport }) => {
  if (!dados.length) return <EmptyState />;
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border">
      <div className="flex justify-end p-2 border-b border-surface-border">
        <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
            <th className="px-3 py-2 text-left font-semibold">OS</th>
            <th className="px-3 py-2 text-left font-semibold">Empresa</th>
            <th className="px-3 py-2 text-left font-semibold">Inspetor (CQ)</th>
            <th className="px-3 py-2 text-left font-semibold">Técnico Reparo</th>
            <th className="px-3 py-2 text-right font-semibold">Testadas</th>
            <th className="px-3 py-2 text-right font-semibold">Aprovadas</th>
            <th className="px-3 py-2 text-right font-semibold">Retrabalho</th>
            <th className="px-3 py-2 text-left font-semibold">Destino</th>
            <th className="px-3 py-2 text-left font-semibold">Status</th>
            <th className="px-3 py-2 text-left font-semibold">Data</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((item, i) => (
            <tr
              key={item.id}
              className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 transition-colors ${
                i % 2 === 0 ? 'bg-transparent' : 'bg-surface-card/20'
              }`}
            >
              <td className="px-3 py-2.5">
                {item.numeroOS ? (
                  <span className="font-mono font-bold text-brand-300">#{item.numeroOS}</span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-200 max-w-[120px] truncate">{item.clienteNome}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  <span className="text-gray-200">{item.inspetorNome}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-gray-400">{item.tecnicoReparoNome}</td>
              <td className="px-3 py-2.5 text-right font-semibold text-white">{item.quantidadeTestada}</td>
              <td className="px-3 py-2.5 text-right">
                <Badge color="green">{item.quantidadeAprovada} ✓</Badge>
              </td>
              <td className="px-3 py-2.5 text-right">
                {item.quantidadeReprovada > 0 ? (
                  <Badge color="amber">{item.quantidadeReprovada} ↩</Badge>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {item.tecnicoDestinoRetrabalho ? (
                  <div className="flex items-center gap-1 text-amber-400">
                    <ArrowRight className="w-3 h-3" />
                    <span>{item.tecnicoDestinoRetrabalho}</span>
                  </div>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {item.statusAprovacao === 'APROVADO_TOTAL' ? (
                  <Badge color="green">Aprovado</Badge>
                ) : item.statusAprovacao === 'APROVADO_PARCIAL' ? (
                  <Badge color="amber">Parcial</Badge>
                ) : (
                  <Badge color="red">Reprovado</Badge>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtData(item.dataTeste)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TabelaRetrabalho: React.FC<{ dados: ItemRelatorioRetrabalho[]; onExport: () => void }> = ({ dados, onExport }) => {
  if (!dados.length) return <EmptyState />;
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border">
      <div className="flex justify-end p-2 border-b border-surface-border">
        <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
            <th className="px-3 py-2 text-left font-semibold">OS</th>
            <th className="px-3 py-2 text-left font-semibold">Empresa</th>
            <th className="px-3 py-2 text-left font-semibold">Equipamento</th>
            <th className="px-3 py-2 text-right font-semibold">Un.</th>
            <th className="px-3 py-2 text-left font-semibold">Motivo</th>
            <th className="px-3 py-2 text-left font-semibold">Inspetor CQ</th>
            <th className="px-3 py-2 text-left font-semibold">Origem → Destino</th>
            <th className="px-3 py-2 text-left font-semibold">Status</th>
            <th className="px-3 py-2 text-left font-semibold">Data</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((item, i) => (
            <tr
              key={item.id}
              className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 transition-colors ${
                i % 2 === 0 ? 'bg-transparent' : 'bg-surface-card/20'
              }`}
            >
              <td className="px-3 py-2.5">
                {item.numeroOS ? (
                  <span className="font-mono font-bold text-brand-300">#{item.numeroOS}</span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-200 max-w-[120px] truncate">{item.clienteNome}</td>
              <td className="px-3 py-2.5 text-gray-400 max-w-[130px] truncate">{item.tipoEquipamentoNome}</td>
              <td className="px-3 py-2.5 text-right">
                <Badge color="amber">{item.quantidadeRetrabalho}</Badge>
              </td>
              <td className="px-3 py-2.5 max-w-[160px]">
                <span className="text-red-300 truncate block">{item.motivoDescricao}</span>
                {item.detalhesDefeito && (
                  <span className="text-gray-500 text-[11px] truncate block">{item.detalhesDefeito}</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-400">{item.inspetorNome}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-300">{item.tecnicoOrigem}</span>
                  <ArrowRight className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-300">{item.tecnicoDestino}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                {item.status === 'CONCLUIDO' ? (
                  <Badge color="green">Concluído</Badge>
                ) : (
                  <Badge color="amber">Pendente</Badge>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDataCurta(item.dataCriacao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TabelaConsolidado: React.FC<{
  tecnicos: ConsolidadoTecnico[];
  inspetores: ConsolidadoInspetor[];
  onExportTecnicos: () => void;
  onExportInspetores: () => void;
}> = ({ tecnicos, inspetores, onExportTecnicos, onExportInspetores }) => (
  <div className="space-y-6">
    {/* Técnicos */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-400" /> Técnicos de Produção
        </h3>
        <button onClick={onExportTecnicos} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>
      {tecnicos.length === 0 ? (
        <EmptyState message="Nenhum apontamento de produção no período." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
                <th className="px-3 py-2 text-left font-semibold">Técnico</th>
                <th className="px-3 py-2 text-right font-semibold">Lotes</th>
                <th className="px-3 py-2 text-right font-semibold">Reparadas</th>
                <th className="px-3 py-2 text-right font-semibold">Sem Defeito</th>
                <th className="px-3 py-2 text-right font-semibold">Sucata</th>
                <th className="px-3 py-2 text-right font-semibold">Retrabalhos</th>
                <th className="px-3 py-2 text-right font-semibold">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.map((t, i) => (
                <tr key={t.nome} className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 ${i % 2 === 0 ? '' : 'bg-surface-card/20'}`}>
                  <td className="px-3 py-2.5 font-semibold text-white flex items-center gap-1.5">
                    <User className="w-3 h-3 text-blue-400" /> {t.nome}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-400">{t.totalLotes}</td>
                  <td className="px-3 py-2.5 text-right"><Badge color="blue">{t.totalReparadas}</Badge></td>
                  <td className="px-3 py-2.5 text-right"><Badge color="gray">{t.totalSemDefeito}</Badge></td>
                  <td className="px-3 py-2.5 text-right"><Badge color="red">{t.totalSucata}</Badge></td>
                  <td className="px-3 py-2.5 text-right">
                    {t.retrabalhosRecebidos > 0 ? <Badge color="amber">{t.retrabalhosRecebidos}</Badge> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-amber-300">{t.pontosTotal.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* Inspetores CQ */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" /> Inspetores de Controle de Qualidade
        </h3>
        <button onClick={onExportInspetores} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>
      {inspetores.length === 0 ? (
        <EmptyState message="Nenhum laudo de CQ no período." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border">
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
              {inspetores.map((ins, i) => (
                <tr key={ins.nome} className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 ${i % 2 === 0 ? '' : 'bg-surface-card/20'}`}>
                  <td className="px-3 py-2.5 font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> {ins.nome}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-400">{ins.totalLaudos}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-white">{ins.totalTestadas}</td>
                  <td className="px-3 py-2.5 text-right"><Badge color="green">{ins.totalAprovadas}</Badge></td>
                  <td className="px-3 py-2.5 text-right">
                    {ins.totalReprovadas > 0 ? <Badge color="red">{ins.totalReprovadas}</Badge> : <span className="text-gray-600">0</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-bold ${ins.fpy >= 95 ? 'text-emerald-400' : ins.fpy >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                      {ins.fpy.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-amber-300">{ins.pontosTotal.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

const TabelaClientes: React.FC<{ dados: ItemRelatorioCliente[]; onExport: () => void }> = ({ dados, onExport }) => {
  if (!dados.length) return <EmptyState />;
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border">
      <div className="flex justify-end p-2 border-b border-surface-border">
        <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 bg-surface-elevated/40 border-b border-surface-border">
            <th className="px-3 py-2 text-left font-semibold">Cliente / Empresa</th>
            <th className="px-3 py-2 text-right font-semibold">Apontamentos</th>
            <th className="px-3 py-2 text-right font-semibold">Reparadas</th>
            <th className="px-3 py-2 text-right font-semibold">Sem Defeito</th>
            <th className="px-3 py-2 text-right font-semibold">Sucata</th>
            <th className="px-3 py-2 text-right font-semibold">Vol. Total Caixas</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((c, i) => (
            <tr key={c.clienteNome} className={`border-b border-surface-border/50 hover:bg-surface-elevated/30 ${i % 2 === 0 ? '' : 'bg-surface-card/20'}`}>
              <td className="px-3 py-2.5 font-semibold text-white flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-pink-400" /> {c.clienteNome}
              </td>
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
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export const RelatoriosPage: React.FC = () => {
  const [tipo, setTipo] = useState<TipoRelatorio>('producao');
  const [periodo, setPeriodo] = useState<PeriodoRapido>('mes_atual');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [loadingProducao, setLoadingProducao] = useState(false);
  const [loadingQualidade, setLoadingQualidade] = useState(false);
  const [loadingRetrabalho, setLoadingRetrabalho] = useState(false);
  const [loadingConsolidado, setLoadingConsolidado] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const [dataProducao, setDataProducao] = useState<ResponseRelatorioProducao | null>(null);
  const [dataQualidade, setDataQualidade] = useState<ResponseRelatorioQualidade | null>(null);
  const [dataRetrabalho, setDataRetrabalho] = useState<ResponseRelatorioRetrabalho | null>(null);
  const [dataConsolidado, setDataConsolidado] = useState<ResponseRelatorioConsolidado | null>(null);
  const [dataClientes, setDataClientes] = useState<ResponseRelatorioClientes | null>(null);

  const getFiltros = useCallback((): FiltrosRelatorio => {
    if (periodo === 'personalizado') {
      return { dataInicio: dataInicio || undefined, dataFim: dataFim || undefined };
    }
    return getPeriodoDates(periodo);
  }, [periodo, dataInicio, dataFim]);

  const carregarRelatorio = useCallback(async (t: TipoRelatorio) => {
    const filtros = getFiltros();

    try {
      if (t === 'producao') {
        setLoadingProducao(true);
        const d = await relatorioApiService.getProducao(filtros);
        setDataProducao(d);
      } else if (t === 'qualidade') {
        setLoadingQualidade(true);
        const d = await relatorioApiService.getQualidade(filtros);
        setDataQualidade(d);
      } else if (t === 'retrabalho') {
        setLoadingRetrabalho(true);
        const d = await relatorioApiService.getRetrabalho(filtros);
        setDataRetrabalho(d);
      } else if (t === 'consolidado') {
        setLoadingConsolidado(true);
        const d = await relatorioApiService.getConsolidado(filtros);
        setDataConsolidado(d);
      } else if (t === 'clientes') {
        setLoadingClientes(true);
        const d = await relatorioApiService.getClientes(filtros);
        setDataClientes(d);
      }
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setLoadingProducao(false);
      setLoadingQualidade(false);
      setLoadingRetrabalho(false);
      setLoadingConsolidado(false);
      setLoadingClientes(false);
    }
  }, [getFiltros]);

  useEffect(() => {
    carregarRelatorio(tipo);
  }, [tipo, periodo]);

  const handleAtualizar = () => carregarRelatorio(tipo);

  // Exportações CSV
  const exportarProducao = () => {
    if (!dataProducao?.dados) return;
    exportCSV(
      dataProducao.dados.map((d) => ({
        OS: d.numeroOS ?? '',
        Empresa: d.clienteNome,
        Tecnico: d.tecnicoNome,
        Equipamento: d.tipoEquipamentoNome,
        Reparadas: d.quantidadeReparada,
        SemDefeito: d.quantidadeSemDefeito,
        Sucata: d.quantidadeSucata,
        TotalCaixa: d.totalCaixa,
        PontosTotal: d.pontosTotal.toFixed(1),
        Data: fmtData(d.dataRegistro),
      })),
      `relatorio-producao-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const exportarQualidade = () => {
    if (!dataQualidade?.dados) return;
    exportCSV(
      dataQualidade.dados.map((d) => ({
        OS: d.numeroOS ?? '',
        Empresa: d.clienteNome,
        Inspetor: d.inspetorNome,
        TecnicoReparo: d.tecnicoReparoNome,
        TecnicoDestino: d.tecnicoDestinoRetrabalho ?? '',
        Testadas: d.quantidadeTestada,
        Aprovadas: d.quantidadeAprovada,
        Reprovadas: d.quantidadeReprovada,
        FPY_Perc: d.quantidadeTestada > 0 ? ((d.quantidadeAprovada / d.quantidadeTestada) * 100).toFixed(1) + '%' : '100%',
        Motivo: d.motivoReprovacao ?? '',
        Data: fmtData(d.dataTeste),
      })),
      `relatorio-qualidade-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const exportarRetrabalho = () => {
    if (!dataRetrabalho?.dados) return;
    exportCSV(
      dataRetrabalho.dados.map((d) => ({
        OS: d.numeroOS ?? '',
        Empresa: d.clienteNome,
        Equipamento: d.tipoEquipamentoNome,
        Unidades: d.quantidadeRetrabalho,
        Motivo: d.motivoDescricao,
        Defeito: d.detalhesDefeito,
        Origem: d.tecnicoOrigem,
        Destino: d.tecnicoDestino,
        Status: d.status,
        Data: fmtDataCurta(d.dataCriacao),
      })),
      `relatorio-retrabalho-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const exportarConsolidadoTecnicos = () => {
    if (!dataConsolidado?.tecnicos) return;
    exportCSV(
      dataConsolidado.tecnicos.map((t) => ({
        Tecnico: t.nome,
        Lotes: t.totalLotes,
        Reparadas: t.totalReparadas,
        SemDefeito: t.totalSemDefeito,
        Sucata: t.totalSucata,
        RetrabalhosRecebidos: t.retrabalhosRecebidos,
        Pontos: t.pontosTotal.toFixed(1),
      })),
      `consolidado-tecnicos-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const exportarConsolidadoInspetores = () => {
    if (!dataConsolidado?.inspetores) return;
    exportCSV(
      dataConsolidado.inspetores.map((ins) => ({
        Inspetor: ins.nome,
        Laudos: ins.totalLaudos,
        Testadas: ins.totalTestadas,
        Aprovadas: ins.totalAprovadas,
        Reprovadas: ins.totalReprovadas,
        FPY: ins.fpy.toFixed(1) + '%',
        Pontos: ins.pontosTotal.toFixed(1),
      })),
      `consolidado-inspetores-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const exportarClientes = () => {
    if (!dataClientes?.dados) return;
    exportCSV(
      dataClientes.dados.map((c) => ({
        Cliente: c.clienteNome,
        Apontamentos: c.totalApontamentos,
        Reparadas: c.totalReparadas,
        SemDefeito: c.totalSemDefeito,
        Sucata: c.totalSucata,
        VolumeCaixas: c.totalVolumeCaixas,
      })),
      `relatorio-clientes-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const isLoading =
    loadingProducao || loadingQualidade || loadingRetrabalho || loadingConsolidado || loadingClientes;

  // ─── KPI Cards de acordo com relatório ativo ──────────────────────────────
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
          <KpiCard label="Aprovadas (Passou)" value={t.totalAprovadas} icon={<TrendingUp className="w-5 h-5" />} color="green" />
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
          <KpiCard label="Unidades Retrabalho" value={t.totalUnidades} icon={<Package className="w-5 h-5" />} color="red" />
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

  // ─── Tabela de acordo com relatório ativo ─────────────────────────────────
  const renderTabela = () => {
    if (isLoading) return <LoadingSpinner />;
    if (tipo === 'producao') return <TabelaProducao dados={dataProducao?.dados || []} onExport={exportarProducao} />;
    if (tipo === 'qualidade') return <TabelaQualidade dados={dataQualidade?.dados || []} onExport={exportarQualidade} />;
    if (tipo === 'retrabalho') return <TabelaRetrabalho dados={dataRetrabalho?.dados || []} onExport={exportarRetrabalho} />;
    if (tipo === 'consolidado') return (
      <TabelaConsolidado
        tecnicos={dataConsolidado?.tecnicos || []}
        inspetores={dataConsolidado?.inspetores || []}
        onExportTecnicos={exportarConsolidadoTecnicos}
        onExportInspetores={exportarConsolidadoInspetores}
      />
    );
    if (tipo === 'clientes') return <TabelaClientes dados={dataClientes?.dados || []} onExport={exportarClientes} />;
    return null;
  };

  const periodoLabel: Record<PeriodoRapido, string> = {
    hoje: 'Hoje',
    ontem: 'Ontem',
    '7dias': 'Últimos 7 dias',
    '30dias': 'Últimos 30 dias',
    mes_atual: 'Este Mês',
    personalizado: 'Personalizado',
  };

  return (
    <div className="space-y-6">
      {/* ── Cards de Template de Relatório ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {templateCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setTipo(card.id)}
            className={`relative p-4 rounded-xl border text-left transition-all duration-200 group bg-gradient-to-br ${card.color} ${
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
            {tipo === card.id && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/60 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* ── Barra de Filtros ────────────────────────────────────────── */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Período Rápido */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(periodoLabel) as PeriodoRapido[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  periodo === p
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-elevated text-gray-400 hover:text-gray-200 hover:bg-surface-elevated/80'
                }`}
              >
                {periodoLabel[p]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Botão Atualizar */}
            <button
              onClick={handleAtualizar}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>

            {/* Botão Imprimir */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-elevated text-gray-300 border border-surface-border hover:bg-surface-elevated/80 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Datas personalizadas */}
        {periodo === 'personalizado' && (
          <div className="flex flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">De:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-surface-base border border-surface-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Até:</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-surface-base border border-surface-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              onClick={handleAtualizar}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              Filtrar
            </button>
          </div>
        )}
      </div>

      {/* ── KPIs do Período ─────────────────────────────────────────── */}
      {renderKpis()}

      {/* ── Tabela de Dados ─────────────────────────────────────────── */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-gray-200">
              {templateCards.find((c) => c.id === tipo)?.label}
            </span>
            <span className="text-xs text-gray-500">· {periodoLabel[periodo]}</span>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Carregando...
            </div>
          )}
        </div>
        <div className="p-4">
          {renderTabela()}
        </div>
      </div>
    </div>
  );
};
