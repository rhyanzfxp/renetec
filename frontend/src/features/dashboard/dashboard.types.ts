import type { PrioridadeOS } from '../../types/auth';

export interface BancadaStatusData {
  tecnicoId: string;
  tecnicoNome: string;
  funcao?: string;
  status: 'EM_PRODUCAO' | 'DISPONIVEL' | 'EM_PAUSA';
  producaoAtiva?: {
    id: string;
    numeroOS: number;
    clienteNome: string;
    equipamentoNome: string;
    quantidade: number;
    pontosTotais?: number;
    dataInicio: string;
    tempoDecorridoMinutos: number;
  } | null;
  pontosHoje?: number;
  produzidosHoje?: number;
}

export interface TvFabricaResponse {
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
    faturamentoLancado?: number;
    taxaRetrabalho?: number;
    statusQualidadeLabel?: string;
  };
  bancadas: BancadaStatusData[];
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
    pontosTotais?: number;
    prioridade: PrioridadeOS;
    status: string;
  }[];
}

export interface DefeitoDistribuicaoData {
  categoria: string;
  codigo: string;
  motivo: string;
  quantidade: number;
  percentual: number;
}

export interface LeadTimeEquipamentoData {
  tipoEquipamentoNome: string;
  pontosUnitarios?: number;
  quantidadeConcluida: number;
  tempoMedioMinutos: number;
}

export interface ProdutividadeTecnicoData {
  tecnicoId: string;
  tecnicoNome: string;
  funcao?: string;
  pesoBonus?: number;
  pontosRealizados?: number;
  percentualTotal?: number;
  totalProduzido?: number;
  totalAprovadoCQ?: number;
  taxaAprovacao: number;
  tempoMedioPorLoteMinutos: number;
}

export interface GerencialResponse {
  periodo: string;
  faturamentoEstimado: number;
  totalOsAtivas: number;
  pontosTotaisRealizados?: number;
  metaAlvoPeriodo?: number;
  totalItensProduzidos?: number;
  totalItensAprovadosCQ?: number;
  fpyGeral: number;
  taxaRetrabalho: number;
  leadTimeMedioGeralMinutos: number;
  distribuicaoDefeitos: DefeitoDistribuicaoData[];
  leadTimePorEquipamento: LeadTimeEquipamentoData[];
  produtividadeTecnicos: ProdutividadeTecnicoData[];
  producaoHistoricoDias: {
    data: string;
    pontos?: number;
    aprovados?: number;
    reprovados: number;
  }[];
}
