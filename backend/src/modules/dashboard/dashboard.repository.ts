import { prisma, isDatabaseReady } from '../../database/prisma.js';

export interface BancadaStatus {
  tecnicoId: string;
  tecnicoNome: string;
  funcao: string;
  status: 'EM_PRODUCAO' | 'DISPONIVEL' | 'EM_PAUSA';
  producaoAtiva?: {
    id: string;
    numeroOS: number;
    clienteNome: string;
    equipamentoNome: string;
    quantidade: number;
    pontosTotais: number;
    dataInicio: string;
    tempoDecorridoMinutos: number;
  } | null;
  pontosHoje: number;
}

export interface TvFabricaData {
  timestamp: string;
  meta: {
    mesNome: string;
    ano: number;
    pontosRealizados: number;
    metaBase: number;
    metaAlvo: number;
    metaExcelencia: number;
    statusMeta: 'META_EXCELENCIA' | 'META_ALVO' | 'META_BASE' | 'ABAIXO_DA_META';
    statusMetaLabel: string;
    percentualAlvo: number;
    ritmoAtual: number;
    projecaoFechamento: number;
    diasUteisRestantes: number;
    faturamentoLancado: number;
    taxaRetrabalho: number;
    statusQualidadeLabel: string;
  };
  bancadas: BancadaStatus[];
  fpyHoje: {
    fpyPercentual: number;
    totalTestados: number;
    aprovadosPrimeiraVez: number;
    reprovados: number;
  };
  filaPrioritaria: {
    id: string;
    numeroOS: number;
    clienteNome: string;
    equipamentoNome: string;
    quantidade: number;
    pontosTotais: number;
    prioridade: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA';
    status: string;
  }[];
}

export interface DefeitoDistribuicao {
  categoria: string;
  codigo: string;
  motivo: string;
  quantidade: number;
  percentual: number;
}

export interface LeadTimeEquipamento {
  tipoEquipamentoNome: string;
  pontosUnitarios: number;
  quantidadeConcluida: number;
  tempoMedioMinutos: number;
}

export interface ProdutividadeTecnico {
  tecnicoId: string;
  tecnicoNome: string;
  funcao: string;
  pesoBonus: number;
  pontosRealizados: number;
  percentualTotal: number;
  taxaAprovacao: number;
  tempoMedioPorLoteMinutos: number;
}

export interface GerencialData {
  periodo: string;
  faturamentoEstimado: number;
  totalOsAtivas: number;
  pontosTotaisRealizados: number;
  metaAlvoPeriodo: number;
  fpyGeral: number;
  taxaRetrabalho: number;
  leadTimeMedioGeralMinutos: number;
  distribuicaoDefeitos: DefeitoDistribuicao[];
  leadTimePorEquipamento: LeadTimeEquipamento[];
  produtividadeTecnicos: ProdutividadeTecnico[];
  producaoHistoricoDias: {
    data: string;
    pontos: number;
    reprovados: number;
  }[];
}

// ─── Auxiliares de Pontuação e Correspondência ──────────────────────────────
function getPontosUnitarios(nome?: string): number {
  if (!nome) return 1.5;
  const n = nome.toLowerCase();
  if (n.includes('ccr') || n.includes('mimosa') || n.includes('ac')) return 2.5;
  if (n.includes('olt') || n.includes('switch') || n.includes('especial')) return 3.0;
  if (n.includes('rb') || n.includes('basebox') || n.includes('placa') || n.includes('pacpon')) return 2.0;
  if (n.includes('ont') || n.includes('giga') || n.includes('radio') || n.includes('sxt') || n.includes('nano') || n.includes('litebeam')) return 1.5;
  if (n.includes('onu')) return 1.0;
  return 1.5;
}

function isTecnicoMatch(tId1?: string | null, tNome1?: string | null, tId2?: string | null, tNome2?: string | null): boolean {
  if (!tId1 && !tNome1) return false;
  if (!tId2 && !tNome2) return false;

  // Match exato por ID
  if (tId1 && tId2 && tId1.toLowerCase() === tId2.toLowerCase()) return true;
  // Match parcial de ID (ex: colab-joao contém joao)
  if (tId1 && tId2 && (tId1.includes(tId2) || tId2.includes(tId1))) return true;

  // Match por nome
  if (tNome1 && tNome2) {
    const n1 = tNome1.toLowerCase().trim();
    const n2 = tNome2.toLowerCase().trim();
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }

  // ID do tipo "colab-joao" vs nome "João"
  if (tId1 && tNome2) {
    const idNorm = tId1.toLowerCase().replace(/[^a-z]/g, '');
    const nomeNorm = tNome2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    if (idNorm.includes(nomeNorm) || nomeNorm.includes(idNorm)) return true;
  }
  if (tId2 && tNome1) {
    const idNorm = tId2.toLowerCase().replace(/[^a-z]/g, '');
    const nomeNorm = tNome1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    if (idNorm.includes(nomeNorm) || nomeNorm.includes(idNorm)) return true;
  }

  return false;
}


// ─── Agregação para a TV da Fábrica ──────────────────────────────────────────
export async function getTvFabricaData(): Promise<TvFabricaData> {
  const agora = new Date();

  // 1. Metas Atualizadas
  let metaInfo: any = {
    mesNome: agora.toLocaleString('pt-BR', { month: 'long' }),
    ano: agora.getFullYear(),
    pontosRealizados: 0,
    metaBase: 250,
    metaAlvo: 300,
    metaExcelencia: 350,
    statusMeta: 'ABAIXO_DA_META' as const,
    statusMetaLabel: '🔴 ABAIXO DA META',
    percentualAlvo: 0.0,
    ritmoAtual: 0.0,
    projecaoFechamento: 0,
    diasUteisRestantes: 22,
    faturamentoLancado: 0.0,
    taxaRetrabalho: 0.0,
    statusQualidadeLabel: 'Sem dados',
  };

  try {
    const { getMetasAtual } = await import('../meta/meta.service.js');
    const metasData = await getMetasAtual();
    metaInfo = {
      mesNome: metasData.mesNome,
      ano: metasData.ano,
      pontosRealizados: metasData.pontosRealizados,
      metaBase: metasData.faixas.metaBase,
      metaAlvo: metasData.faixas.metaAlvo,
      metaExcelencia: metasData.faixas.metaExcelencia,
      statusMeta: metasData.statusMeta,
      statusMetaLabel: metasData.statusMetaLabel,
      percentualAlvo: metasData.percentuais.percentualAlvo,
      ritmoAtual: metasData.ritmos.ritmoAtual,
      projecaoFechamento: metasData.projecoes.projecaoFechamento,
      diasUteisRestantes: metasData.diasUteisRestantes,
      faturamentoLancado: metasData.faturamentoLancado,
      taxaRetrabalho: metasData.taxaRetrabalho,
      statusQualidadeLabel: metasData.statusQualidadeLabel,
    };
  } catch {
    // fallback
  }

  // 2. Colaboradores / Bancadas Base
  const baseBancadas = [
    { id: 'usr-tecnico-03', tecId: 'colab-joas', nome: 'Joás', funcao: 'Produção' },
    { id: 'usr-tecnico-02', tecId: 'colab-samuel', nome: 'Samuel', funcao: 'Produção' },
    { id: 'usr-tecnico-01', tecId: 'colab-joao', nome: 'João', funcao: 'Produção' },
    { id: 'usr-qualidade-01', tecId: 'colab-rhyan', nome: 'Rhyan', funcao: 'Qualidade/Testes' },
  ];

  let producoesAtivasList: any[] = [];
  let producoesFinalizadasHoje: any[] = [];
  let filaPrioritariaList: any[] = [];
  let testesHojeList: any[] = [];

  if (isDatabaseReady()) {
    try {
      const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0);
      const [ativas, finalizadas, filaItens, testes] = await Promise.all([
        prisma.producao.findMany({
          where: { status: 'EM_ANDAMENTO' },
          include: {
            itemOrdemServico: {
              include: {
                ordemServico: { include: { cliente: true } },
                tipoEquipamento: true,
              },
            },
            tecnico: true,
          },
        }),
        prisma.producao.findMany({
          where: {
            status: 'FINALIZADO',
            dataFim: { gte: inicioDia },
          },
          include: {
            itemOrdemServico: {
              include: { tipoEquipamento: true },
            },
            tecnico: true,
          },
        }),
        prisma.itemOrdemServico.findMany({
          where: { statusItem: { in: ['AGUARDANDO_PRODUCAO', 'RECEBIDO'] } },
          include: {
            ordemServico: { include: { cliente: true } },
            tipoEquipamento: true,
          },
          orderBy: [
            { ordemServico: { prioridade: 'desc' } },
            { ordemServico: { dataEntrada: 'asc' } },
          ],
          take: 5,
        }),
        prisma.teste.findMany({
          where: { dataTeste: { gte: inicioDia } },
        }),
      ]);

      producoesAtivasList = ativas;
      producoesFinalizadasHoje = finalizadas;
      testesHojeList = testes;
      filaPrioritariaList = filaItens.map((it) => {
        const ptsUnit = getPontosUnitarios(it.tipoEquipamento?.nome);
        return {
          id: it.id,
          numeroOS: it.ordemServico?.numeroOS || 0,
          clienteNome: it.ordemServico?.cliente?.nomeRazaoSocial || 'MARANET',
          equipamentoNome: it.tipoEquipamento?.nome || 'Equipamento',
          quantidade: it.quantidade,
          pontosTotais: Number((it.quantidade * ptsUnit).toFixed(1)),
          prioridade: it.ordemServico?.prioridade || 'MEDIA',
          status: it.statusItem,
        };
      });
    } catch {
      // fallback
    }
  }

  // Fallback em memória (mock) se DB vazio ou sem produção ativa
  const dbTemAtivas = producoesAtivasList.length > 0;
  if (!dbTemAtivas) {
    const { mockProducoes, mockFilaItens } = await import('../producao/producao.repository.js');
    const { mockOsList } = await import('../os/os.repository.js');
    const { mockTestes } = await import('../qualidade/teste.repository.js');

    // Hidratar produções mock com campo tecnico para isTecnicoMatch funcionar
    const hydrateMock = (p: any) => {
      const itemOS = p.itemOrdemServico as any;
      const tAlocado = itemOS?.tecnicoAlocado;
      return {
        ...p,
        tecnico: tAlocado ? { id: tAlocado.id, nome: tAlocado.nome } : null,
        // Garante que tecnicoId esteja presente
        tecnicoId: p.tecnicoId || tAlocado?.id || null,
      };
    };

    const mockAtivas = mockProducoes.filter((p) => p.status === 'EM_ANDAMENTO').map(hydrateMock);
    const mockFinalizadas = mockProducoes.filter((p) => p.status === 'FINALIZADO').map(hydrateMock);

    // Mescla com DB: DB prevalece se tiver, mock complementa
    if (mockAtivas.length > 0) {
      producoesAtivasList = [...producoesAtivasList, ...mockAtivas.filter(
        (m) => !producoesAtivasList.some((d) => d.id === m.id)
      )];
    }
    if (mockFinalizadas.length > 0) {
      producoesFinalizadasHoje = [...producoesFinalizadasHoje, ...mockFinalizadas.filter(
        (m) => !producoesFinalizadasHoje.some((d) => d.id === m.id)
      )];
    }
    if (testesHojeList.length === 0) testesHojeList = mockTestes;

    // Fila prioritária a partir do mock
    const itensFila = mockFilaItens.filter((it) =>
      ['AGUARDANDO_PRODUCAO', 'RECEBIDO'].includes(it.statusItem)
    );

    for (const os of mockOsList) {
      if (['AGUARDANDO_PRODUCAO', 'RECEBIDO'].includes(os.status)) {
        for (const it of os.itens) {
          if (['AGUARDANDO_PRODUCAO', 'RECEBIDO'].includes(it.statusItem)) {
            if (!itensFila.some((f) => f.id === it.id)) {
              itensFila.push({ ...it, ordemServico: os });
            }
          }
        }
      }
    }

    if (filaPrioritariaList.length === 0) {
      filaPrioritariaList = itensFila.slice(0, 5).map((it) => {
        const eqNome = it.tipoEquipamento?.nome || 'Equipamento';
        const ptsUnit = getPontosUnitarios(eqNome);
        return {
          id: it.id,
          numeroOS: it.ordemServico?.numeroOS || 1000,
          clienteNome: it.ordemServico?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações',
          equipamentoNome: eqNome,
          quantidade: it.quantidade,
          pontosTotais: Number((it.quantidade * ptsUnit).toFixed(1)),
          prioridade: it.ordemServico?.prioridade || 'MEDIA',
          status: it.statusItem,
        };
      });
    }
  }


  // Montar bancadas ao vivo
  const bancadas: BancadaStatus[] = baseBancadas.map((b) => {
    // 1. Procurar produção ativa para este técnico
    const ativa = producoesAtivasList.find((p) => {
      const tId = p.tecnicoId || p.tecnico?.id;
      const tNome = p.tecnico?.nome;
      return isTecnicoMatch(tId, tNome, b.id, b.nome) || isTecnicoMatch(tId, tNome, b.tecId, b.nome);
    });

    let producaoAtivaPayload: BancadaStatus['producaoAtiva'] = null;

    if (ativa) {
      const itemOS = ativa.itemOrdemServico;
      const eqNome = itemOS?.tipoEquipamento?.nome || 'Equipamento em Manutenção';
      const qtd = ativa.quantidadeProduzida || itemOS?.quantidade || 1;
      const ptsUnit = getPontosUnitarios(eqNome);
      const dInicio = ativa.dataInicio ? new Date(ativa.dataInicio) : agora;
      const diffMin = Math.max(1, Math.floor((agora.getTime() - dInicio.getTime()) / 60000));

      producaoAtivaPayload = {
        id: ativa.id,
        numeroOS: itemOS?.ordemServico?.numeroOS || 1001,
        clienteNome: itemOS?.ordemServico?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações',
        equipamentoNome: eqNome,
        quantidade: qtd,
        pontosTotais: Number((qtd * ptsUnit).toFixed(1)),
        dataInicio: dInicio.toISOString(),
        tempoDecorridoMinutos: diffMin,
      };
    }

    // 2. Calcular pontos produzidos hoje por este técnico
    let ptsHoje = 0;
    for (const fin of producoesFinalizadasHoje) {
      const tId = fin.tecnicoId || fin.tecnico?.id;
      const tNome = fin.tecnico?.nome;
      if (isTecnicoMatch(tId, tNome, b.id, b.nome) || isTecnicoMatch(tId, tNome, b.tecId, b.nome)) {
        const eqNome = fin.itemOrdemServico?.tipoEquipamento?.nome || '';
        const qtd = fin.quantidadeProduzida || 1;
        const ptsUnit = getPontosUnitarios(eqNome);
        ptsHoje += qtd * ptsUnit;
      }
    }

    return {
      tecnicoId: b.tecId,
      tecnicoNome: b.nome,
      funcao: b.funcao,
      status: ativa ? 'EM_PRODUCAO' : 'DISPONIVEL',
      producaoAtiva: producaoAtivaPayload,
      pontosHoje: Number(ptsHoje.toFixed(1)),
    };
  });

  // 3. FPY Hoje
  let totalTestados = 0;
  let reprovados = 0;
  for (const t of testesHojeList) {
    totalTestados += t.quantidadeTestada || 0;
    reprovados += t.quantidadeReprovada || 0;
  }
  const aprovadosPrimeiraVez = Math.max(0, totalTestados - reprovados);
  const fpyPercentual =
    totalTestados > 0 ? Number(((aprovadosPrimeiraVez / totalTestados) * 100).toFixed(1)) : 100.0;

  return {
    timestamp: agora.toISOString(),
    meta: metaInfo,
    bancadas,
    fpyHoje: {
      fpyPercentual,
      totalTestados,
      aprovadosPrimeiraVez,
      reprovados,
    },
    filaPrioritaria: filaPrioritariaList,
  };
}

// ─── Agregação para o Dashboard Gerencial ─────────────────────────────────────
export async function getGerencialData(periodo: string = 'mes_atual'): Promise<GerencialData> {
  const tvData = await getTvFabricaData();

  const produtividadeTecnicos: ProdutividadeTecnico[] = tvData.bancadas.map((b) => {
    const totalPts = tvData.meta.pontosRealizados || 1;
    const pts = b.pontosHoje || 0;
    return {
      tecnicoId: b.tecnicoId,
      tecnicoNome: b.tecnicoNome,
      funcao: b.funcao,
      pesoBonus: b.funcao.includes('Qualidade') ? 0.17 : 0.22,
      pontosRealizados: pts,
      percentualTotal: Number(((pts / totalPts) * 100).toFixed(1)),
      taxaAprovacao: 100.0,
      tempoMedioPorLoteMinutos: 40,
    };
  });

  return {
    periodo,
    faturamentoEstimado: tvData.meta.faturamentoLancado || 0.0,
    totalOsAtivas: tvData.filaPrioritaria.length + tvData.bancadas.filter((b) => b.status === 'EM_PRODUCAO').length,
    pontosTotaisRealizados: tvData.meta.pontosRealizados,
    metaAlvoPeriodo: tvData.meta.metaAlvo,
    fpyGeral: tvData.fpyHoje.fpyPercentual,
    taxaRetrabalho: tvData.meta.taxaRetrabalho,
    leadTimeMedioGeralMinutos: 45,
    distribuicaoDefeitos: [],
    leadTimePorEquipamento: [],
    produtividadeTecnicos,
    producaoHistoricoDias: [],
  };
}

