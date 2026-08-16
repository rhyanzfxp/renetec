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

// ─── Agregação para a TV da Fábrica ──────────────────────────────────────────
export async function getTvFabricaData(): Promise<TvFabricaData> {
  const agora = new Date();

  return {
    timestamp: agora.toISOString(),
    meta: {
      mesNome: agora.toLocaleString('pt-BR', { month: 'long' }),
      ano: agora.getFullYear(),
      pontosRealizados: 0,
      metaBase: 250,
      metaAlvo: 300,
      metaExcelencia: 350,
      statusMeta: 'ABAIXO_DA_META',
      statusMetaLabel: '🔴 ABAIXO DA META',
      percentualAlvo: 0.0,
      ritmoAtual: 0.0,
      projecaoFechamento: 0,
      diasUteisRestantes: 22,
      faturamentoLancado: 0.0,
      taxaRetrabalho: 0.0,
      statusQualidadeLabel: 'Sem dados',
    },
    bancadas: [
      {
        tecnicoId: 'colab-joas',
        tecnicoNome: 'Joás',
        funcao: 'Produção',
        status: 'DISPONIVEL',
        producaoAtiva: null,
        pontosHoje: 0.0,
      },
      {
        tecnicoId: 'colab-samuel',
        tecnicoNome: 'Samuel',
        funcao: 'Produção',
        status: 'DISPONIVEL',
        producaoAtiva: null,
        pontosHoje: 0.0,
      },
      {
        tecnicoId: 'colab-joao',
        tecnicoNome: 'João',
        funcao: 'Produção',
        status: 'DISPONIVEL',
        producaoAtiva: null,
        pontosHoje: 0.0,
      },
      {
        tecnicoId: 'colab-rhyan',
        tecnicoNome: 'Rhyan',
        funcao: 'Qualidade/Testes',
        status: 'DISPONIVEL',
        producaoAtiva: null,
        pontosHoje: 0.0,
      },
    ],
    fpyHoje: {
      fpyPercentual: 100.0,
      totalTestados: 0,
      aprovadosPrimeiraVez: 0,
      reprovados: 0,
    },
    filaPrioritaria: [],
  };
}

// ─── Agregação para o Dashboard Gerencial ─────────────────────────────────────
export async function getGerencialData(periodo: string = 'mes_atual'): Promise<GerencialData> {
  return {
    periodo,
    faturamentoEstimado: 0.0,
    totalOsAtivas: 0,
    pontosTotaisRealizados: 0,
    metaAlvoPeriodo: 300,
    fpyGeral: 100.0,
    taxaRetrabalho: 0.0,
    leadTimeMedioGeralMinutos: 0,
    distribuicaoDefeitos: [],
    leadTimePorEquipamento: [],
    produtividadeTecnicos: [
      {
        tecnicoId: 'colab-joas',
        tecnicoNome: 'Joás',
        funcao: 'Produção',
        pesoBonus: 0.22,
        pontosRealizados: 0,
        percentualTotal: 0.0,
        taxaAprovacao: 100.0,
        tempoMedioPorLoteMinutos: 0,
      },
      {
        tecnicoId: 'colab-joao',
        tecnicoNome: 'João',
        funcao: 'Produção',
        pesoBonus: 0.22,
        pontosRealizados: 0,
        percentualTotal: 0.0,
        taxaAprovacao: 100.0,
        tempoMedioPorLoteMinutos: 0,
      },
      {
        tecnicoId: 'colab-samuel',
        tecnicoNome: 'Samuel',
        funcao: 'Produção',
        pesoBonus: 0.22,
        pontosRealizados: 0,
        percentualTotal: 0.0,
        taxaAprovacao: 100.0,
        tempoMedioPorLoteMinutos: 0,
      },
      {
        tecnicoId: 'colab-rhyan',
        tecnicoNome: 'Rhyan',
        funcao: 'Qualidade/Testes',
        pesoBonus: 0.17,
        pontosRealizados: 0,
        percentualTotal: 0.0,
        taxaAprovacao: 100.0,
        tempoMedioPorLoteMinutos: 0,
      },
      {
        tecnicoId: 'colab-luana',
        tecnicoNome: 'Luana',
        funcao: 'Atendimento/Comercial',
        pesoBonus: 0.17,
        pontosRealizados: 0,
        percentualTotal: 0.0,
        taxaAprovacao: 100.0,
        tempoMedioPorLoteMinutos: 0,
      },
    ],
    producaoHistoricoDias: [],
  };
}
