export type MetaStatusType = 'META_EXCELENCIA' | 'META_ALVO' | 'META_BASE' | 'ABAIXO_DA_META';
export type QualidadeStatusType = 'SEM_DADOS' | 'DENTRO_DA_META' | 'ACIMA_DO_LIMITE';

export interface ColaboradorBonusItem {
  id: string;
  nome: string;
  funcao: string;
  pesoBonus: number;
  pesoBonusPercentual: number;
  pontosRealizados: number;
  percentualTotal: number;
  metaIndividualCumprida: boolean;
  bonusColetivo: number;
  bonusIndividual: number;
  bonusTotal: number;
}

export interface MetaAtualData {
  mesReferencia: number;
  anoReferencia: number;
  nomeMes: string;
  // Pontos
  pontosRealizados: number;
  metaBase: number;
  metaAlvo: number;
  metaExcelencia: number;
  isPeriodoPiloto: boolean;
  // Status Semânticos
  statusMeta: MetaStatusType;
  statusMetaLabel: string;
  statusQualidade: QualidadeStatusType;
  statusQualidadeLabel: string;
  taxaRetrabalho: number;
  limiteRetrabalhoPct: number;
  totalRetrabalho: number;
  totalLancamentos: number;
  // Ritmo e Projeção
  diasUteisTotais: number;
  diasUteisDecorridos: number;
  diasUteisRestantes: number;
  ritmoAtual: number;
  projecaoFechamento: number;
  faltamParaBase: number;
  faltamParaAlvo: number;
  faltamParaExcelencia: number;
  ritmoNecessarioBase: number;
  ritmoNecessarioAlvo: number;
  ritmoNecessarioExcelencia: number;
  percentualBase: number;
  percentualAlvo: number;
  percentualExcelencia: number;
  // Bônus e Faturamento
  faturamentoLancado: number;
  faturamentoRecebido: number;
  faturamentoBaseCalculo: number;
  percentualFundoBonus: number;
  fundoPotencial: number;
  multiplicadorBonus: number;
  bonusFinal: number;
  parteColetivaTotal: number;
  parteIndividualTotal: number;
  // Equipe
  equipe: ColaboradorBonusItem[];
}

export interface TabelaPontuacaoItem {
  id: string;
  equipamentoServico: string;
  pontos: number;
  observacao: string;
}

export interface GuiaComoUsarItem {
  etapa: number;
  quando: string;
  oQueFazer: string;
}

export interface HistoricoMetaItem {
  mes: number;
  ano: number;
  metaBase: number;
  metaAlvo: number;
  metaExcelencia: number;
  pontosRealizados: number;
  atingido: string;
  percentualAlvo: number;
  faturamento: number;
  bonusDistribuido: number;
}

export interface UpdateMetaPayload {
  metaBase?: number;
  metaAlvo?: number;
  metaExcelencia?: number;
  isPeriodoPiloto?: boolean;
  metaPilotoMinima?: number;
  metaPilotoAlvo?: number;
  metaPilotoExcelencia?: number;
  retrabalhoMaximo?: number;
  percentualFundoBonus?: number;
  percentualColetivo?: number;
  percentualIndividual?: number;
  faturamentoRecebido?: number;
  mesReferencia?: number;
  anoReferencia?: number;
}

export interface UpdateBonusSimulationPayload {
  faturamentoRecebido: number;
  metaIndividualStatus?: Record<string, boolean>;
}
