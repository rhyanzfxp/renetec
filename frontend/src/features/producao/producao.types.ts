import type { StatusOS, PrioridadeOS } from '../../types/auth';

export interface FilaItemData {
  id: string;
  ordemServicoId: string;
  quantidade: number;
  defeitoRelatado: string | null;
  statusItem: StatusOS;
  tipoEquipamento: {
    id: string;
    nome: string;
    marca?: string | null;
    modelo?: string | null;
    tempoEstimadoMinutos: number;
  };
  ordemServico: {
    id: string;
    numeroOS: number;
    prioridade: PrioridadeOS;
    status: StatusOS;
    dataEntrada: string;
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
}

export interface ApontamentoLoteItemPayload {
  tipoEquipamentoId: string;
  quantidade: number;
  tipoCategoria: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO';
  defeitoRelatado?: string;
  servicoRealizado?: string;
  numeroSerie?: string;
}

export interface ApontamentoLotePayload {
  numeroOS?: number;
  clienteId?: string;
  dataEntrada?: string;
  prioridade?: PrioridadeOS;
  observacoes?: string;
  enviarDiretoTeste?: boolean;
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

