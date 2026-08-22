import React, { useState, useEffect } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { osApiService } from '../os/os.service';
import { producaoApiService } from './producao.service';
import type { TipoEquipamentoOption, ClienteOption } from '../os/os.types';
import { useAuth } from '../auth/AuthContext';
import {
  PlusCircle,
  Trash2,
  Send,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Play
} from 'lucide-react';

interface EquipamentoLinha {
  tipoEquipamentoId: string;
  quantidade: number;
  tipoCategoria: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO';
  defeitoRelatado: string;
  servicoRealizado: string;
}

interface CriarLoteTecnicoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CriarLoteTecnicoDrawer: React.FC<CriarLoteTecnicoDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [tiposEquipamento, setTiposEquipamento] = useState<TipoEquipamentoOption[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);

  // Cabeçalho da OS
  const [numeroOS, setNumeroOS] = useState<string>('1920');
  const [clienteId, setClienteId] = useState<string>('cli-01');
  const [dataRegistro, setDataRegistro] = useState<string>(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [horaRegistro, setHoraRegistro] = useState<string>(() => {
    const hoje = new Date();
    return hoje.toTimeString().slice(0, 5);
  });
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [observacoes, setObservacoes] = useState<string>('');

  // Linhas dinâmicas de equipamentos
  const [itens, setItens] = useState<EquipamentoLinha[]>([
    {
      tipoEquipamentoId: 'pt-02', // ONT / Roteador Giga
      quantidade: 12,
      tipoCategoria: 'REPARADO',
      defeitoRelatado: 'Porta PON sem link / Fonte inoperante',
      servicoRealizado: 'Substituição de capacitor e ressolda do circuito de alimentação',
    },
    {
      tipoEquipamentoId: 'pt-06', // CCR / Mimosas
      quantidade: 2,
      tipoCategoria: 'REPARADO',
      defeitoRelatado: 'Porta SFP travando em carga máxima',
      servicoRealizado: 'Regravação de firmware e substituição de transceptor óptico',
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar opções do sistema
  useEffect(() => {
    if (isOpen) {
      Promise.all([osApiService.getTiposEquipamento(), osApiService.getClientes()])
        .then(([equipamentos, clientesList]) => {
          setTiposEquipamento(equipamentos);
          setClientes(clientesList);
          if (clientesList.length > 0 && !clienteId) {
            setClienteId(clientesList[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleAddItem = () => {
    const defaultId = tiposEquipamento[0]?.id || 'pt-01';
    setItens([
      ...itens,
      {
        tipoEquipamentoId: defaultId,
        quantidade: 1,
        tipoCategoria: 'REPARADO',
        defeitoRelatado: 'Manutenção corretiva',
        servicoRealizado: 'Reparo e testes elétricos efetuados',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (itens.length === 1) return;
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof EquipamentoLinha, value: any) => {
    const updated = [...itens];
    updated[index] = { ...updated[index], [field]: value };
    setItens(updated);
  };

  // Cálculos de totais e pontuação estimada
  const totalEquipamentos = itens.reduce((acc, it) => acc + Number(it.quantidade || 0), 0);
  const totalReparados = itens
    .filter((it) => it.tipoCategoria === 'REPARADO')
    .reduce((acc, it) => acc + Number(it.quantidade || 0), 0);
  const totalSemDefeito = itens
    .filter((it) => it.tipoCategoria === 'SEM_DEFEITO')
    .reduce((acc, it) => acc + Number(it.quantidade || 0), 0);
  const totalRetrabalho = itens
    .filter((it) => it.tipoCategoria === 'RETRABALHO')
    .reduce((acc, it) => acc + Number(it.quantidade || 0), 0);

  const pontuacaoEstimada = itens.reduce((acc, it) => {
    const eq = tiposEquipamento.find((e) => e.id === it.tipoEquipamentoId);
    const pts = eq?.pontos || 1.0;
    return acc + (Number(it.quantidade) || 0) * pts;
  }, 0);

  const handleSubmit = async (enviarDiretoTeste: boolean) => {
    if (!numeroOS.trim()) {
      setError('Informe o número da OS (ex: 1920).');
      return;
    }

    if (itens.length === 0 || totalEquipamentos < 1) {
      setError('Adicione ao menos um equipamento com quantidade válida.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const timestampISO = `${dataRegistro}T${horaRegistro || '12:00'}:00.000Z`;

      const payload = {
        numeroOS: parseInt(numeroOS.replace(/\D/g, '')) || 1920,
        clienteId: clienteId || 'cli-01',
        dataEntrada: timestampISO,
        prioridade,
        observacoes: observacoes.trim() || undefined,
        enviarDiretoTeste,
        itens: itens.map((it) => ({
          tipoEquipamentoId: it.tipoEquipamentoId,
          quantidade: Number(it.quantidade) || 1,
          tipoCategoria: it.tipoCategoria,
          defeitoRelatado: it.defeitoRelatado.trim() || undefined,
          servicoRealizado: it.servicoRealizado.trim() || undefined,
        })),
      };

      await producaoApiService.apontarLote(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao registrar lote de produção.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Apontamento de Lote / Minha OS"
      subtitle={`Técnico: ${user?.nome || 'Operador'} — Registre a produção e despache diretamente`}
      width="max-w-2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span className="font-bold text-white tabular-nums">{totalEquipamentos} un</span> no lote
            <span className="text-gray-500">•</span>
            <span className="text-amber-400 font-bold tabular-nums">~{pontuacaoEstimada.toFixed(1)} pts</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              leftIcon={<Play className="w-3.5 h-3.5" />}
              title="Salva a OS na sua bancada para iniciar cronômetro individual"
            >
              Na Bancada
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => handleSubmit(true)}
              loading={isLoading}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              className="shadow-glow-success font-bold"
            >
              Enviar Direto p/ Teste (CQ)
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(true); }} className="space-y-5 text-sm">
        {error && (
          <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── 1. CABEÇALHO DO APONTAMENTO (OS, DATA, HORÁRIO, CLIENTE) ──────── */}
        <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-400" /> Identificação do Lote de Produção
            </span>
            <span className="text-[11px] text-gray-400">
              Técnico: <strong className="text-white">{user?.nome || 'Samuel'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                Número da OS <span className="text-brand-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">#</span>
                <input
                  type="text"
                  value={numeroOS}
                  onChange={(e) => setNumeroOS(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1920"
                  className="w-full h-10 pl-7 pr-3 bg-surface-base border border-surface-border rounded-lg text-sm text-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" /> Data do Registro
              </label>
              <input
                type="date"
                value={dataRegistro}
                onChange={(e) => setDataRegistro(e.target.value)}
                className="w-full h-10 px-3 bg-surface-base border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Horário
              </label>
              <input
                type="time"
                value={horaRegistro}
                onChange={(e) => setHoraRegistro(e.target.value)}
                className="w-full h-10 px-3 bg-surface-base border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Cliente / Empresa</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full h-10 px-3 bg-surface-base border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeRazaoSocial}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Prioridade de Atendimento</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as any)}
                className="w-full h-10 px-3 bg-surface-base border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média (Padrão)</option>
                <option value="ALTA">Alta Prioridade</option>
                <option value="URGENTE">Urgente (Linha Parada)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── 2. LISTA DINÂMICA DE EQUIPAMENTOS DO LOTE ──────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" /> Equipamentos do Lote ({itens.length})
              </h4>
              <p className="text-[11px] text-gray-400">
                Especifique a quantidade de cada modelo e se teve defeito reparado ou foi sem defeito (triagem).
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              leftIcon={<PlusCircle className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Adicionar Equipamento
            </Button>
          </div>

          <div className="space-y-3">
            {itens.map((item, idx) => {
              const selectedEq = tiposEquipamento.find((e) => e.id === item.tipoEquipamentoId);
              const ptsUnit = selectedEq?.pontos || 1.0;
              const subtotalPts = (Number(item.quantidade) || 0) * ptsUnit;

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-surface-base border border-surface-border space-y-3 relative group"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border/50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white">Item #{idx + 1}</span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 tabular-nums">
                        {ptsUnit} pt/un • Subtotal: {subtotalPts.toFixed(1)} pts
                      </span>
                    </div>

                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Remover este equipamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Equipamento */}
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Modelo de Equipamento
                      </label>
                      <select
                        value={item.tipoEquipamentoId}
                        onChange={(e) => handleUpdateItem(idx, 'tipoEquipamentoId', e.target.value)}
                        className="w-full h-9 px-2.5 bg-surface-card border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                      >
                        {tiposEquipamento.map((t) => {
                          const pts = t.pontos ?? 1;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.nome} ({pts} pt{pts > 1 ? 's' : ''})
                            </option>
                          );
                        })}
                      </select>

                    </div>

                    {/* Quantidade */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Qtd (un)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade === 0 ? '' : item.quantidade}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          handleUpdateItem(idx, 'quantidade', v === '' ? 0 : parseInt(v));
                        }}
                        placeholder="1"
                        className="w-full h-9 px-2.5 bg-surface-card border border-surface-border rounded-lg text-xs text-center text-white font-mono font-bold focus:outline-none focus:border-brand-500"
                        required
                      />
                    </div>

                    {/* Categoria / Tipo */}
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Classificação do Lote
                      </label>
                      <select
                        value={item.tipoCategoria}
                        onChange={(e) => handleUpdateItem(idx, 'tipoCategoria', e.target.value as any)}
                        className={`w-full h-9 px-2.5 border rounded-lg text-xs font-semibold focus:outline-none ${
                          item.tipoCategoria === 'REPARADO'
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                            : item.tipoCategoria === 'SEM_DEFEITO'
                            ? 'bg-sky-950/30 border-sky-500/40 text-sky-300'
                            : 'bg-purple-950/30 border-purple-500/40 text-purple-300'
                        }`}
                      >
                        <option value="REPARADO">🔧 Reparado (Com Defeito)</option>
                        <option value="SEM_DEFEITO">✅ Sem Defeito (Triagem)</option>
                        <option value="RETRABALHO">🔄 Retrabalho Realizado</option>
                      </select>
                    </div>
                  </div>

                  {/* Defeito e Serviço Realizado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      value={item.defeitoRelatado}
                      onChange={(e) => handleUpdateItem(idx, 'defeitoRelatado', e.target.value)}
                      placeholder={item.tipoCategoria === 'SEM_DEFEITO' ? 'Triagem inicial - sem falha' : 'Defeito encontrado (ex: Fonte queimada)...'}
                      className="h-8 px-2.5 bg-surface-card border border-surface-border rounded-md text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    />
                    <input
                      type="text"
                      value={item.servicoRealizado}
                      onChange={(e) => handleUpdateItem(idx, 'servicoRealizado', e.target.value)}
                      placeholder={item.tipoCategoria === 'SEM_DEFEITO' ? 'Equipamento testado e aprovado em triagem' : 'Serviço realizado (ex: Troca de regulador e teste)...'}
                      className="h-8 px-2.5 bg-surface-card border border-surface-border rounded-md text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Card Resumo do Lote */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-surface-elevated via-surface-elevated to-surface-card border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-gray-300">Reparados: <strong className="text-white tabular-nums">{totalReparados} un</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="text-gray-300">Sem Defeito: <strong className="text-white tabular-nums">{totalSemDefeito} un</strong></span>
              </div>
              {totalRetrabalho > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-gray-300">Retrabalho: <strong className="text-white tabular-nums">{totalRetrabalho} un</strong></span>
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-gray-400">Total do Lote: </span>
              <strong className="text-amber-400 text-sm font-black tabular-nums">{totalEquipamentos} unidades</strong>
              <span className="text-gray-400 text-[11px] ml-1.5">({pontuacaoEstimada.toFixed(1)} pts na Meta)</span>
            </div>
          </div>
        </div>

        {/* ─── 3. OBSERVAÇÕES OPCIONAIS ────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Observações Técnicas para o Testador / CQ (Opcional)
          </label>
          <textarea
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Lote revisado e higienizado. Atenção para testar as portas Gigabit em 1Gbps full duplex."
            className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>
      </form>
    </Drawer>
  );
};
