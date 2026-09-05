import React, { useState, useEffect } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
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
  Save,
  ShieldCheck,
  RotateCcw,
  Play,
} from 'lucide-react';

interface EquipamentoLinha {
  tipoEquipamentoId: string;
  quantidadeReparada: number;
  quantidadeSemDefeito: number;
  quantidadeSucata: number;
  anterioresNaCaixa?: number;
  anterioresReparadas?: number;
  anterioresSemDefeito?: number;
  anterioresSucata?: number;
  tipoCategoria: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO';
  servicoRealizado: string;
}

interface CriarLoteTecnicoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: any;
  initialOs?: any;
}

export const CriarLoteTecnicoDrawer: React.FC<CriarLoteTecnicoDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialItem,
  initialOs,
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

  const [modoOperacao, setModoOperacao] = useState<'INICIAR_PRODUCAO' | 'DESPACHAR_CQ' | 'SALVAR_BANCADA'>('SALVAR_BANCADA');
  const [isDespachandoCq, setIsDespachandoCq] = useState(false);
  const [confirmDespacharModalOpen, setConfirmDespacharModalOpen] = useState(false);
  const [despacharObservacao, setDespacharObservacao] = useState('');

  const [isExcluindoOs, setIsExcluindoOs] = useState(false);
  const [confirmExcluirModalOpen, setConfirmExcluirModalOpen] = useState(false);

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
  const isSubmittingRef = React.useRef(false);

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
      setError(null);
      isSubmittingRef.current = false;
      Promise.all([osApiService.getTiposEquipamento(), osApiService.getClientes()])
        .then(([equipamentos, clientesList]) => {
          setTiposEquipamento(equipamentos);
          setClientes(clientesList);

          if (initialOs) {
            // Continuação de OS em andamento (Minhas OS em Andamento)
            setNumeroOS(initialOs.numeroOS ? String(initialOs.numeroOS) : '');
            setClienteId(initialOs.clienteId || (clientesList[0]?.id || ''));
            setPrioridade(initialOs.prioridade || 'MEDIA');
            setObservacoes('');
            setModoOperacao('SALVAR_BANCADA');

            if (initialOs.equipamentos && initialOs.equipamentos.length > 0) {
              setItens(
                initialOs.equipamentos.map((eq: any) => ({
                  tipoEquipamentoId: eq.tipoEquipamentoId,
                  quantidadeReparada: 0,
                  quantidadeSemDefeito: 0,
                  quantidadeSucata: 0,
                  anterioresNaCaixa: eq.totalAcumulado || 0,
                  anterioresReparadas: eq.acumuladoReparado || 0,
                  anterioresSemDefeito: eq.acumuladoSemDefeito || 0,
                  anterioresSucata: eq.acumuladoSucata || 0,
                  tipoCategoria: 'REPARADO',
                  servicoRealizado: 'Reparo de bancada efetuado',
                }))
              );
            } else if (equipamentos.length > 0) {
              setItens([
                {
                  tipoEquipamentoId: equipamentos[0].id,
                  quantidadeReparada: 0,
                  quantidadeSemDefeito: 0,
                  quantidadeSucata: 0,
                  anterioresNaCaixa: 0,
                  anterioresReparadas: 0,
                  anterioresSemDefeito: 0,
                  anterioresSucata: 0,
                  tipoCategoria: 'REPARADO',
                  servicoRealizado: 'Reparo de bancada efetuado',
                },
              ]);
            }
          } else if (initialItem) {
            // Reabertura de item de bancada existente
            const os = initialItem.ordemServico || initialItem;
            const equip = initialItem.tipoEquipamento;
            const qtdAnterior = Number(initialItem.totalAcumuladoCaixa) || Number(initialItem.quantidade) || 0;

            setNumeroOS(os.numeroOS ? String(os.numeroOS) : '');
            setClienteId(os.cliente?.id || os.clienteId || (clientesList[0]?.id || ''));
            setPrioridade(os.prioridade || 'MEDIA');
            setObservacoes(os.observacoes || '');
            setModoOperacao(initialItem.statusItem === 'EM_PRODUCAO' ? 'SALVAR_BANCADA' : 'DESPACHAR_CQ');

            setItens([
              {
                tipoEquipamentoId: equip?.id || (equipamentos[0]?.id || 'pt-01'),
                quantidadeReparada: 0,
                quantidadeSemDefeito: 0,
                quantidadeSucata: 0,
                anterioresNaCaixa: qtdAnterior,
                anterioresReparadas: 0,
                anterioresSemDefeito: 0,
                anterioresSucata: 0,
                tipoCategoria: 'REPARADO',
                servicoRealizado: initialItem.defeitoRelatado || 'Reparo de bancada efetuado',
              },
            ]);
          } else {
            // Novo apontamento limpo
            setNumeroOS('');
            setObservacoes('');
            setPrioridade('MEDIA');
            setModoOperacao('SALVAR_BANCADA');
            if (clientesList.length > 0) {
              setClienteId(clientesList[0].id);
            }
            if (equipamentos.length > 0) {
              setItens([
                {
                  tipoEquipamentoId: equipamentos[0].id,
                  quantidadeReparada: 0,
                  quantidadeSemDefeito: 0,
                  quantidadeSucata: 0,
                  anterioresNaCaixa: 0,
                  anterioresReparadas: 0,
                  anterioresSemDefeito: 0,
                  anterioresSucata: 0,
                  tipoCategoria: 'REPARADO',
                  servicoRealizado: '',
                },
              ]);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialItem, initialOs]);

  const handleAddItem = () => {
    const defaultId = tiposEquipamento[0]?.id || 'pt-01';
    setItens([
      ...itens,
      {
        tipoEquipamentoId: defaultId,
        quantidadeReparada: 0,
        quantidadeSemDefeito: 0,
        quantidadeSucata: 0,
        anterioresNaCaixa: 0,
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
  const totalSemDefeito = itens.reduce((acc, it) => acc + Number(it.quantidadeSemDefeito || 0), 0);
  const totalSucata = itens.reduce((acc, it) => acc + Number(it.quantidadeSucata || 0), 0);
  const totalHoje = totalReparados + totalSemDefeito + totalSucata;
  const totalAnteriores = itens.reduce((acc, it) => acc + Number(it.anterioresNaCaixa || 0), 0);
  const totalGeralCaixa = totalAnteriores + totalHoje;
  const totalProcessados = totalHoje;

  const pontuacaoEstimada = itens.reduce((acc, it) => {
    const eq = tiposEquipamento.find((e) => e.id === it.tipoEquipamentoId);
    const pts = eq?.pontos || 1.0;
    // REGRA OFICIAL: Sem defeito NÃO conta ponto! Apenas peças reparadas contam pontos
    const qtdPronta = Number(it.quantidadeReparada) || 0;
    return acc + qtdPronta * pts;
  }, 0);

  const handleSubmit = async (modo: 'INICIAR_PRODUCAO' | 'DESPACHAR_CQ' | 'SALVAR_BANCADA') => {
    if (isSubmittingRef.current || isLoading) return;

    if (itens.length === 0) {
      setError('Adicione ao menos 1 equipamento no apontamento.');
      return;
    }

    const isAoVivo = modo === 'INICIAR_PRODUCAO';
    const isDiretoCQ = modo === 'DESPACHAR_CQ';

    if (!isAoVivo && totalProcessados < 1) {
      setError('Informe ao menos 1 unidade reparada, sem defeito ou sucata no apontamento de hoje.');
      return;
    }

    try {
      isSubmittingRef.current = true;
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

      const numParsed = numeroOS.trim() ? parseInt(numeroOS.replace(/\D/g, '')) : undefined;

      const payload = {
        numeroOS: numParsed && !isNaN(numParsed) ? numParsed : undefined,
        clienteId: clienteId || (clientes[0]?.id || 'cli-01'),
        dataEntrada: timestampISO,
        dataProducao: timestampISO,
        idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lote-${Date.now()}-${Math.random()}`,
        prioridade,
        observacoes: observacoes.trim() || undefined,
        enviarDiretoTeste: isDiretoCQ,
        iniciarProducaoAoVivo: isAoVivo,
        modoOperacao: modo,
        itens: itens.map((it) => {
          const rep = Number(it.quantidadeReparada) || 0;
          const semDef = Number(it.quantidadeSemDefeito) || 0;
          const suc = Number(it.quantidadeSucata) || 0;
          const ant = Number(it.anterioresNaCaixa) || 0;
          const hojeSoma = rep + semDef + suc;
          const totalNaCaixa = ant + hojeSoma;
          const qtdOperada = (rep + semDef) > 0 ? (rep + semDef) : (hojeSoma > 0 ? hojeSoma : (totalNaCaixa || 1));

          const categoria: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO' =
            it.tipoCategoria || (semDef > 0 && rep === 0 ? 'SEM_DEFEITO' : 'REPARADO');

          return {
            tipoEquipamentoId: it.tipoEquipamentoId,
            quantidade: qtdOperada,
            quantidadeTotalCaixa: totalNaCaixa,
            quantidadeReparada: rep,
            quantidadeSemDefeito: semDef,
            quantidadeSucata: suc,
            quantidadeRestante: 0,
            tipoCategoria: categoria,
            defeitoRelatado: categoria === 'SEM_DEFEITO'
              ? `Sem defeito aparente (Triagem) [Caixa Total: ${totalNaCaixa} un | Hoje: ${rep} rep, ${semDef} sem def, ${suc} sucata]`
              : (it.servicoRealizado.trim() || `Manutenção de bancada [Caixa Total: ${totalNaCaixa} un | Hoje: ${rep} rep, ${semDef} sem def, ${suc} sucata]`),
            servicoRealizado: it.servicoRealizado.trim() || (
              categoria === 'SEM_DEFEITO'
                ? `Testado em triagem (${semDef || rep} un sem defeito)${suc ? ` | ${suc} un sucata` : ''}`
                : `Reparo efetuado (${rep} un reparadas${semDef ? `, ${semDef} sem defeito` : ''})${suc ? ` | ${suc} un sucata` : ''}`
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
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleDespacharCQ = async () => {
    if (!numeroOS || isDespachandoCq) return;
    try {
      setIsDespachandoCq(true);
      setError(null);
      const numParsed = parseInt(numeroOS.replace(/\D/g, ''));
      // Se o técnico informou quantidades hoje antes de despachar ao CQ, salva a produção primeiro
      if (totalHoje > 0) {
        let timestampISO: string;
        if (dataRegistro && horaRegistro) {
          const [ano, mes, dia] = dataRegistro.split('-').map(Number);
          const [horas, minutos] = horaRegistro.split(':').map(Number);
          const dataLocal = new Date(ano, mes - 1, dia, horas || 0, minutos || 0, 0);
          timestampISO = isNaN(dataLocal.getTime()) ? new Date().toISOString() : dataLocal.toISOString();
        } else {
          timestampISO = new Date().toISOString();
        }
        await producaoApiService.apontarLote({
          numeroOS: numParsed,
          clienteId: clienteId || (clientes[0]?.id || 'cli-01'),
          dataEntrada: timestampISO,
          dataProducao: timestampISO,
          idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lote-${Date.now()}-${Math.random()}`,
          prioridade,
          observacoes: observacoes.trim() || undefined,
          enviarDiretoTeste: true,
          iniciarProducaoAoVivo: false,
          modoOperacao: 'DESPACHAR_CQ',
          itens: itens.map((it) => {
            const rep = Number(it.quantidadeReparada) || 0;
            const semDef = Number(it.quantidadeSemDefeito) || 0;
            const suc = Number(it.quantidadeSucata) || 0;
            const ant = Number(it.anterioresNaCaixa) || 0;
            const totalNaCaixa = ant + rep + semDef + suc;
            return {
              tipoEquipamentoId: it.tipoEquipamentoId,
              quantidade: (rep + semDef) > 0 ? (rep + semDef) : (totalNaCaixa || 1),
              quantidadeTotalCaixa: totalNaCaixa,
              quantidadeReparada: rep,
              quantidadeSemDefeito: semDef,
              quantidadeSucata: suc,
              quantidadeRestante: 0,
              tipoCategoria: it.tipoCategoria || 'REPARADO',
              defeitoRelatado: `Produção diária enviada ao CQ [${rep} rep, ${semDef} sem def, ${suc} suc]`,
              servicoRealizado: it.servicoRealizado.trim() || `Manutenção finalizada`,
            };
          }),
        });
      }
      await producaoApiService.despacharOsParaCQ(numParsed, despacharObservacao.trim() || observacoes.trim() || undefined);
      setConfirmDespacharModalOpen(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar OS para o CQ.');
    } finally {
      setIsDespachandoCq(false);
    }
  };

  const handleExcluirOS = async () => {
    if (!numeroOS || isExcluindoOs) return;
    try {
      setIsExcluindoOs(true);
      setError(null);
      const numParsed = parseInt(numeroOS.replace(/\D/g, ''));
      await producaoApiService.excluirOs(numParsed);
      setConfirmExcluirModalOpen(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir ordem de serviço.');
    } finally {
      setIsExcluindoOs(false);
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={initialOs ? `Continuar OS #${initialOs.numeroOS}` : "Apontamento de Lote / Minha OS"}
        subtitle={initialOs ? `Técnico: ${user?.nome || 'Operador'} — OS em Andamento. Registre a produção de hoje.` : `Técnico: ${user?.nome || 'Operador'} — Inicie a produção ou relate a quantidade reparada`}
        width="max-w-2xl"
        footer={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
              {modoOperacao === 'INICIAR_PRODUCAO' ? (
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Cronômetro ao vivo no Painel Renetec (TV)
                </span>
              ) : (
                <>
                  <span className="font-bold text-emerald-400 tabular-nums flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {totalReparados} reparadas hoje
                  </span>
                  {totalSemDefeito > 0 && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-sky-400 font-bold tabular-nums flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> {totalSemDefeito} sem defeito
                      </span>
                    </>
                  )}
                  {totalSucata > 0 && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-red-400 font-medium tabular-nums flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-red-400" /> {totalSucata} sucata
                      </span>
                    </>
                  )}
                  {totalAnteriores > 0 && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-300 font-semibold tabular-nums">
                        Total OS: <strong className="text-white">{totalGeralCaixa} un</strong>
                      </span>
                    </>
                  )}
                  <span className="text-gray-500">•</span>
                  <span className="text-amber-400 font-bold tabular-nums" title="Pontos creditados automaticamente após o testador (CQ) aprovar">
                    ~{pontuacaoEstimada.toFixed(1)} pts
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading || isDespachandoCq || isExcluindoOs}>
                Cancelar
              </Button>

              {initialOs && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmExcluirModalOpen(true)}
                  disabled={isLoading || isDespachandoCq || isExcluindoOs}
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                  className="text-red-400 hover:bg-red-500/10 font-medium text-xs"
                  title="Excluir esta OS lançada por engano"
                >
                  Excluir OS
                </Button>
              )}

              {numeroOS && (
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={() => setConfirmDespacharModalOpen(true)}
                  disabled={isLoading || isDespachandoCq || isExcluindoOs}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  className="font-bold text-xs shadow-glow-success"
                  title="Enviar esta OS e equipamentos reparados para a fila de testes do CQ"
                >
                  Mandar para o CQ
                </Button>
              )}

              {modoOperacao === 'INICIAR_PRODUCAO' ? (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleSubmit('INICIAR_PRODUCAO')}
                  disabled={isLoading || isDespachandoCq || isExcluindoOs}
                  loading={isLoading}
                  leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                  className="shadow-glow-success font-bold"
                >
                  Iniciar Produção Ao Vivo
                </Button>
              ) : modoOperacao === 'SALVAR_BANCADA' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSubmit('SALVAR_BANCADA')}
                  disabled={isLoading || isDespachandoCq || isExcluindoOs}
                  loading={isLoading}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  className="shadow-glow-primary font-bold"
                >
                  Salvar Produção de Hoje
                </Button>
              ) : (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleSubmit('DESPACHAR_CQ')}
                  disabled={isLoading || isDespachandoCq || isExcluindoOs}
                  loading={isLoading}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  className="shadow-glow-success font-bold"
                >
                  Despachar Lote ao CQ
                </Button>
              )}
            </div>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(modoOperacao); }} className="space-y-5 text-sm">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {initialOs && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    OS #{initialOs.numeroOS} — Em Andamento
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs text-gray-200 font-semibold">{initialOs.clienteNome}</span>
                </div>
                <p className="text-xs text-gray-300">
                  Total acumulado anterior: <strong className="text-emerald-400">{initialOs.totalGeralReparado} reparadas</strong>
                  {initialOs.totalGeralSemDefeito > 0 && <>, <strong className="text-sky-300">{initialOs.totalGeralSemDefeito} sem def</strong></>}
                  {initialOs.totalGeralSucata > 0 && <>, <strong className="text-red-400">{initialOs.totalGeralSucata} sucata</strong></>}
                  {' '}({initialOs.totalGeralEquipamentos} un no total da OS).
                </p>
              </div>
            </div>
          )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
            Ação / Destino deste Apontamento:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Iniciar Produção Ao Vivo */}
            <button
              type="button"
              onClick={() => setModoOperacao('INICIAR_PRODUCAO')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                modoOperacao === 'INICIAR_PRODUCAO'
                  ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-1 ring-amber-500/50'
                  : 'bg-surface-elevated/60 border-surface-border hover:border-surface-border/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className="text-xs font-bold text-white">Iniciar Produção</span>
                </div>
                {modoOperacao === 'INICIAR_PRODUCAO' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <p className="text-[10px] text-gray-300 mt-2 leading-relaxed">
                Inicia o <strong>cronômetro ao vivo</strong> agora na bancada e no Painel Renetec (TV).
              </p>
            </button>

            {/* 2. Despachar p/ Teste CQ */}
            <button
              type="button"
              onClick={() => setModoOperacao('DESPACHAR_CQ')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                modoOperacao === 'DESPACHAR_CQ'
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-glow-success ring-1 ring-emerald-500/50'
                  : 'bg-surface-elevated/60 border-surface-border hover:border-surface-border/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white">Despachar p/ CQ</span>
                </div>
                {modoOperacao === 'DESPACHAR_CQ' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <p className="text-[10px] text-gray-300 mt-2 leading-relaxed">
                Lote concluído pronto para o <strong>testador (CQ)</strong> inspecionar.
              </p>
            </button>

            {/* 3. Salvar na Minha Bancada */}
            <button
              type="button"
              onClick={() => setModoOperacao('SALVAR_BANCADA')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                modoOperacao === 'SALVAR_BANCADA'
                  ? 'bg-sky-950/40 border-sky-500 shadow-glow-primary ring-1 ring-sky-500/50'
                  : 'bg-surface-elevated/60 border-surface-border hover:border-surface-border/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Save className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white">Salvar na Bancada</span>
                </div>
                {modoOperacao === 'SALVAR_BANCADA' && (
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <p className="text-[10px] text-gray-300 mt-2 leading-relaxed">
                Salva a OS na sua bancada sem cronômetro ativo para continuar depois.
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
                Número da OS <span className="text-gray-500 text-[11px] font-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">#</span>
                <input
                  type="text"
                  value={numeroOS}
                  onChange={(e) => setNumeroOS(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Auto se vazio"
                  className="w-full h-10 pl-7 pr-3 bg-surface-base border border-surface-border rounded-lg text-sm text-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
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
                  Cliente / Empresa <span className="text-gray-500 text-[11px] font-normal">(Opcional)</span>
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
                Informe as quantidades que você fez <strong>hoje</strong> (reparadas, sem defeito e sucata). O total da caixa acumula automaticamente.
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
              const repHoje = Number(item.quantidadeReparada) || 0;
              const semDefHoje = Number(item.quantidadeSemDefeito) || 0;
              const sucHoje = Number(item.quantidadeSucata) || 0;
              const antHoje = Number(item.anterioresNaCaixa) || 0;
              const hojeSoma = repHoje + semDefHoje + sucHoje;
              const totalItemCaixa = antHoje + hojeSoma;
              const subtotalPts = (repHoje + semDefHoje) * ptsUnit;

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
                        {ptsUnit} pt/un • Estimado p/ {repHoje + semDefHoje} un: {subtotalPts.toFixed(1)} pts
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

                  {/* 3 CAMPOS PRINCIPAIS DE APONTAMENTO: REPARADAS | SEM DEFEITO | SUCATA */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#0e121a] p-3 rounded-xl border border-surface-border/70">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5" /> Reparadas Hoje
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantidadeReparada === 0 ? '' : item.quantidadeReparada}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          handleUpdateItem(idx, 'quantidadeReparada', v === '' ? 0 : parseInt(v));
                        }}
                        placeholder="0"
                        className="w-full h-9 px-2.5 bg-[#141923] border border-emerald-500/50 rounded-lg text-xs text-center text-emerald-300 font-mono font-black focus:outline-none focus:border-emerald-400 ring-1 ring-emerald-500/30"
                        title="Quantidade exata que você reparou com sucesso hoje"
                      />
                      <span className="text-[10px] text-emerald-400/80 block text-center font-medium">Prontas p/ teste</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Sem Defeito (Triagem)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantidadeSemDefeito === 0 ? '' : item.quantidadeSemDefeito}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          handleUpdateItem(idx, 'quantidadeSemDefeito', v === '' ? 0 : parseInt(v));
                        }}
                        placeholder="0 (opcional)"
                        className="w-full h-9 px-2.5 bg-[#141923] border border-sky-500/40 rounded-lg text-xs text-center text-sky-300 font-mono font-bold focus:outline-none focus:border-sky-400"
                        title="Equipamentos testados na triagem que estavam funcionando perfeitamente sem defeito (opcional)"
                      />
                      <span className="text-[10px] text-sky-400/80 block text-center font-medium">OK em triagem</span>
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
                        placeholder="0 (opcional)"
                        className="w-full h-9 px-2.5 bg-[#141923] border border-surface-border rounded-lg text-xs text-center text-red-300 font-mono font-bold focus:outline-none focus:border-red-500"
                        title="Unidades que morreram ou não deram conserto (opcional)"
                      />
                      <span className="text-[10px] text-gray-500 block text-center">Sem conserto</span>
                    </div>
                  </div>

                  {/* CONTABILIDADE DINÂMICA DA CAIXA E DIAS ANTERIORES */}
                  <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-surface-elevated/50 border border-surface-border/50 text-xs">
                    {item.anterioresReparadas !== undefined && (item.anterioresReparadas > 0 || (item.anterioresSemDefeito || 0) > 0 || (item.anterioresSucata || 0) > 0) && (
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-surface-border/40 text-[11px]">
                        <span className="text-gray-400 font-medium">Acumulado anterior nesta OS:</span>
                        <span className="text-amber-300 font-semibold tabular-nums">
                          {item.anterioresReparadas || 0} rep • {item.anterioresSemDefeito || 0} sem def • {item.anterioresSucata || 0} suc ({item.anterioresNaCaixa || 0} un total)
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <span className="text-gray-400 font-semibold flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-amber-400" /> Produção de Hoje:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-emerald-400 tabular-nums flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {repHoje} reparadas hoje
                        </span>
                        {semDefHoje > 0 && (
                          <span className="text-sky-300 tabular-nums flex items-center gap-1 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> {semDefHoje} sem defeito
                          </span>
                        )}
                        {sucHoje > 0 && (
                          <span className="text-red-400 tabular-nums flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> {sucHoje} sucata
                          </span>
                        )}
                        {antHoje > 0 ? (
                          <span className="font-bold text-amber-300 tabular-nums bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                            Total OS: <strong className="text-white">{totalItemCaixa} un</strong>
                          </span>
                        ) : (
                          <span className="font-bold text-gray-200 tabular-nums bg-surface-base px-2 py-0.5 rounded border border-surface-border">
                            Total: {hojeSoma} un
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide">
                      Classificação Principal
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
                        <Wrench className="w-3.5 h-3.5" />
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
                        <ShieldCheck className="w-3.5 h-3.5" />
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
                        <RotateCcw className="w-3.5 h-3.5" />
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
                <span className="text-gray-300">Hoje: <strong className="text-white tabular-nums">{totalProcessados} un</strong> ({totalReparados} rep{totalSemDefeito ? `, ${totalSemDefeito} sem def` : ''}{totalSucata ? `, ${totalSucata} suc` : ''})</span>
              </div>
              {totalAnteriores > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-gray-300">Total Acumulado na Caixa: <strong className="text-amber-300 tabular-nums">{totalGeralCaixa} un</strong></span>
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
            placeholder="Ex: Caixa com 11 peças feitas hoje (6 rep, 2 sem def, 3 sucata). Amanhã continuarei este lote."
            className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>
      </form>
    </Drawer>

    {confirmDespacharModalOpen && (
      <Modal
        isOpen={confirmDespacharModalOpen}
        onClose={() => setConfirmDespacharModalOpen(false)}
        title={`Mandar OS #${numeroOS} para o CQ`}
        subtitle="Envio dos equipamentos reparados para a bancada do tester de qualidade"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDespacharModalOpen(false)}
              disabled={isDespachandoCq}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleDespacharCQ}
              loading={isDespachandoCq}
              disabled={isDespachandoCq}
              leftIcon={<Send className="w-4 h-4" />}
              className="shadow-glow-success font-bold"
            >
              Confirmar Envio ao CQ
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            Você está prestes a enviar a <strong>OS #{numeroOS}</strong> para o Controle de Qualidade (CQ).
          </p>
          <p className="text-xs text-sky-300 bg-sky-950/40 p-2.5 rounded border border-sky-800/40">
            ℹ️ A produção informada hoje ({totalReparados} rep{totalSemDefeito ? `, ${totalSemDefeito} sem def` : ''}{totalSucata ? `, ${totalSucata} suc` : ''}) será salva e a OS será encaminhada para os <strong>testes do CQ</strong>.
          </p>
          <div className="space-y-1 pt-1">
            <label className="text-xs font-semibold text-gray-400 block">
              Observações / Instruções para o testador CQ (opcional):
            </label>
            <textarea
              rows={2}
              value={despacharObservacao}
              onChange={(e) => setDespacharObservacao(e.target.value)}
              placeholder="Ex: Lote revisado, trocados conectores óticos da porta PON. Pronto para teste de potência."
              className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    )}

    {confirmExcluirModalOpen && (
      <Modal
        isOpen={confirmExcluirModalOpen}
        onClose={() => setConfirmExcluirModalOpen(false)}
        title={`Excluir OS #${numeroOS}`}
        subtitle="Remoção de Ordem de Serviço lançada por engano"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmExcluirModalOpen(false)}
              disabled={isExcluindoOs}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleExcluirOS}
              loading={isExcluindoOs}
              disabled={isExcluindoOs}
              leftIcon={<Trash2 className="w-4 h-4" />}
              className="font-bold"
            >
              Sim, Excluir OS
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-300">
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-xs text-red-200 space-y-2">
            <p className="font-bold text-red-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" /> Atenção: Esta ação é definitiva!
            </p>
            <p>
              Tem certeza de que deseja excluir a <strong>OS #{numeroOS}</strong>?
            </p>
            <p className="text-gray-400">
              Esta ação removerá a OS e todos os seus apontamentos do banco de dados. Utilize apenas se a OS foi criada por engano.
            </p>
          </div>
        </div>
      </Modal>
    )}
  </>
  );
};
