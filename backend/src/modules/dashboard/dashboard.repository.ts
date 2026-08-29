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
  if (tId1 && tId2 && (tId1.includes(tId2) || tId2.includes(tId1))) return true;

  // Normalização de primeiro nome
  const getPrimeiroNome = (n?: string | null) => {
    if (!n) return '';
    return n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/)[0];
  };

  const p1 = getPrimeiroNome(tNome1);
  const p2 = getPrimeiroNome(tNome2);

  // Match exato por primeiro nome (ex: "joao" === "joao", "joas" === "joas")
  if (p1 && p2 && p1 === p2) return true;

  // Match por nome normalizado
  if (tNome1 && tNome2) {
    const n1 = tNome1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const n2 = tNome2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
  }

  // ID vs Nome normalizado (ex: colab-joao vs João, usr-tecnico-01 vs João)
  const normId1 = (tId1 || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normId2 = (tId2 || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (p2 && normId1.includes(p2)) return true;
  if (p1 && normId2.includes(p1)) return true;

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
      mesNome: metasData.nomeMes || agora.toLocaleString('pt-BR', { month: 'long' }),
      ano: metasData.anoReferencia || agora.getFullYear(),
      pontosRealizados: metasData.pontosRealizados || 0,
      metaBase: metasData.metaBase || 250,
      metaAlvo: metasData.metaAlvo || 300,
      metaExcelencia: metasData.metaExcelencia || 350,
      statusMeta: metasData.statusMeta || 'ABAIXO_DA_META',
      statusMetaLabel: metasData.statusMetaLabel || '🔴 ABAIXO DA META',
      percentualAlvo: metasData.percentualAlvo || 0.0,
      ritmoAtual: metasData.ritmoAtual || 0.0,
      projecaoFechamento: metasData.projecaoFechamento || 0,
      diasUteisRestantes: metasData.diasUteisRestantes || 22,
      faturamentoLancado: metasData.faturamentoLancado || 0.0,
      taxaRetrabalho: metasData.taxaRetrabalho || 0.0,
      statusQualidadeLabel: metasData.statusQualidadeLabel || 'Sem dados',
    };
  } catch (err) {
    console.error('[getTvFabricaData] Erro ao integrar metas:', err);
  }

  // 2. Colaboradores / Bancadas Base
  const baseBancadas = [
    { id: 'usr-tecnico-03', tecId: 'colab-joas', nome: 'Joás', funcao: 'Produção' },
    { id: 'usr-tecnico-02', tecId: 'colab-samuel', nome: 'Samuel', funcao: 'Produção' },
    { id: 'usr-tecnico-01', tecId: 'colab-joao', nome: 'João', funcao: 'Produção' },
    { id: 'usr-qualidade-01', tecId: 'colab-rhyan', nome: 'Rhyan', funcao: 'Qualidade/Testes' },
  ];

  let dbUsersList: any[] = [];
  let producoesAtivasList: any[] = [];
  let producoesFinalizadasHoje: any[] = [];
  let filaPrioritariaList: any[] = [];
  let testesHojeList: any[] = [];

  if (isDatabaseReady()) {
    try {
      const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0);
      const [users, ativas, finalizadas, filaItens, testes] = await Promise.all([
        prisma.usuario.findMany({
          where: { ativo: true },
          orderBy: [{ perfil: 'asc' }, { nome: 'asc' }],
        }),
        prisma.producao.findMany({
          where: { status: 'EM_ANDAMENTO' },
          include: {
            itemOrdemServico: {
              include: {
                ordemServico: { include: { cliente: true } },
                tipoEquipamento: true,
                tecnicoAlocado: true,
              },
            },
            tecnico: true,
          },
          orderBy: { dataInicio: 'desc' },
        }),
        prisma.producao.findMany({
          where: {
            status: 'FINALIZADO',
            dataFim: { gte: inicioDia },
          },
          include: {
            itemOrdemServico: {
              include: { tipoEquipamento: true, tecnicoAlocado: true, ordemServico: { include: { cliente: true } } },
            },
            tecnico: true,
          },
        }),
        prisma.itemOrdemServico.findMany({
          where: { statusItem: { in: ['AGUARDANDO_PRODUCAO', 'RECEBIDO'] } },
          include: {
            ordemServico: { include: { cliente: true } },
            tipoEquipamento: true,
            tecnicoAlocado: true,
          },
          orderBy: [
            { ordemServico: { prioridade: 'desc' } },
            { ordemServico: { dataEntrada: 'asc' } },
          ],
          take: 5,
        }),
        prisma.teste.findMany({
          where: { dataTeste: { gte: inicioDia } },
          include: {
            inspetor: true,
            producao: {
              include: {
                tecnico: true,
                itemOrdemServico: {
                  include: {
                    tipoEquipamento: true,
                    tecnicoAlocado: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      dbUsersList = users;
      producoesAtivasList = ativas;
      producoesFinalizadasHoje = finalizadas;
      testesHojeList = testes;
      filaPrioritariaList = filaItens.map((it) => {
        const ptsUnit = getPontosUnitarios(it.tipoEquipamento?.nome);
        return {
          id: it.id,
          numeroOS: it.ordemServico?.numeroOS || 0,
          clienteNome: it.ordemServico?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações',
          equipamentoNome: it.tipoEquipamento?.nome || 'Equipamento',
          quantidade: it.quantidade,
          pontosTotais: Number((it.quantidade * ptsUnit).toFixed(1)),
          prioridade: it.ordemServico?.prioridade || 'MEDIA',
          status: it.statusItem,
        };
      });
    } catch (err) {
      console.error('[getTvFabricaData] Erro ao consultar dados no Supabase:', err);
    }
  }

  // Montar bancadas ao vivo garantindo usuários reais do banco
  const bancadasSource = dbUsersList.length > 0
    ? dbUsersList
        .filter((u) => u.perfil === 'TECNICO' || u.perfil === 'QUALIDADE' || (u.perfil === 'ADMIN' && u.nome.toLowerCase().includes('admin')))
        .map((u) => ({
          id: u.id,
          tecId: u.id,
          nome: u.nome,
          funcao: u.perfil === 'QUALIDADE' ? 'Qualidade/Testes' : u.perfil === 'ADMIN' ? 'Supervisão' : 'Produção',
        }))
    : baseBancadas;

  const targetBancadas = [...bancadasSource];
  for (const bb of baseBancadas) {
    if (!targetBancadas.some((b) => isTecnicoMatch(b.id, b.nome, bb.id, bb.nome))) {
      targetBancadas.push(bb);
    }
  }

  const bancadas: BancadaStatus[] = targetBancadas.map((b) => {
    // 1. Procurar produção ativa para este técnico
    const ativa = producoesAtivasList.find((p) => {
      const tId = p.tecnicoId || p.tecnico?.id;
      const tNome = p.tecnico?.nome || p.itemOrdemServico?.tecnicoAlocado?.nome;
      const tecAlocId = p.itemOrdemServico?.tecnicoAlocadoId || p.itemOrdemServico?.tecnicoAlocado?.id;
      return (
        isTecnicoMatch(tId, tNome, b.id, b.nome) ||
        isTecnicoMatch(tId, tNome, b.tecId, b.nome) ||
        isTecnicoMatch(tecAlocId, tNome, b.id, b.nome) ||
        isTecnicoMatch(tecAlocId, tNome, b.tecId, b.nome)
      );
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

    // 2. Calcular indicadores e pontos produzidos/testados hoje por este colaborador
    let ptsHoje = 0;
    let qtdTestadaHoje = 0;
    let qtdAprovadaHoje = 0;
    let retrabalhoHoje = 0;

    if (b.funcao.includes('Qualidade') || b.nome.toLowerCase().includes('rhyan')) {
      for (const t of testesHojeList) {
        const inspId = t.inspetorId || t.inspetor?.id;
        const inspNome = t.inspetor?.nome;
        if (
          isTecnicoMatch(inspId, inspNome, b.id, b.nome) ||
          isTecnicoMatch(inspId, inspNome, b.tecId, b.nome) ||
          !t.inspetor
        ) {
          const eqNome = (t as any).producao?.itemOrdemServico?.tipoEquipamento?.nome || '';
          const qtdAprov = t.quantidadeAprovada || 0;
          const qtdTest = t.quantidadeTestada || 1;
          const ptsUnit = getPontosUnitarios(eqNome);
          ptsHoje += (qtdAprov > 0 ? qtdAprov : qtdTest) * ptsUnit;
          qtdTestadaHoje += qtdTest;
          qtdAprovadaHoje += qtdAprov;
          retrabalhoHoje += t.quantidadeReprovada || 0;
        }
      }
    } else {
      for (const t of testesHojeList) {
        const prod = (t as any).producao;
        const tId = prod?.tecnicoId || prod?.tecnico?.id;
        const tNome = prod?.tecnico?.nome || prod?.itemOrdemServico?.tecnicoAlocado?.nome;
        const tecAlocId = prod?.itemOrdemServico?.tecnicoAlocadoId || prod?.itemOrdemServico?.tecnicoAlocado?.id;

        if (
          isTecnicoMatch(tId, tNome, b.id, b.nome) ||
          isTecnicoMatch(tId, tNome, b.tecId, b.nome) ||
          isTecnicoMatch(tecAlocId, tNome, b.id, b.nome) ||
          isTecnicoMatch(tecAlocId, tNome, b.tecId, b.nome)
        ) {
          const eqNome = prod?.itemOrdemServico?.tipoEquipamento?.nome || '';
          const qtdAprov = t.quantidadeAprovada || 0;
          const ptsUnit = getPontosUnitarios(eqNome);
          if (qtdAprov > 0) {
            ptsHoje += qtdAprov * ptsUnit;
          }
          qtdTestadaHoje += t.quantidadeTestada || 0;
          qtdAprovadaHoje += qtdAprov;
          retrabalhoHoje += t.quantidadeReprovada || 0;
        }
      }
    }

    const taxaQualidadeHoje = qtdTestadaHoje > 0 
      ? Number(((qtdAprovadaHoje / qtdTestadaHoje) * 100).toFixed(1)) 
      : 100.0;

    return {
      tecnicoId: b.tecId,
      tecnicoNome: b.nome,
      funcao: b.funcao,
      status: ativa ? 'EM_PRODUCAO' : 'DISPONIVEL',
      producaoAtiva: producaoAtivaPayload,
      pontosHoje: Number(ptsHoje.toFixed(1)),
      quantidadeTestadaHoje: qtdTestadaHoje,
      quantidadeAprovadaHoje: qtdAprovadaHoje,
      retrabalhoHoje,
      taxaQualidadeHoje,
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
