import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { clsx } from 'clsx';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Layers,
  BarChart2,
  Box,
  Wrench,
  Tag,
  X,
  ClipboardList,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type CategoriaEstoque = 'COMPONENTE' | 'FERRAMENTA' | 'CONSUMIVEL' | 'PECAREPOSICAO';
type StatusEstoque = 'OK' | 'BAIXO' | 'CRITICO' | 'INDISPONIVEL';

interface ItemEstoque {
  id: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaEstoque;
  unidade: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  quantidadeIdeal: number;
  localizacao: string;
  fornecedor: string;
  ultimaMovimentacao: string;
}

interface MovimentacaoEstoque {
  id: string;
  itemId: string;
  itemCodigo: string;
  itemDescricao: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  motivo: string;
  usuario: string;
  data: string;
}

// ─── Dados em memória (mock) ──────────────────────────────────────────────────

const ITENS_MOCK: ItemEstoque[] = [
  { id: 'est-001', codigo: 'CAP-470UF-50V', descricao: 'Capacitor Eletrolítico 470µF 50V', categoria: 'COMPONENTE', unidade: 'un', quantidadeAtual: 340, quantidadeMinima: 100, quantidadeIdeal: 500, localizacao: 'Prateleira A-01', fornecedor: 'RS Components', ultimaMovimentacao: '2026-08-14' },
  { id: 'est-002', codigo: 'RES-10K-1W', descricao: 'Resistor 10kΩ 1W 5%', categoria: 'COMPONENTE', unidade: 'un', quantidadeAtual: 85, quantidadeMinima: 200, quantidadeIdeal: 1000, localizacao: 'Prateleira A-02', fornecedor: 'RS Components', ultimaMovimentacao: '2026-08-13' },
  { id: 'est-003', codigo: 'IGBT-IHW30N90E1', descricao: 'IGBT N-Channel 900V 30A TO-247', categoria: 'COMPONENTE', unidade: 'un', quantidadeAtual: 12, quantidadeMinima: 20, quantidadeIdeal: 50, localizacao: 'Prateleira B-01', fornecedor: 'Mouser Electronics', ultimaMovimentacao: '2026-08-15' },
  { id: 'est-004', codigo: 'SOLDA-SAC305-1KG', descricao: 'Solda em Fio SAC305 Rolo 1kg Ø0.8mm', categoria: 'CONSUMIVEL', unidade: 'rolo', quantidadeAtual: 8, quantidadeMinima: 5, quantidadeIdeal: 15, localizacao: 'Armário C-01', fornecedor: 'Qualitek', ultimaMovimentacao: '2026-08-10' },
  { id: 'est-005', codigo: 'FLUXO-No-Clean-500ML', descricao: 'Fluxo Resinoso No-Clean 500mL', categoria: 'CONSUMIVEL', unidade: 'frasco', quantidadeAtual: 3, quantidadeMinima: 5, quantidadeIdeal: 10, localizacao: 'Armário C-02', fornecedor: 'Qualitek', ultimaMovimentacao: '2026-08-12' },
  { id: 'est-006', codigo: 'OSCIL-DS1054Z', descricao: 'Osciloscópio Digital 4CH 50MHz', categoria: 'FERRAMENTA', unidade: 'un', quantidadeAtual: 2, quantidadeMinima: 2, quantidadeIdeal: 3, localizacao: 'Bancada Teste T-01', fornecedor: 'Rigol', ultimaMovimentacao: '2026-08-01' },
  { id: 'est-007', codigo: 'MULTIM-UT61E', descricao: 'Multímetro Digital True-RMS UNI-T', categoria: 'FERRAMENTA', unidade: 'un', quantidadeAtual: 5, quantidadeMinima: 3, quantidadeIdeal: 6, localizacao: 'Armário Ferramentas F-01', fornecedor: 'UNI-T Brasil', ultimaMovimentacao: '2026-08-08' },
  { id: 'est-008', codigo: 'DRIVER-IR2110', descricao: 'Driver de Gate IR2110 DIP-14', categoria: 'COMPONENTE', unidade: 'un', quantidadeAtual: 0, quantidadeMinima: 30, quantidadeIdeal: 100, localizacao: 'Prateleira B-02', fornecedor: 'Mouser Electronics', ultimaMovimentacao: '2026-08-05' },
  { id: 'est-009', codigo: 'VENT-AXIAL-80MM', descricao: 'Ventilador Axial 80mm 12VDC 1.8W', categoria: 'PECAREPOSICAO', unidade: 'un', quantidadeAtual: 18, quantidadeMinima: 10, quantidadeIdeal: 30, localizacao: 'Prateleira D-01', fornecedor: 'Delta Electronics', ultimaMovimentacao: '2026-08-11' },
  { id: 'est-010', codigo: 'PASTA-TERM-100G', descricao: 'Pasta Térmica Condutora Silicone 100g', categoria: 'CONSUMIVEL', unidade: 'pote', quantidadeAtual: 6, quantidadeMinima: 3, quantidadeIdeal: 10, localizacao: 'Armário C-03', fornecedor: 'Implastec', ultimaMovimentacao: '2026-08-09' },
];

const MOVIMENTACOES_MOCK: MovimentacaoEstoque[] = [
  { id: 'mov-1', itemId: 'est-003', itemCodigo: 'IGBT-IHW30N90E1', itemDescricao: 'IGBT N-Channel 900V 30A', tipo: 'SAIDA', quantidade: 4, motivo: 'Uso em reparo OS #1528 — Inversores WEG', usuario: 'João Silva', data: '2026-08-15T14:32:00' },
  { id: 'mov-2', itemId: 'est-001', itemCodigo: 'CAP-470UF-50V', itemDescricao: 'Capacitor Eletrolítico 470µF', tipo: 'SAIDA', quantidade: 20, motivo: 'Uso em reparo OS #1529 — Soft-Starters', usuario: 'Samuel Oliveira', data: '2026-08-15T11:20:00' },
  { id: 'mov-3', itemId: 'est-002', itemCodigo: 'RES-10K-1W', itemDescricao: 'Resistor 10kΩ 1W', tipo: 'ENTRADA', quantidade: 500, motivo: 'Reposição de estoque — NF 4521', usuario: 'Admin', data: '2026-08-14T09:00:00' },
  { id: 'mov-4', itemId: 'est-008', itemCodigo: 'DRIVER-IR2110', itemDescricao: 'Driver de Gate IR2110', tipo: 'SAIDA', quantidade: 12, motivo: 'Esgotamento em bancada de reparos', usuario: 'Jonas Pereira', data: '2026-08-13T16:45:00' },
  { id: 'mov-5', itemId: 'est-009', itemCodigo: 'VENT-AXIAL-80MM', itemDescricao: 'Ventilador Axial 80mm', tipo: 'ENTRADA', quantidade: 10, motivo: 'Reposição de estoque — NF 4498', usuario: 'Admin', data: '2026-08-11T10:30:00' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusEstoque(item: ItemEstoque): StatusEstoque {
  if (item.quantidadeAtual === 0) return 'INDISPONIVEL';
  if (item.quantidadeAtual < item.quantidadeMinima) return 'CRITICO';
  if (item.quantidadeAtual < item.quantidadeMinima * 1.5) return 'BAIXO';
  return 'OK';
}

const STATUS_CONFIG: Record<StatusEstoque, { label: string; className: string; dot: string }> = {
  OK: { label: 'OK', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
  BAIXO: { label: 'Baixo', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' },
  CRITICO: { label: 'Crítico', className: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-500' },
  INDISPONIVEL: { label: 'Indisponível', className: 'bg-gray-500/10 text-gray-400 border-gray-500/30', dot: 'bg-gray-500' },
};

const CATEGORIA_CONFIG: Record<CategoriaEstoque, { label: string; icon: React.ReactNode; color: string }> = {
  COMPONENTE: { label: 'Componente', icon: <Layers className="w-3 h-3" />, color: 'text-blue-400' },
  FERRAMENTA: { label: 'Ferramenta', icon: <Wrench className="w-3 h-3" />, color: 'text-purple-400' },
  CONSUMIVEL: { label: 'Consumível', icon: <Box className="w-3 h-3" />, color: 'text-amber-400' },
  PECAREPOSICAO: { label: 'Peça de Reposição', icon: <Tag className="w-3 h-3" />, color: 'text-cyan-400' },
};

function getStockBarWidth(item: ItemEstoque): number {
  if (item.quantidadeIdeal === 0) return 0;
  return Math.min(100, Math.round((item.quantidadeAtual / item.quantidadeIdeal) * 100));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Componente de Modal de Movimentação ──────────────────────────────────────

interface MovimentacaoModalProps {
  item: ItemEstoque | null;
  onClose: () => void;
  onConfirm: (tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE', quantidade: number, motivo: string) => void;
}

const MovimentacaoModal: React.FC<MovimentacaoModalProps> = ({ item, onClose, onConfirm }) => {
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA' | 'AJUSTE'>('ENTRADA');
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState('');

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantidade <= 0 || !motivo.trim()) return;
    onConfirm(tipo, quantidade, motivo);
  };

  return (
    <Modal
      isOpen={!!item}
      onClose={onClose}
      title="Registrar Movimentação de Estoque"
      subtitle={`${item.codigo} — ${item.descricao}`}
      size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">Cancelar</Button>
          <Button
            variant={tipo === 'ENTRADA' ? 'success' : tipo === 'SAIDA' ? 'danger' : 'primary'}
            size="sm"
            type="submit"
            form="form-movimentacao"
          >
            {tipo === 'ENTRADA' ? '↑ Registrar Entrada' : tipo === 'SAIDA' ? '↓ Registrar Saída' : '⇄ Registrar Ajuste'}
          </Button>
        </div>
      }
    >
      <form id="form-movimentacao" onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">Tipo de Movimentação</label>
          <div className="grid grid-cols-3 gap-2">
            {(['ENTRADA', 'SAIDA', 'AJUSTE'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={clsx(
                  'py-2 rounded-lg text-xs font-semibold border transition-all',
                  tipo === t
                    ? t === 'ENTRADA' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : t === 'SAIDA' ? 'bg-red-500/20 border-red-500/50 text-red-300'
                    : 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                    : 'bg-surface-elevated border-surface-border text-gray-400 hover:text-gray-200'
                )}
              >
                {t === 'ENTRADA' ? '↑ Entrada' : t === 'SAIDA' ? '↓ Saída' : '⇄ Ajuste'}
              </button>
            ))}
          </div>
        </div>

        {/* Quantidade */}
        <div>
          <Input
            type="number"
            label="Quantidade"
            value={quantidade === 0 ? '' : quantidade}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              setQuantidade(raw === '' ? 0 : Math.max(0, parseInt(raw)));
            }}
            placeholder="0"
            required
          />
          {tipo === 'SAIDA' && quantidade > item.quantidadeAtual && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Quantidade maior que o estoque atual ({item.quantidadeAtual} {item.unidade})
            </p>
          )}
        </div>

        {/* Motivo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">Motivo / Referência</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
            rows={2}
            placeholder="Ex: Uso em reparo OS #1530, Reposição NF 4521..."
            className="w-full bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 placeholder-gray-500 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
          />
        </div>

        {/* Saldo resultante */}
        <div className="bg-surface-elevated/40 rounded-lg p-3 border border-surface-border text-xs text-gray-400 flex items-center justify-between">
          <span>Saldo atual: <strong className="text-white">{item.quantidadeAtual} {item.unidade}</strong></span>
          <span className="text-gray-500">→</span>
          <span>Saldo final: <strong className={clsx(
            tipo === 'ENTRADA' ? 'text-emerald-400' :
            tipo === 'SAIDA' ? (item.quantidadeAtual - quantidade < item.quantidadeMinima ? 'text-red-400' : 'text-amber-400') :
            'text-brand-400'
          )}>
            {tipo === 'ENTRADA' ? item.quantidadeAtual + quantidade : tipo === 'SAIDA' ? Math.max(0, item.quantidadeAtual - quantidade) : quantidade} {item.unidade}
          </strong></span>
        </div>
      </form>
    </Modal>
  );
};

// ─── Página Principal ─────────────────────────────────────────────────────────

export const EstoqueServicoPage: React.FC = () => {
  const [itens, setItens] = useState<ItemEstoque[]>(ITENS_MOCK);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>(MOVIMENTACOES_MOCK);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaEstoque | 'TODOS'>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<StatusEstoque | 'TODOS'>('TODOS');
  const [selectedItem, setSelectedItem] = useState<ItemEstoque | null>(null);
  const [activeTab, setActiveTab] = useState<'estoque' | 'movimentacoes'>('estoque');

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const criticos = itens.filter((i) => getStatusEstoque(i) === 'CRITICO').length;
    const indisponiveis = itens.filter((i) => getStatusEstoque(i) === 'INDISPONIVEL').length;
    const baixos = itens.filter((i) => getStatusEstoque(i) === 'BAIXO').length;
    const totalSku = itens.length;
    return { criticos, indisponiveis, baixos, totalSku };
  }, [itens]);

  // ─── Filtros ───────────────────────────────────────────────────────────────
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const matchSearch = !search || [item.codigo, item.descricao, item.localizacao, item.fornecedor]
        .some((f) => f.toLowerCase().includes(search.toLowerCase()));
      const matchCat = filtroCategoria === 'TODOS' || item.categoria === filtroCategoria;
      const matchStatus = filtroStatus === 'TODOS' || getStatusEstoque(item) === filtroStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [itens, search, filtroCategoria, filtroStatus]);

  // ─── Ação de Movimentação ──────────────────────────────────────────────────
  const handleMovimentacao = useCallback((tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE', quantidade: number, motivo: string) => {
    if (!selectedItem) return;

    const nova: MovimentacaoEstoque = {
      id: `mov-${Date.now()}`,
      itemId: selectedItem.id,
      itemCodigo: selectedItem.codigo,
      itemDescricao: selectedItem.descricao,
      tipo,
      quantidade,
      motivo,
      usuario: 'Admin',
      data: new Date().toISOString(),
    };

    setMovimentacoes((prev) => [nova, ...prev]);

    setItens((prev) => prev.map((item) => {
      if (item.id !== selectedItem.id) return item;
      const novaQtd = tipo === 'ENTRADA'
        ? item.quantidadeAtual + quantidade
        : tipo === 'SAIDA'
        ? Math.max(0, item.quantidadeAtual - quantidade)
        : quantidade;
      return { ...item, quantidadeAtual: novaQtd, ultimaMovimentacao: new Date().toISOString().slice(0, 10) };
    }));

    setSelectedItem(null);
  }, [selectedItem]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ─── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white tabular-nums">{kpis.totalSku}</p>
            <p className="text-xs text-gray-400">SKUs Cadastrados</p>
          </div>
        </div>
        <div className={clsx('bg-surface-card border rounded-xl p-4 flex items-center gap-3', kpis.criticos > 0 ? 'border-red-500/40' : 'border-surface-border')}>
          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', kpis.criticos > 0 ? 'bg-red-500/10 text-red-400' : 'bg-surface-elevated text-gray-500')}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className={clsx('text-2xl font-bold tabular-nums', kpis.criticos > 0 ? 'text-red-400' : 'text-white')}>{kpis.criticos}</p>
            <p className="text-xs text-gray-400">Estoque Crítico</p>
          </div>
        </div>
        <div className={clsx('bg-surface-card border rounded-xl p-4 flex items-center gap-3', kpis.indisponiveis > 0 ? 'border-gray-500/40' : 'border-surface-border')}>
          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', kpis.indisponiveis > 0 ? 'bg-gray-500/10 text-gray-400' : 'bg-surface-elevated text-gray-500')}>
            <X className="w-4 h-4" />
          </div>
          <div>
            <p className={clsx('text-2xl font-bold tabular-nums', kpis.indisponiveis > 0 ? 'text-gray-300' : 'text-white')}>{kpis.indisponiveis}</p>
            <p className="text-xs text-gray-400">Indisponíveis</p>
          </div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white tabular-nums">{itens.filter(i => getStatusEstoque(i) === 'OK').length}</p>
            <p className="text-xs text-gray-400">Dentro do Ideal</p>
          </div>
        </div>
      </div>

      {/* ─── Barra de Ferramentas ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('estoque')}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors border', activeTab === 'estoque' ? 'bg-brand-600/15 border-brand-500/30 text-brand-300' : 'border-surface-border text-gray-400 hover:text-gray-200 hover:bg-surface-elevated/60')}
          >
            <span className="flex items-center gap-2"><BarChart2 className="w-3.5 h-3.5" /> Estoque</span>
          </button>
          <button
            onClick={() => setActiveTab('movimentacoes')}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors border', activeTab === 'movimentacoes' ? 'bg-brand-600/15 border-brand-500/30 text-brand-300' : 'border-surface-border text-gray-400 hover:text-gray-200 hover:bg-surface-elevated/60')}
          >
            <span className="flex items-center gap-2"><ClipboardList className="w-3.5 h-3.5" /> Movimentações</span>
          </button>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => alert('Cadastro de novo item em breve!')}>
          Novo Item
        </Button>
      </div>

      {/* ─── Tab: Estoque ─────────────────────────────────────────────────── */}
      {activeTab === 'estoque' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                leftIcon={<Search className="w-3.5 h-3.5" />}
                placeholder="Buscar por código, descrição, local ou fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value as CategoriaEstoque | 'TODOS')}
              className="bg-surface-card border border-surface-border rounded-lg text-sm text-gray-300 px-3 h-10 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="TODOS">Todas as categorias</option>
              <option value="COMPONENTE">Componente</option>
              <option value="FERRAMENTA">Ferramenta</option>
              <option value="CONSUMIVEL">Consumível</option>
              <option value="PECAREPOSICAO">Peça de Reposição</option>
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusEstoque | 'TODOS')}
              className="bg-surface-card border border-surface-border rounded-lg text-sm text-gray-300 px-3 h-10 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="TODOS">Todos os status</option>
              <option value="CRITICO">Crítico</option>
              <option value="BAIXO">Baixo</option>
              <option value="INDISPONIVEL">Indisponível</option>
              <option value="OK">OK</option>
            </select>
          </div>

          {/* Tabela */}
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-elevated/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Item</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Categoria</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estoque</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Localização</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {itensFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-500">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Nenhum item encontrado com os filtros aplicados</p>
                      </td>
                    </tr>
                  ) : itensFiltrados.map((item) => {
                    const status = getStatusEstoque(item);
                    const sc = STATUS_CONFIG[status];
                    const cat = CATEGORIA_CONFIG[item.categoria];
                    const barWidth = getStockBarWidth(item);
                    const barColor = status === 'OK' ? 'bg-emerald-500' : status === 'BAIXO' ? 'bg-amber-500' : status === 'CRITICO' ? 'bg-red-500' : 'bg-gray-600';

                    return (
                      <tr key={item.id} className="hover:bg-surface-elevated/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-mono text-xs text-brand-400 font-semibold">{item.codigo}</p>
                            <p className="text-gray-200 text-sm mt-0.5 leading-tight">{item.descricao}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.fornecedor}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={clsx('flex items-center gap-1.5 text-xs font-medium', cat.color)}>
                            {cat.icon} {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-[100px]">
                            <p className="text-white font-semibold tabular-nums">
                              {item.quantidadeAtual} <span className="text-gray-500 text-xs font-normal">{item.unidade}</span>
                            </p>
                            <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-1.5 overflow-hidden">
                              <div className={clsx('h-1.5 rounded-full transition-all duration-500', barColor)} style={{ width: `${barWidth}%` }} />
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">Mín: {item.quantidadeMinima} · Ideal: {item.quantidadeIdeal}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs text-gray-400">{item.localizacao}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border', sc.className)}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full', sc.dot)} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                            leftIcon={<RefreshCw className="w-3 h-3" />}
                          >
                            Movimentar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {itensFiltrados.length > 0 && (
              <div className="px-4 py-2.5 border-t border-surface-border/50 text-xs text-gray-500">
                {itensFiltrados.length} item(s) exibido(s)
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Movimentações ───────────────────────────────────────────── */}
      {activeTab === 'movimentacoes' && (
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-elevated/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Qtd</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Motivo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {movimentacoes.map((mov) => (
                  <tr key={mov.id} className="hover:bg-surface-elevated/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border',
                        mov.tipo === 'ENTRADA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        mov.tipo === 'SAIDA' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                        'bg-brand-500/10 text-brand-400 border-brand-500/30'
                      )}>
                        {mov.tipo === 'ENTRADA' ? <ArrowUp className="w-3 h-3" /> : mov.tipo === 'SAIDA' ? <ArrowDown className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                        {mov.tipo === 'ENTRADA' ? 'Entrada' : mov.tipo === 'SAIDA' ? 'Saída' : 'Ajuste'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-brand-400">{mov.itemCodigo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{mov.itemDescricao}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('font-semibold tabular-nums text-sm', mov.tipo === 'ENTRADA' ? 'text-emerald-400' : mov.tipo === 'SAIDA' ? 'text-red-400' : 'text-brand-400')}>
                        {mov.tipo === 'ENTRADA' ? '+' : mov.tipo === 'SAIDA' ? '-' : '='}{mov.quantidade}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell max-w-[200px]">
                      <p className="text-xs text-gray-400 truncate" title={mov.motivo}>{mov.motivo}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-gray-400">{mov.usuario}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-400 tabular-nums">{formatDate(mov.data)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-surface-border/50 text-xs text-gray-500">
            {movimentacoes.length} movimentação(ões) registrada(s)
          </div>
        </div>
      )}

      {/* ─── Modal de Movimentação ────────────────────────────────────────── */}
      <MovimentacaoModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onConfirm={handleMovimentacao}
      />
    </div>
  );
};
