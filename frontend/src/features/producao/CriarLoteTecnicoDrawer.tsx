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
  CheckCircle2,
  Building2,
  Package,
  Wrench,
  XCircle,
  Save
} from 'lucide-react';

interface EquipamentoLinha {
  tipoEquipamentoId: string;
  quantidadeTotalCaixa: number; 
  quantidadeReparada: number;   
  quantidadeSucata: number;     
  tipoCategoria: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO';
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

  const [isAddingCliente, setIsAddingCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteDoc, setNovoClienteDoc] = useState('');
  const [novoClienteTel, setNovoClienteTel] = useState('');
  const [isSavingCliente, setIsSavingCliente] = useState(false);
  const [clienteSuccessMsg, setClienteSuccessMsg] = useState<string | null>(null);

  const [modoOperacao, setModoOperacao] = useState<'DESPACHAR_CQ' | 'SALVAR_BANCADA'>('DESPACHAR_CQ');

  const [numeroOS, setNumeroOS] = useState<string>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [dataRegistro, setDataRegistro] = useState<string>(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  });
  const [horaRegistro, setHoraRegistro] = useState<string>(() => {
    const hoje = new Date();
    const horas = String(hoje.getHours()).padStart(2, '0');
    const minutos = String(hoje.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  });
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [observacoes, setObservacoes] = useState<string>('');

  const [itens, setItens] = useState<EquipamentoLinha[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSalvarNovoCliente = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoClienteNome.trim()) {
      setError('Informe o nome ou razão social da nova empresa.');
      return;
    }
    try {
      setIsSavingCliente(true);
      setError(null);
      const novo = await osApiService.createCliente({
        nomeRazaoSocial: novoClienteNome.trim(),
        documento: novoClienteDoc.trim() || undefined,
        contatoTelefone: novoClienteTel.trim() || undefined,
      });

      const updatedList = await osApiService.getClientes();
      setClientes(updatedList);
      setClienteId(novo.id);

      setNovoClienteNome('');
      setNovoClienteDoc('');
      setNovoClienteTel('');
      setIsAddingCliente(false);
      setClienteSuccessMsg(`Empresa "${novo.nomeRazaoSocial}" cadastrada e selecionada!`);
      setTimeout(() => setClienteSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar nova empresa.');
    } finally {
      setIsSavingCliente(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setNumeroOS('');
      setObservacoes('');
      setPrioridade('MEDIA');
      setModoOperacao('DESPACHAR_CQ');
      setItens([]);
      setError(null);
      Promise.all([osApiService.getTiposEquipamento(), osApiService.getClientes()])
        .then(([equipamentos, clientesList]) => {
          setTiposEquipamento(equipamentos);
          setClientes(clientesList);
          if (clientesList.length > 0) {
            setClienteId(clientesList[0].id);
          }
          if (equipamentos.length > 0) {
            setItens([{
              tipoEquipamentoId: equipamentos[0].id,
              quantidadeTotalCaixa: 50,
              quantidadeReparada: 12,
              quantidadeSucata: 0,
              tipoCategoria: 'REPARADO',
              servicoRealizado: '',
            }]);
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
        quantidadeTotalCaixa: 50,
        quantidadeReparada: 1,
        quantidadeSucata: 0,
        tipoCategoria: 'REPARADO',
        servicoRealizado: 'Reparo de bancada efetuado',
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

  const totalReparados = itens.reduce((acc, it) => acc + Number(it.quantidadeReparada || 0), 0);
  const totalSucata = itens.reduce((acc, it) => acc + Number(it.quantidadeSucata || 0), 0);
  const totalRestantes = itens.reduce((acc, it) => {
    const totalCx = it.quantidadeTotalCaixa || it.quantidadeReparada || 0;
    const rep = it.quantidadeReparada || 0;
    const suc = it.quantidadeSucata || 0;
    return acc + Math.max(0, totalCx - rep - suc);
  }, 0);

  const pontuacaoEstimada = itens.reduce((acc, it) => {
    const eq = tiposEquipamento.find((e) => e.id === it.tipoEquipamentoId);
    const pts = eq?.pontos || 1.0;
    return acc + (Number(it.quantidadeReparada) || 0) * pts;
  }, 0);

  const handleSubmit = async (enviarDiretoTeste: boolean) => {
    if (!numeroOS.trim() || !parseInt(numeroOS.replace(/\D/g, ''))) {
      setError('Informe o número da OS.');
      return;
    }

    if (itens.length === 0 || totalReparados < 1) {
      setError('Informe ao menos 1 unidade reparada no apontamento.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let timestampISO: string;
      if (dataRegistro && horaRegistro) {
        const [ano, mes, dia] = dataRegistro.split('-').map(Number);
        const [horas, minutos] = horaRegistro.split(':').map(Number);
        const dataLocal = new Date(ano, mes - 1, dia, horas || 0, minutos || 0, 0);
        timestampISO = isNaN(dataLocal.getTime()) ? new Date().toISOString() : dataLocal.toISOString();
      } else {
        timestampISO = new Date().toISOString();
      }

      const numParsed = parseInt(numeroOS.replace(/\D/g, ''));

      const payload = {
        numeroOS: numParsed,
        clienteId: clienteId || (clientes[0]?.id || 'cli-01'),
        dataEntrada: timestampISO,
        prioridade,
        observacoes: observacoes.trim() || undefined,
        enviarDiretoTeste,
        itens: itens.map((it) => {
          const totalCx = Number(it.quantidadeTotalCaixa) || Number(it.quantidadeReparada) || 1;
          const reparadas = Number(it.quantidadeReparada) || 0;
          const sucata = Number(it.quantidadeSucata) || 0;
          const restante = Math.max(0, totalCx - reparadas - sucata);

          return {
            tipoEquipamentoId: it.tipoEquipamentoId,
            quantidade: reparadas,
            quantidadeTotalCaixa: totalCx,
            quantidadeReparada: reparadas,
            quantidadeSucata: sucata,
            quantidadeRestante: restante,
            tipoCategoria: it.tipoCategoria,
            defeitoRelatado: it.tipoCategoria === 'SEM_DEFEITO'
              ? `Sem defeito aparente (Triagem) [${reparadas}/${totalCx} un]`
              : (it.servicoRealizado.trim() || `Manutenção de bancada [${reparadas}/${totalCx} un]`),
            servicoRealizado: it.servicoRealizado.trim() || (
              it.tipoCategoria === 'SEM_DEFEITO'
                ? `Testado e aprovado em triagem (${reparadas} un)${sucata ? ` | ${sucata} un descartadas` : ''}`
                : `Reparo efetuado (${reparadas} un concluidas)${sucata ? ` | ${sucata} un sem conserto` : ''}`
            ),
          };
        }),
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
      title="Apontamento de Lote / Minha OS"
      subtitle={`Técnico: ${user?.nome || 'Operador'} — Relate a quantidade exata reparada da caixa`}
      width="max-w-2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
            <span className="font-bold text-emerald-400 tabular-nums">{totalReparados} un</span> prontas
            {totalRestantes > 0 && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-sky-300 font-medium tabular-nums">{totalRestantes} un</span> na bancada
              </>
            )}
            {totalSucata > 0 && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-red-400 font-medium tabular-nums">{totalSucata} un</span> sucata
              </>
            )}
            <span className="text-gray-500">•</span>
            <span className="text-amber-400 font-bold tabular-nums" title="Pontos creditados automaticamente após o testador (CQ) aprovar">
              ~{pontuacaoEstimada.toFixed(1)} pts (após teste CQ)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            {modoOperacao === 'SALVAR_BANCADA' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSubmit(false)}
                disabled={isLoading}
                loading={isLoading}
                leftIcon={<Save className="w-3.5 h-3.5" />}
                className="shadow-glow-primary font-bold"
              >
                Salvar Progresso na Minha Bancada (💾)
              </Button>
            ) : (
              <Button
                variant="success"
                size="sm"
                onClick={() => handleSubmit(true)}
                disabled={isLoading}
                loading={isLoading}
                leftIcon={<Send className="w-3.5 h-3.5" />}
                className="shadow-glow-success font-bold"
              >
                Concluir & Despachar p/ Teste CQ (⚡)
              </Button>
            )}
          </div>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(modoOperacao === 'DESPACHAR_CQ'); }} className="space-y-5 text-sm">
        {error && (
          <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
            Destino deste Apontamento:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setModoOperacao('DESPACHAR_CQ')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                modoOperacao === 'DESPACHAR_CQ'
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-glow-success ring-1 ring-emerald-500/50'
                  : 'bg-surface-elevated/60 border-surface-border hover:border-surface-border/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-white">Despachar p/ Teste (CQ)</span>
                </div>
                {modoOperacao === 'DESPACHAR_CQ' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <p className="text-[11px] text-gray-300 mt-2">
                A caixa/lote está pronta para o <strong>testador (CQ)</strong> inspecionar. Os pontos entram na meta após aprovação.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setModoOperacao('SALVAR_BANCADA')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                modoOperacao === 'SALVAR_BANCADA'
                  ? 'bg-sky-950/40 border-sky-500 shadow-glow-primary ring-1 ring-sky-500/50'
                  : 'bg-surface-elevated/60 border-surface-border hover:border-surface-border/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Save className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-white">Salvar na Minha Bancada</span>
                </div>
                {modoOperacao === 'SALVAR_BANCADA' && (
                  <CheckCircle2 className="w-5 h-5 text-sky-400" />
                )}
              </div>
              <p className="text-[11px] text-gray-300 mt-2">
                Caixa em andamento (ainda vou reparar as outras). Salva o progresso nas <strong>Minhas OSs</strong> sem mandar ao testador ainda.
              </p>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-400" /> Identificação da OS e Caixa
            </span>
            <span className="text-[11px] text-gray-400">
              Técnico: <strong className="text-white">{user?.nome || 'Operador'}</strong>
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
                className="w-full h-10 px-3 bg-[#12161f] border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
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
                className="w-full h-10 px-3 bg-[#12161f] border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                  Cliente / Empresa <span className="text-brand-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCliente(!isAddingCliente);
                    setError(null);
                  }}
                  className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {isAddingCliente ? 'Fechar' : '+ Nova Empresa'}
                </button>
              </div>

              {isAddingCliente ? (
                <div className="p-3 bg-[#0d121c] border border-brand-500/50 rounded-xl space-y-2.5 shadow-glow-primary/20">
                  <div className="flex items-center justify-between border-b border-surface-border/50 pb-1.5">
                    <span className="text-xs font-bold text-brand-300 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-brand-400" /> Nova Empresa
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={novoClienteNome}
                      onChange={(e) => setNovoClienteNome(e.target.value)}
                      placeholder="Nome / Razão Social da Empresa *"
                      className="w-full h-8 px-2.5 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={novoClienteDoc}
                        onChange={(e) => setNovoClienteDoc(e.target.value)}
                        placeholder="CNPJ (opcional)"
                        className="w-full h-8 px-2.5 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                      />
                      <input
                        type="text"
                        value={novoClienteTel}
                        onChange={(e) => setNovoClienteTel(e.target.value)}
                        placeholder="Telefone (opcional)"
                        className="w-full h-8 px-2.5 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingCliente(false)}
                      className="px-2 py-0.5 text-[11px] text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSalvarNovoCliente}
                      disabled={isSavingCliente || !novoClienteNome.trim()}
                      className="px-2.5 py-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-[11px] font-bold text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {isSavingCliente ? (
                        <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={clienteId}
                  onChange={(e) => {
                    if (e.target.value === '__NOVA_EMPRESA__') {
                      setIsAddingCliente(true);
                    } else {
                      setClienteId(e.target.value);
                    }
                  }}
                  className="w-full h-10 px-3 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#181d26] text-white py-1">
                      {c.nomeRazaoSocial}
                    </option>
                  ))}
                  <option value="__NOVA_EMPRESA__" className="bg-brand-950 text-brand-300 font-bold py-1">
                    + Cadastrar Nova Empresa...
                  </option>
                </select>
              )}

              {clienteSuccessMsg && (
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium mt-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" /> {clienteSuccessMsg}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Prioridade de Atendimento</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as any)}
                className="w-full h-10 px-3 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="BAIXA" className="bg-[#181d26] text-white py-1">Baixa</option>
                <option value="MEDIA" className="bg-[#181d26] text-white py-1">Média (Padrão)</option>
                <option value="ALTA" className="bg-[#181d26] text-white py-1">Alta Prioridade</option>
                <option value="URGENTE" className="bg-[#181d26] text-white py-1">Urgente (Linha Parada)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" /> Equipamentos da Caixa / Lote ({itens.length})
              </h4>
              <p className="text-[11px] text-gray-400">
                Informe o total da caixa, quantas você reparou hoje e quantas morreram/sucata.
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

          <div className="space-y-3.5">
            {itens.map((item, idx) => {
              const selectedEq = tiposEquipamento.find((e) => e.id === item.tipoEquipamentoId);
              const ptsUnit = selectedEq?.pontos || 1.0;
              const subtotalPts = (Number(item.quantidadeReparada) || 0) * ptsUnit;

              const totalCx = Number(item.quantidadeTotalCaixa) || Number(item.quantidadeReparada) || 1;
              const repHoje = Number(item.quantidadeReparada) || 0;
              const sucHoje = Number(item.quantidadeSucata) || 0;
              const restanteCx = Math.max(0, totalCx - repHoje - sucHoje);

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-surface-base border border-surface-border space-y-3.5 relative group shadow-sm"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border/60">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white">Item #{idx + 1}</span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 tabular-nums font-semibold">
                        {ptsUnit} pt/un • Estimado p/ {repHoje} un: {subtotalPts.toFixed(1)} pts
                      </span>
                    </div>

                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                        title="Remover este equipamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide">
                      Modelo de Equipamento <span className="text-brand-400">*</span>
                    </label>
                    <select
                      value={item.tipoEquipamentoId}
                      onChange={(e) => handleUpdateItem(idx, 'tipoEquipamentoId', e.target.value)}
                      className="w-full h-10 px-3 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      {tiposEquipamento.map((t) => {
                        const pts = t.pontos ?? 1;
                        return (
                          <option key={t.id} value={t.id} className="bg-[#181d26] text-white py-1.5">
                            {t.nome} ({pts} pt{pts > 1 ? 's' : ''})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#0e121a] p-3 rounded-xl border border-surface-border/70">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-amber-400" /> Total na Caixa
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantidadeTotalCaixa === 0 ? '' : item.quantidadeTotalCaixa}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          handleUpdateItem(idx, 'quantidadeTotalCaixa', v === '' ? 0 : parseInt(v));
                        }}
                        placeholder="Ex: 50"
                        className="w-full h-9 px-2.5 bg-[#141923] border border-surface-border rounded-lg text-xs text-center text-white font-mono font-bold focus:outline-none focus:border-brand-500"
                        title="Tamanho total da caixa recebida"
                      />
                      <span className="text-[10px] text-gray-500 block text-center">Tamanho da caixa</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5" /> Reparadas Hoje *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantidadeReparada === 0 ? '' : item.quantidadeReparada}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          handleUpdateItem(idx, 'quantidadeReparada', v === '' ? 0 : parseInt(v));
                        }}
                        placeholder="Ex: 12"
                        className="w-full h-9 px-2.5 bg-[#141923] border border-emerald-500/50 rounded-lg text-xs text-center text-emerald-300 font-mono font-black focus:outline-none focus:border-emerald-400 ring-1 ring-emerald-500/30"
                        required
                        title="Quantidade exata que você reparou com sucesso hoje"
                      />
                      <span className="text-[10px] text-emerald-400/80 block text-center font-medium">Prontas p/ teste</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-red-400" /> Sem Reparo / Sucata
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantidadeSucata === 0 ? '' : item.quantidadeSucata}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          handleUpdateItem(idx, 'quantidadeSucata', v === '' ? 0 : parseInt(v));
                        }}
                        placeholder="0"
                        className="w-full h-9 px-2.5 bg-[#141923] border border-surface-border rounded-lg text-xs text-center text-red-300 font-mono font-bold focus:outline-none focus:border-red-500"
                        title="Unidades que morreram ou não deram conserto (opcional)"
                      />
                      <span className="text-[10px] text-gray-500 block text-center">Sem conserto</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated/50 border border-surface-border/50 text-xs">
                    <span className="text-gray-400">Saldo da Caixa:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400 tabular-nums">✓ {repHoje} prontas</span>
                      {sucHoje > 0 && <span className="text-red-400 tabular-nums">💀 {sucHoje} sucata</span>}
                      <span className="font-bold text-sky-400 tabular-nums bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                        ⏳ {restanteCx} un restantes na bancada
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide">
                      Classificação do Equipamento
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-[#10141d] border border-surface-border p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, 'tipoCategoria', 'REPARADO')}
                        className={`h-9 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          item.tipoCategoria === 'REPARADO'
                            ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400/50'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
                        }`}
                        title="Equipamento que tinha defeito e foi reparado na bancada"
                      >
                        <span>🔧</span>
                        <span>Reparado</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, 'tipoCategoria', 'SEM_DEFEITO')}
                        className={`h-9 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          item.tipoCategoria === 'SEM_DEFEITO'
                            ? 'bg-sky-600 text-white shadow-md ring-1 ring-sky-400/50'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
                        }`}
                        title="Equipamento testado em triagem sem defeitos encontrados"
                      >
                        <span>✅</span>
                        <span>Sem Defeito</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, 'tipoCategoria', 'RETRABALHO')}
                        className={`h-9 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          item.tipoCategoria === 'RETRABALHO'
                            ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400/50'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
                        }`}
                        title="Equipamento retrabalhado após reprovação do CQ"
                      >
                        <span>🔄</span>
                        <span>Retrabalho</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Serviço / Reparo Realizado (Opcional)
                    </label>
                    <input
                      type="text"
                      value={item.servicoRealizado}
                      onChange={(e) => handleUpdateItem(idx, 'servicoRealizado', e.target.value)}
                      placeholder={
                        item.tipoCategoria === 'SEM_DEFEITO'
                          ? 'Equipamento testado e aprovado em triagem (sem defeito)'
                          : 'Ex: Troca de capacitor, ressolda da fonte, regravação de firmware...'
                      }
                      className="w-full h-9 px-3 bg-[#12161f] border border-surface-border rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-r from-surface-elevated via-surface-elevated to-surface-card border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-gray-300">Reparadas Hoje: <strong className="text-white tabular-nums">{totalReparados} un</strong></span>
              </div>
              {totalRestantes > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="text-gray-300">Restantes na Caixa: <strong className="text-sky-300 tabular-nums">{totalRestantes} un</strong></span>
                </div>
              )}
              {totalSucata > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-gray-300">Sucata / Sem Reparo: <strong className="text-red-300 tabular-nums">{totalSucata} un</strong></span>
                </div>
              )}
            </div>

            <div className="text-right whitespace-nowrap">
              <span className="text-amber-400 text-xs font-black tabular-nums">~{pontuacaoEstimada.toFixed(1)} pts</span>
              <span className="text-gray-400 text-[10px] block">(contabilizados após o teste do CQ)</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Observações Técnicas para o Testador / CQ (Opcional)
          </label>
          <textarea
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Caixa com 12 reparadas concluídas. 36 unidades restantes continuam na bancada para os próximos dias."
            className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>
      </form>
    </Drawer>
  );
};
