import type { StatusOS, PrioridadeOS } from '../../types/auth';

export interface FilaItemData {
  id: string;
  ordemServicoId: string;
  quantidade: number;
  quantidadeReparada?: number;
  quantidadeSemDefeito?: number;
  quantidadeSucata?: number;
  totalAcumuladoCaixa?: number;
  anterioresNaCaixa?: number;
  tipoCategoria?: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO';
  servicoRealizado?: string | null;
  producaoId?: string;
  producaoStatus?: string;
  defeitoRelatado: string | null;
  statusItem: StatusOS;
  tipoEquipamento: {
    id: string;
    nome: string;
    marca?: string | null;
    modelo?: string | null;
    tempoEstimadoMinutos: number;
    pontos?: number;
  };
  ordemServico: {
    id: string;
    numeroOS: number;
    prioridade: PrioridadeOS;
    status: StatusOS;
    dataEntrada: string;
    observacoes?: string | null;
    cliente: {
      id: string;
      nomeRazaoSocial: string;
    };
  };
}

export interface ProducaoAtivaData {
  id: string;
  itemOrdemServicoId: string;
  tecnicoId: string;
  dataInicio: string;
  dataFim: string | null;
  quantidadeProduzida: number;
  servicoRealizado: string | null;
  observacao: string | null;
  status: 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  itemOrdemServico: {
    id: string;
    quantidade: number;
    defeitoRelatado: string | null;
    ordemServico: {
      id: string;
      numeroOS: number;
      prioridade: PrioridadeOS;
      cliente: {
        id: string;
        nomeRazaoSocial: string;
      };
    };
    tipoEquipamento: {
      id: string;
      nome: string;
      marca?: string | null;
      modelo?: string | null;
    };
  };
}

export interface FinalizarProducaoPayload {
  quantidadeProduzida: number;
  servicoRealizado: string;
  observacao?: string;
  enviarAoCQ?: boolean;
}

export interface ApontamentoLoteItemPayload {
  tipoEquipamentoId: string;
  quantidade: number;
  quantidadeTotalCaixa?: number;
  quantidadeReparada?: number;
  quantidadeSemDefeito?: number;
  quantidadeSucata?: number;
  quantidadeRestante?: number;
  tipoCategoria: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO';
  defeitoRelatado?: string;
  servicoRealizado?: string;
  numeroSerie?: string;
}

export interface ApontamentoLotePayload {
  numeroOS?: number;
  clienteId?: string;
  dataEntrada?: string;
  dataProducao?: string;
  idempotencyKey?: string;
  prioridade?: PrioridadeOS;
  observacoes?: string;
  enviarDiretoTeste?: boolean;
  iniciarProducaoAoVivo?: boolean;
  modoOperacao?: 'DESPACHAR_CQ' | 'INICIAR_PRODUCAO' | 'SALVAR_BANCADA';
  itens: ApontamentoLoteItemPayload[];
}

export interface ProducaoHistoricoItem {
  id: string;
  dataInicio: string;
  dataFim: string | null;
  quantidadeProduzida: number;
  servicoRealizado: string | null;
  status: string;
  itemOrdemServico: {
    ordemServico: {
      id: string;
      numeroOS: number;
      cliente: {
        nomeRazaoSocial: string;
      };
    };
    tipoEquipamento: {
      nome: string;
      marca?: string | null;
    };
  };
}

export interface OsEmAndamentoEquipamento {
  itemId: string;
  tipoEquipamentoId: string;
  tipoEquipamentoNome: string;
  tipoEquipamentoMarca?: string | null;
  statusItem: StatusOS;
  quantidadePrevista: number;
  totalReparadas: number;
  totalSemDefeito: number;
  totalSucata: number;
  totalAcumulado: number;
  acumuladoReparado?: number;
  hojeReparadas: number;
  hojeSemDefeito: number;
  hojeSucata: number;
  hojeTotal: number;
  historicoDias?: {
    id: string;
    dataProducao: string;
    quantidadeReparada: number;
    quantidadeSemDefeito: number;
    quantidadeSucata: number;
    quantidadeProduzida: number;
    servicoRealizado?: string | null;
    observacao?: string | null;
    tecnicoNome: string;
    status: string;
  }[];
}

export interface OsEmAndamentoData {
  id: string;
  numeroOS: number;
  cliente: {
    id: string;
    nomeRazaoSocial: string;
  };
  clienteNome?: string;
  prioridade: PrioridadeOS;
  status: StatusOS;
  dataCriacao?: string;
  dataEntrada: string;
  dataConclusao?: string | null;
  ultimaAtividade: string;
  observacoes?: string | null;
  totalReparados: number;
  totalGeralReparado?: number;
  totalSemDefeito: number;
  totalGeralSemDefeito?: number;
  totalSucata: number;
  totalGeralSucata?: number;
  totalProcessado: number;
  totalGeralEquipamentos?: number;
  hojeReparados: number;
  hojeSemDefeito: number;
  hojeSucata: number;
  hojeProcessado: number;
  equipamentos: OsEmAndamentoEquipamento[];
  historicoDias?: {
    data: string;
    totalReparado: number;
    totalSemDefeito: number;
    totalSucata: number;
  }[];
}

export interface ProducaoHojeResumo {
  data?: string;
  totalReparados: number;
  totalSemDefeito: number;
  totalSucata: number;
  totalProcessado: number;
  totalPontos: number;
  itensPorOs: {
    producaoId: string;
    numeroOS: number;
    clienteNome: string;
    equipamentoNome: string;
    quantidadeReparada: number;
    quantidadeSemDefeito: number;
    quantidadeSucata: number;
    pontos: number;
    dataProducao: string;
  }[];
}


