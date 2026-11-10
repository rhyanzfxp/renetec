import React, { useState, useEffect } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { AlertModal } from '../../components/ui/AlertModal';
import { api } from '../../services/api';
import { osApiService } from '../os/os.service';
import { producaoApiService } from './producao.service';
import type { TipoEquipamentoOption, ClienteOption } from '../os/os.types';
import type { OsEmAndamentoData } from './producao.types';
import { useAuth } from '../auth/AuthContext';
import {
  PlusCircle,
  Trash2,
  Send,
  AlertCircle,
  Layers,
  CheckCircle2,
  XCircle,
  Save,
  ShieldCheck,
} from 'lucide-react';

interface EquipamentoLinha {
  tipoEquipamentoId: string;
  quantidadeReparada: number;
  quantidadeSemDefeito: number;
  quantidadeSucata: number;
  anterioresNaCaixa?: number;
  quantidadeTotalCaixa?: number;
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
  osEmAndamento?: OsEmAndamentoData[];
}

export const CriarLoteTecnicoDrawer: React.FC<CriarLoteTecnicoDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialItem,
  initialOs,
  osEmAndamento,
}) => {
  const { user } = useAuth();
  const [tiposEquipamento, setTiposEquipamento] = useState<TipoEquipamentoOption[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);

  const [isAddingCliente, setIsAddingCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteDoc, setNovoClienteDoc] = useState('');
  const [novoClienteTel, setNovoClienteTel] = useState('');
  const [isSavingCliente, setIsSavingCliente] = useState(false);

  const [modoOperacao, setModoOperacao] = useState<'DESPACHAR_CQ' | 'SALVAR_BANCADA'>('DESPACHAR_CQ');
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
  const [popupError, setPopupError] = useState<string | null>(null);

  const showError = (msg: string | null) => {
    setError(msg);
    if (msg) {
      setPopupError(msg);
    }
  };

  const isSubmittingRef = React.useRef(false);
  const [osDetectadaMsg, setOsDetectadaMsg] = useState<string | null>(null);

  const handleSalvarNovoCliente = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nomeLimpo = novoClienteNome.trim();
    if (!nomeLimpo) {
      showError('Informe o nome ou razão social da nova empresa.');
      return;
    }
    try {
      setIsSavingCliente(true);
      setError(null);
      const novo = await osApiService.createCliente({
        nomeRazaoSocial: nomeLimpo,
        documento: novoClienteDoc.trim() || undefined,
        contatoTelefone: novoClienteTel.trim() || undefined,
      });

      // Recarrega a lista e garante que o novo cliente está nela
      const updatedList = await osApiService.getClientes();
      setClientes(updatedList);

      // Verifica se o ID retornado existe na lista, senão adiciona manualmente
      const existeNaLista = updatedList.some((c) => c.id === novo.id);
      if (!existeNaLista) {
        setClientes((prev) => {
          if (prev.some((c) => c.id === novo.id)) return prev;
          return [...prev, novo];
        });
      }
      setClienteId(novo.id);

      setNovoClienteNome('');
      setNovoClienteDoc('');
      setNovoClienteTel('');
      setIsAddingCliente(false);
    } catch (err: any) {
      showError(err.response?.data?.message || err.message || 'Erro ao cadastrar nova empresa. Verifique os dados e tente novamente.');
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
                initialOs.equipamentos.map((eq: any) => {
                  const qtdCaixa = Number(eq.quantidadePrevista) || Number(eq.totalAcumulado) || 0;
                  return {
                    tipoEquipamentoId: eq.tipoEquipamentoId,
                    quantidadeReparada: 0,
                    quantidadeSemDefeito: 0,
                    quantidadeSucata: 0,
                    anterioresNaCaixa: qtdCaixa,
                    quantidadeTotalCaixa: qtdCaixa,
                    anterioresReparadas: eq.totalReparadas || eq.acumuladoReparado || 0,
                    anterioresSemDefeito: eq.totalSemDefeito || eq.acumuladoSemDefeito || 0,
                    anterioresSucata: eq.totalSucata || eq.acumuladoSucata || 0,
                    tipoCategoria: 'REPARADO',
                    servicoRealizado: 'Reparo de bancada efetuado',
                  };
                })
              );
            } else if (equipamentos.length > 0) {
              setItens([
                {
                  tipoEquipamentoId: equipamentos[0].id,
                  quantidadeReparada: 0,
                  quantidadeSemDefeito: 0,
                  quantidadeSucata: 0,
                  anterioresNaCaixa: 0,
                  quantidadeTotalCaixa: 0,
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
            const antRep = Number(initialItem.totalReparadasCaixa) || Number(initialItem.quantidadeReparada) || 0;
            const antSemDef = Number(initialItem.totalSemDefeitoCaixa) || Number(initialItem.quantidadeSemDefeito) || 0;
            const antSuc = Number(initialItem.totalSucataCaixa) || Number(initialItem.quantidadeSucata) || 0;
            const antTotal = antRep + antSemDef + antSuc;
            const qtdAnterior = Number(initialItem.totalAcumuladoCaixa) || Number(initialItem.quantidade) || antTotal || 0;

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
                quantidadeTotalCaixa: qtdAnterior,
                anterioresReparadas: antRep,
                anterioresSemDefeito: antSemDef,
                anterioresSucata: antSuc,
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
            // Sempre define o primeiro cliente da lista como selecionado
            if (clientesList.length > 0) {
              setClienteId(clientesList[0].id);
            } else {
              setClienteId('');
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

  // Auto-busca se o técnico digitar uma OS que já existe (em andamento ou concluída para retorno de remessa)
  useEffect(() => {
    if (!isOpen || initialOs || initialItem) return;
    const numLimpo = numeroOS.trim().replace(/\D/g, '');
    if (!numLimpo) {
      setOsDetectadaMsg(null);
      return;
    }
    const num = parseInt(numLimpo, 10);
    if (isNaN(num)) return;

    const osEncontrada = osEmAndamento?.find((o) => o.numeroOS === num);
    if (osEncontrada) {
      if (osEncontrada.cliente?.id) setClienteId(osEncontrada.cliente.id);
      if (osEncontrada.prioridade) setPrioridade(osEncontrada.prioridade as any);
      if (osEncontrada.equipamentos && osEncontrada.equipamentos.length > 0) {
        setItens(
          osEncontrada.equipamentos.map((eq: any) => {
            const antRep = Number(eq.totalReparadas) || Number(eq.acumuladoReparado) || 0;
            const antSemDef = Number(eq.totalSemDefeito) || Number(eq.acumuladoSemDefeito) || 0;
            const antSuc = Number(eq.totalSucata) || Number(eq.acumuladoSucata) || 0;
            const antTotal = antRep + antSemDef + antSuc;
            const qtdCaixa = Number(eq.quantidadePrevista) || Number(eq.totalAcumulado) || antTotal || 0;
            return {
              tipoEquipamentoId: eq.tipoEquipamentoId,
              quantidadeReparada: 0,
              quantidadeSemDefeito: 0,
              quantidadeSucata: 0,
              anterioresNaCaixa: qtdCaixa,
              quantidadeTotalCaixa: qtdCaixa,
              anterioresReparadas: antRep,
              anterioresSemDefeito: antSemDef,
              anterioresSucata: antSuc,
              tipoCategoria: 'REPARADO',
              servicoRealizado: 'Reparo de bancada efetuado',
            };
          })
        );
        const cli = osEncontrada.clienteNome || osEncontrada.cliente?.nomeRazaoSocial || 'Cliente';
        setOsDetectadaMsg(`OS #${num} localizada (${cli}). Dados de dias anteriores carregados.`);
      }
    } else {
      // Se não está na lista de em andamento na bancada, verifica se já foi concluída no sistema
      const timer = setTimeout(async () => {
        try {
          const res = await api.get<{ success: boolean; data: any }>(`/os/${num}`);
          const osGeral = res.data?.data;
          if (osGeral) {
            if (osGeral.cliente?.id) setClienteId(osGeral.cliente.id);
            if (osGeral.prioridade) setPrioridade(osGeral.prioridade as any);
            const cli = osGeral.cliente?.nomeRazaoSocial || 'Cliente';
            const foiConcluida = ['CONCLUIDO', 'CANCELADO'].includes(osGeral.status);
            setOsDetectadaMsg(
              foiConcluida
                ? `OS #${num} localizada (${cli}) — Status: Concluída. Ela será reaberta automaticamente para receber este novo lote de retorno.`
                : `OS #${num} localizada (${cli}).`
            );
            if (osGeral.itens && osGeral.itens.length > 0 && itens.every(it => !it.quantidadeReparada && !it.quantidadeSemDefeito && !it.quantidadeSucata)) {
              setItens(
                osGeral.itens.map((it: any) => ({
                  tipoEquipamentoId: it.tipoEquipamentoId || it.tipoEquipamento?.id,
                  quantidadeReparada: 0,
                  quantidadeSemDefeito: 0,
                  quantidadeSucata: 0,
                  anterioresNaCaixa: it.quantidade || 0,
                  quantidadeTotalCaixa: it.quantidade || 0,
                  tipoCategoria: 'REPARADO',
                  servicoRealizado: 'Reparo de bancada efetuado',
                }))
              );
            }
          } else {
            setOsDetectadaMsg(null);
          }
        } catch {
          setOsDetectadaMsg(null);
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [numeroOS, isOpen, initialOs, initialItem, osEmAndamento]);

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

  const handleUpdateReparada = (index: number, novaRep: number) => {
    const updated = [...itens];
    const item = updated[index];
    const repVal = Math.max(0, novaRep);
    const antRep = Number(item.anterioresReparadas) || 0;
    const antSemDef = Number(item.anterioresSemDefeito) || 0;
    const antSuc = Number(item.anterioresSucata) || 0;
    const antTotal = antRep + antSemDef + antSuc;
    const semDef = Number(item.quantidadeSemDefeito) || 0;
    const suc = Number(item.quantidadeSucata) || 0;
    const novoTotal = antTotal + repVal + semDef + suc;

    updated[index] = {
      ...item,
      quantidadeReparada: repVal,
      quantidadeTotalCaixa: Math.max(novoTotal, Number(item.anterioresNaCaixa) || 0),
    };
    setItens(updated);
  };

  const handleUpdateTotalCaixa = (index: number, novoTotal: number) => {
    const updated = [...itens];
    const item = updated[index];
    const antRep = Number(item.anterioresReparadas) || 0;
    const antSemDef = Number(item.anterioresSemDefeito) || 0;
    const antSuc = Number(item.anterioresSucata) || 0;
    const antTotal = antRep + antSemDef + antSuc;
    const semDef = Number(item.quantidadeSemDefeito) || 0;
    const suc = Number(item.quantidadeSucata) || 0;

    if (antTotal > 0 && novoTotal >= antTotal) {
      const diff = novoTotal - (antTotal + semDef + suc);
      updated[index] = {
        ...item,
        quantidadeTotalCaixa: novoTotal,
        quantidadeReparada: Math.max(0, diff),
      };
    } else {
      updated[index] = {
        ...item,
        quantidadeTotalCaixa: novoTotal,
      };
    }
    setItens(updated);
  };

  const totalReparados = itens.reduce((acc, it) => acc + Number(it.quantidadeReparada || 0), 0);
  const totalSemDefeito = itens.reduce((acc, it) => acc + Number(it.quantidadeSemDefeito || 0), 0);
  const totalSucata = itens.reduce((acc, it) => acc + Number(it.quantidadeSucata || 0), 0);
  const totalHoje = totalReparados + totalSemDefeito + totalSucata;
  const totalAnteriores = itens.reduce((acc, it) => {
    const antRep = Number(it.anterioresReparadas) || 0;
    const antSemDef = Number(it.anterioresSemDefeito) || 0;
    const antSuc = Number(it.anterioresSucata) || 0;
    const antTotal = antRep + antSemDef + antSuc;
    return acc + (antTotal > 0 ? antTotal : Number(it.anterioresNaCaixa || 0));
  }, 0);
  const totalGeralCaixa = totalAnteriores + totalHoje;
  const totalProcessados = totalHoje;

  const pontuacaoEstimada = itens.reduce((acc, it) => {
    const eq = tiposEquipamento.find((e) => e.id === it.tipoEquipamentoId);
    const pts = eq?.pontos || 1.0;
    // REGRA OFICIAL: Sem defeito NÃO conta ponto! Apenas peças reparadas contam pontos
    const qtdPronta = Number(it.quantidadeReparada) || 0;
    return acc + qtdPronta * pts;
  }, 0);

  const handleSubmit = async (modo: 'DESPACHAR_CQ' | 'SALVAR_BANCADA') => {
    if (isSubmittingRef.current || isLoading) return;

    if (!numeroOS.trim()) {
      showError('Informe o número da OS. O lançamento será consolidado nessa mesma OS.');
      return;
    }

    if (itens.length === 0) {
      showError('Adicione ao menos 1 equipamento no apontamento.');
      return;
    }

    const isAoVivo = false;
    const isDiretoCQ = modo === 'DESPACHAR_CQ';

    if (!isAoVivo && totalProcessados < 1) {
      // Se for despacho para o CQ de uma OS existente na bancada (initialOs ou com itens anteriores)
      if (isDiretoCQ && (initialOs || totalAnteriores > 0) && numeroOS) {
        try {
          isSubmittingRef.current = true;
          setIsLoading(true);
          setError(null);
          const numParsed = parseInt(numeroOS.replace(/\D/g, ''));
          await producaoApiService.despacharOsParaCQ(numParsed, observacoes.trim() || undefined);
          onSuccess();
          onClose();
          return;
        } catch (err: any) {
          showError(err.response?.data?.message || 'Erro ao enviar OS para o CQ.');
          return;
        } finally {
          isSubmittingRef.current = false;
          setIsLoading(false);
        }
      }

      showError('Informe ao menos 1 unidade reparada, sem defeito ou sucata no apontamento de hoje.');
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsLoading(true);
      setError(null);

      // Garante que há um cliente selecionado válido
      const clienteIdFinal = clienteId && clienteId !== '' && clienteId !== '__NOVA_EMPRESA__'
        ? clienteId
        : (clientes[0]?.id || 'cli-01');

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
        clienteId: clienteIdFinal,
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
          const antRep = Number(it.anterioresReparadas) || 0;
          const antSemDef = Number(it.anterioresSemDefeito) || 0;
          const antSuc = Number(it.anterioresSucata) || 0;
          const antTotalFeito = antRep + antSemDef + antSuc;
          const hojeSoma = rep + semDef + suc;
          const totalNaCaixa = it.quantidadeTotalCaixa !== undefined && it.quantidadeTotalCaixa > 0
            ? Number(it.quantidadeTotalCaixa)
            : (antTotalFeito + hojeSoma > 0 ? (antTotalFeito + hojeSoma) : (ant > 0 ? ant : (hojeSoma > 0 ? hojeSoma : 1)));
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
      showError(err.response?.data?.message || 'Falha ao registrar lote de produção.');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
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
      showError(err.response?.data?.message || 'Erro ao excluir ordem de serviço.');
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
        subtitle={initialOs ? `Técnico: ${user?.nome || 'Operador'} — OS em Andamento. Registre a produção de hoje.` : `Técnico: ${user?.nome || 'Operador'} — Relate a quantidade reparada ou despache para o CQ`}
        width="max-w-2xl"
        footer={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
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
              <span className="text-amber-400 font-bold tabular-nums">
                ~{pontuacaoEstimada.toFixed(1)} pts
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading || isExcluindoOs} className="whitespace-nowrap">
                Cancelar
              </Button>

              {initialOs && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmExcluirModalOpen(true)}
                  disabled={isLoading || isExcluindoOs}
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                  className="text-red-400 hover:bg-red-500/10 font-medium text-xs whitespace-nowrap"
                  title="Excluir esta OS lançada por engano"
                >
                  Excluir OS
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setModoOperacao('SALVAR_BANCADA');
                  handleSubmit('SALVAR_BANCADA');
                }}
                disabled={isLoading || isExcluindoOs}
                loading={isLoading && modoOperacao === 'SALVAR_BANCADA'}
                leftIcon={<Save className="w-3.5 h-3.5 text-sky-400" />}
                className="font-bold whitespace-nowrap border-surface-border text-gray-200 hover:bg-surface-elevated"
              >
                Salvar na Bancada
              </Button>

              <Button
                type="button"
                variant="success"
                size="sm"
                onClick={() => {
                  setModoOperacao('DESPACHAR_CQ');
                  handleSubmit('DESPACHAR_CQ');
                }}
                disabled={isLoading || isExcluindoOs}
                loading={isLoading && modoOperacao === 'DESPACHAR_CQ'}
                leftIcon={<Send className="w-3.5 h-3.5" />}
                className="shadow-glow-success font-bold whitespace-nowrap"
              >
                Despachar para o CQ
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(modoOperacao); }} className="space-y-4 text-sm">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800/40 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {initialOs && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  OS #{initialOs.numeroOS} (Em Andamento)
                </span>
                <span className="text-gray-400 ml-2 font-medium">{initialOs.clienteNome}</span>
              </div>
              <span className="text-gray-300">
                Acumulado: <strong className="text-emerald-400">{initialOs.totalGeralReparado} rep</strong> ({initialOs.totalGeralEquipamentos} un total)
              </span>
            </div>
          )}

          {osDetectadaMsg && !initialOs && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{osDetectadaMsg}</span>
            </div>
          )}

          {/* 1. IDENTIFICAÇÃO DA OS E CLIENTE (LIMPO E COMPACTO) */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-surface-border space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-200">
                  Número da OS <span className="text-brand-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-bold text-sm">#</span>
                  <input
                    type="text"
                    value={numeroOS}
                    onChange={(e) => setNumeroOS(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ex.: 1855"
                    className="w-full h-9 pl-7 pr-3 bg-surface-base border border-surface-border rounded-lg text-sm text-white font-mono font-bold focus:outline-none focus:border-brand-500"
                    required
                    autoFocus={!initialOs}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">
                    Cliente / Empresa
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCliente(!isAddingCliente);
                      setError(null);
                    }}
                    className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    {isAddingCliente ? 'Fechar' : 'Nova Empresa'}
                  </button>
                </div>

                {isAddingCliente ? (
                  <div className="p-3 bg-surface-card border border-brand-500/40 rounded-lg space-y-2">
                    <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-wider">Nova Empresa / Cliente</p>
                    <input
                      type="text"
                      value={novoClienteNome}
                      onChange={(e) => setNovoClienteNome(e.target.value)}
                      placeholder="Nome / Razão Social *"
                      autoFocus
                      className="w-full h-8 px-2.5 bg-surface-base border border-surface-border rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={novoClienteDoc}
                        onChange={(e) => setNovoClienteDoc(e.target.value)}
                        placeholder="CNPJ / CPF (opcional)"
                        className="w-full h-8 px-2.5 bg-surface-base border border-surface-border rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                      />
                      <input
                        type="text"
                        value={novoClienteTel}
                        onChange={(e) => setNovoClienteTel(e.target.value)}
                        placeholder="Telefone (opcional)"
                        className="w-full h-8 px-2.5 bg-surface-base border border-surface-border rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCliente(false);
                          setNovoClienteNome('');
                          setNovoClienteDoc('');
                          setNovoClienteTel('');
                        }}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSalvarNovoCliente}
                        disabled={isSavingCliente || !novoClienteNome.trim()}
                        className="px-3 py-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white rounded transition-colors"
                      >
                        {isSavingCliente ? 'Salvando...' : 'Cadastrar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={clienteId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__NOVA_EMPRESA__') {
                          setIsAddingCliente(true);
                        } else {
                          setClienteId(val);
                        }
                      }}
                      className="w-full h-9 px-3 bg-surface-base border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 appearance-none pr-8"
                    >
                      {clientes.length === 0 && (
                        <option value="" disabled>Carregando clientes...</option>
                      )}
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-surface-card text-white py-1">
                          {c.nomeRazaoSocial}
                        </option>
                      ))}
                      <option value="__NOVA_EMPRESA__" className="bg-surface-elevated text-brand-300 font-bold py-1">
                        + Cadastrar Nova Empresa...
                      </option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5 text-xs">
              <div>
                <label className="text-[11px] text-gray-400 block mb-0.5">Data</label>
                <input
                  type="date"
                  value={dataRegistro}
                  onChange={(e) => setDataRegistro(e.target.value)}
                  className="w-full h-7 px-2 bg-surface-base border border-surface-border rounded text-xs text-gray-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-0.5">Horário</label>
                <input
                  type="time"
                  value={horaRegistro}
                  onChange={(e) => setHoraRegistro(e.target.value)}
                  className="w-full h-7 px-2 bg-surface-base border border-surface-border rounded text-xs text-gray-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-0.5">Prioridade</label>
                <select
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value as any)}
                  className="w-full h-7 px-2 bg-surface-base border border-surface-border rounded text-xs text-gray-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="BAIXA" className="bg-surface-card text-white">Baixa</option>
                  <option value="MEDIA" className="bg-surface-card text-white">Média</option>
                  <option value="ALTA" className="bg-surface-card text-white">Alta</option>
                  <option value="URGENTE" className="bg-surface-card text-white">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. EQUIPAMENTOS DA CAIXA / LOTE (COM SUPORTE A MÚLTIPLOS ITENS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" /> Equipamentos ({itens.length})
              </h4>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                leftIcon={<PlusCircle className="w-3.5 h-3.5 text-emerald-400" />}
                className="text-xs font-semibold"
              >
                Adicionar Equipamento
              </Button>
            </div>

            <div className="space-y-3">
              {itens.map((item, idx) => {
                const selectedEq = tiposEquipamento.find((e) => e.id === item.tipoEquipamentoId);
                const ptsUnit = selectedEq?.pontos || 1.0;
                const repHoje = Number(item.quantidadeReparada) || 0;
                const semDefHoje = Number(item.quantidadeSemDefeito) || 0;
                const sucHoje = Number(item.quantidadeSucata) || 0;
                const antRep = Number(item.anterioresReparadas) || 0;
                const antSemDef = Number(item.anterioresSemDefeito) || 0;
                const antSuc = Number(item.anterioresSucata) || 0;
                const antTotal = antRep + antSemDef + antSuc;
                const hojeSoma = repHoje + semDefHoje + sucHoje;
                const subtotalPts = (repHoje + semDefHoje) * ptsUnit;

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-surface-elevated/30 border border-surface-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Item #{idx + 1}</span>
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 tabular-nums font-semibold">
                          {ptsUnit} pts/un • +{subtotalPts.toFixed(1)} pts hoje
                        </span>
                      </div>

                      {itens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-gray-400 hover:text-red-400 transition-colors p-1"
                          title="Remover este equipamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-gray-300">
                          Modelo do Equipamento *
                        </label>
                        <select
                          value={item.tipoEquipamentoId}
                          onChange={(e) => handleUpdateItem(idx, 'tipoEquipamentoId', e.target.value)}
                          className="w-full h-9 px-2.5 bg-surface-base border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                        >
                          {tiposEquipamento.map((t) => {
                            const pts = t.pontos ?? 1;
                            return (
                              <option key={t.id} value={t.id} className="bg-surface-card text-white py-1">
                                {t.nome} ({pts} pt{pts > 1 ? 's' : ''})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
                          <span>Total Caixa</span>
                          {antTotal > 0 && <span className="text-[10px] text-amber-400 font-normal">Ant: {antTotal}</span>}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantidadeTotalCaixa !== undefined ? (item.quantidadeTotalCaixa === 0 ? '' : item.quantidadeTotalCaixa) : (antTotal > 0 ? (antTotal + hojeSoma) : (hojeSoma > 0 ? hojeSoma : ''))}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            handleUpdateTotalCaixa(idx, raw === '' ? 0 : parseInt(raw));
                          }}
                          placeholder={String(antTotal > 0 ? (antTotal + hojeSoma) : (hojeSoma > 0 ? hojeSoma : 1))}
                          className="w-full h-9 px-2.5 bg-surface-base border border-surface-border rounded-lg text-xs text-white font-mono font-bold focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* ACUMULADO ANTERIOR — visível apenas quando há histórico */}
                    {antTotal > 0 && (
                      <div className="rounded-lg border border-surface-border bg-surface-base/60 px-3 py-2 space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          Acumulado salvo nesta OS (dias anteriores)
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[13px] font-black text-emerald-400 tabular-nums">{antRep}</p>
                            <p className="text-[9px] text-gray-500">reparados</p>
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-sky-400 tabular-nums">{antSemDef}</p>
                            <p className="text-[9px] text-gray-500">sem defeito</p>
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-red-400 tabular-nums">{antSuc}</p>
                            <p className="text-[9px] text-gray-500">sucata</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CONTADORES DE HOJE */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        {antTotal > 0 ? 'Adicionar hoje (incremento)' : 'Quantidade de hoje'}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-emerald-400 block">
                            Reparadas {antTotal === 0 && '*'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.quantidadeReparada === 0 ? '' : item.quantidadeReparada}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '');
                              handleUpdateReparada(idx, v === '' ? 0 : parseInt(v));
                            }}
                            placeholder={antRep > 0 ? '+0 hoje' : '0'}
                            className="w-full h-9 px-2 bg-surface-base border border-emerald-500/50 rounded-lg text-xs text-center text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                          />
                          {antRep > 0 && (
                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                              <span className="text-emerald-300/70">Total: {antRep + repHoje}</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 5].map((add) => (
                                  <button
                                    key={add}
                                    type="button"
                                    onClick={() => handleUpdateReparada(idx, repHoje + add)}
                                    className="px-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px] hover:bg-emerald-500/20"
                                  >
                                    +{add}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-sky-400 block">
                            Sem Defeito
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.quantidadeSemDefeito === 0 ? '' : item.quantidadeSemDefeito}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '');
                              handleUpdateItem(idx, 'quantidadeSemDefeito', v === '' ? 0 : parseInt(v));
                            }}
                            placeholder={antSemDef > 0 ? '+0 hoje' : '0'}
                            className="w-full h-9 px-2 bg-surface-base border border-sky-500/40 rounded-lg text-xs text-center text-sky-300 font-mono focus:outline-none focus:border-sky-400"
                          />
                          {antSemDef > 0 && (
                            <p className="text-[10px] text-sky-300/60 text-center">Total: {antSemDef + semDefHoje}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-red-400 block">
                            Sucata
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.quantidadeSucata === 0 ? '' : item.quantidadeSucata}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '');
                              handleUpdateItem(idx, 'quantidadeSucata', v === '' ? 0 : parseInt(v));
                            }}
                            placeholder={antSuc > 0 ? '+0 hoje' : '0'}
                            className="w-full h-9 px-2 bg-surface-base border border-red-500/40 rounded-lg text-xs text-center text-red-300 font-mono focus:outline-none focus:border-red-400"
                          />
                          {antSuc > 0 && (
                            <p className="text-[10px] text-red-300/60 text-center">Total: {antSuc + sucHoje}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="text"
                        value={item.servicoRealizado}
                        onChange={(e) => handleUpdateItem(idx, 'servicoRealizado', e.target.value)}
                        placeholder="Serviço / Reparo realizado (opcional)"
                        className="w-full h-8 px-2.5 bg-surface-base border border-surface-border rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BARRA DE RESUMO DO LOTE */}
            <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {/* Hoje (incremento) */}
                <span className="text-gray-300">
                  <span className="text-gray-500 text-[10px] mr-1">HOJE</span>
                  <strong className="text-white tabular-nums">
                    {totalAnteriores > 0 ? '+' : ''}{totalProcessados} un
                  </strong>
                  {totalProcessados > 0 && (
                    <span className="text-gray-400 ml-1">
                      ({totalReparados} rep{totalSemDefeito ? `, ${totalSemDefeito} sem def` : ''}{totalSucata ? `, ${totalSucata} suc` : ''})
                    </span>
                  )}
                </span>

                {/* Total acumulado na OS — só aparece quando há histórico */}
                {totalAnteriores > 0 && (
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <span className="text-gray-600">|</span>
                    <span className="text-[10px] text-gray-500 mr-0.5">TOTAL OS</span>
                    <strong className="text-amber-400 tabular-nums">{totalGeralCaixa} un</strong>
                    <span className="text-gray-600 text-[10px]">({totalAnteriores} ant + {totalHoje} hoje)</span>
                  </span>
                )}
              </div>

              <div className="text-right whitespace-nowrap">
                <span className="text-amber-400 font-bold tabular-nums">~{pontuacaoEstimada.toFixed(1)} pts</span>
                <span className="text-gray-500 text-[10px] block">(após teste do CQ)</span>
              </div>
            </div>
          </div>

          {/* Observações Gerais para o CQ */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300 block">
              Observações para o Testador / CQ (opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Alguma instrução para o CQ inspecionar..."
              className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>
        </form>
    </Drawer>

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
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/30 border border-red-300 dark:border-red-800/50 text-xs text-red-800 dark:text-red-200 space-y-2">
            <p className="font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" /> Atenção: Esta ação é definitiva!
            </p>
            <p>
              Tem certeza de que deseja excluir a <strong>OS #{numeroOS}</strong>?
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Esta ação removerá a OS e todos os seus apontamentos do banco de dados. Utilize apenas se a OS foi criada por engano.
            </p>
          </div>
        </div>
      </Modal>
    )}

    {/* Pop-up de Alerta Centralizado em Tela Cheia para Erros */}
    <AlertModal
      isOpen={!!popupError}
      onClose={() => setPopupError(null)}
      title="Atenção: Não foi possível registrar"
      message={popupError}
    />
  </>
  );
};
