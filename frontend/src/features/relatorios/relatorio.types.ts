// ─── Filtros ──────────────────────────────────────────────────────────────────
export interface FiltrosRelatorio {
  dataInicio?: string;
  dataFim?: string;
  tecnicoId?: string;
  inspetorId?: string;
  clienteId?: string;
  tipoEquipamentoId?: string;
  numeroOS?: string;
}

export type PeriodoRapido = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes_atual' | 'personalizado';

export type TipoRelatorio = 'producao' | 'qualidade' | 'consolidado' | 'retrabalho' | 'clientes';

// ─── Relatório de Produção ─────────────────────────────────────────────────
export interface ItemRelatorioProducao {
  id: string;
  numeroOS: number | null;
  ordemServicoId?: string;
  clienteNome: string;
  tecnicoNome: string;
  tecnicoId?: string;
  tipoEquipamentoNome: string;
  tipoEquipamentoId?: string;
  dataRegistro: string;
  quantidadeProduzida: number;
  quantidadeReparada: number;
  quantidadeSemDefeito: number;
  quantidadeSucata: number;
  totalCaixa: number;
  pontosUnitario: number;
  pontosTotal: number;
  categoria: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO';
  servicoRealizado: string;
  statusOS: string;
}

export interface TotaisProducao {
  totalItens: number;
  totalReparadas: number;
  totalSemDefeito: number;
  totalSucata: number;
  totalProcessadoHoje: number;
  totalPontos: number;
}

export interface ResponseRelatorioProducao {
  totais: TotaisProducao;
  dados: ItemRelatorioProducao[];
}

// ─── Relatório de Qualidade ────────────────────────────────────────────────
export interface ItemRelatorioQualidade {
  id: string;
  numeroOS: number | null;
  ordemServicoId?: string;
  clienteNome: string;
  inspetorNome: string;
  inspetorId?: string;
  tecnicoReparoNome: string;
  tecnicoDestinoRetrabalho: string | null;
  tipoEquipamentoNome: string;
  tipoEquipamentoId?: string;
  dataTeste: string;
  quantidadeTestada: number;
  quantidadeAprovada: number;
  quantidadeReprovada: number;
  motivoReprovacao: string | null;
  categoriaReprovacao: string | null;
  detalhesDefeito: string | null;
  observacao: string | null;
  pontosUnitario: number;
  pontosTotal: number;
  statusAprovacao: 'APROVADO_TOTAL' | 'APROVADO_PARCIAL' | 'REPROVADO_TOTAL';
}

export interface TotaisQualidade {
  totalLaudos: number;
  totalTestadas: number;
  totalAprovadas: number;
  totalReprovadas: number;
  fpy: number;
  totalPontos: number;
}

export interface ResponseRelatorioQualidade {
  totais: TotaisQualidade;
  dados: ItemRelatorioQualidade[];
}

// ─── Relatório de Retrabalho ───────────────────────────────────────────────
export interface ItemRelatorioRetrabalho {
  id: string;
  numeroOS: number | null;
  clienteNome: string;
  tipoEquipamentoNome: string;
  quantidadeRetrabalho: number;
  status: string;
  motivoDescricao: string;
  motivoCategoria: string;
  detalhesDefeito: string;
  tecnicoOrigem: string;
  tecnicoDestino: string;
  inspetorNome: string;
  dataCriacao: string;
  dataInicio: string | null;
  dataFim: string | null;
}

export interface TotaisRetrabalho {
  totalOcorrencias: number;
  totalUnidades: number;
  pendentes: number;
  concluidos: number;
}

export interface ResponseRelatorioRetrabalho {
  totais: TotaisRetrabalho;
  dados: ItemRelatorioRetrabalho[];
}

// ─── Relatório Consolidado ─────────────────────────────────────────────────
export interface ConsolidadoTecnico {
  nome: string;
  totalReparadas: number;
  totalSemDefeito: number;
  totalSucata: number;
  totalLotes: number;
  pontosTotal: number;
  retrabalhosRecebidos: number;
}

export interface ConsolidadoInspetor {
  nome: string;
  totalTestadas: number;
  totalAprovadas: number;
  totalReprovadas: number;
  totalLaudos: number;
  fpy: number;
  pontosTotal: number;
}

export interface TotaisGerais {
  totalReparadas: number;
  totalSemDefeito: number;
  totalSucata: number;
  totalTestadas: number;
  totalAprovadasCQ: number;
  totalRetrabalhoCQ: number;
  fpyGeral: number;
}

export interface ResponseRelatorioConsolidado {
  tecnicos: ConsolidadoTecnico[];
  inspetores: ConsolidadoInspetor[];
  totaisGerais: TotaisGerais;
}

// ─── Relatório por Clientes ────────────────────────────────────────────────
export interface ItemRelatorioCliente {
  clienteNome: string;
  totalReparadas: number;
  totalSemDefeito: number;
  totalSucata: number;
  totalVolumeCaixas: number;
  totalApontamentos: number;
}

export interface TotaisClientes {
  totalClientes: number;
  totalReparadas: number;
  totalSemDefeito: number;
  totalSucata: number;
}

export interface ResponseRelatorioClientes {
  totais: TotaisClientes;
  dados: ItemRelatorioCliente[];
}
