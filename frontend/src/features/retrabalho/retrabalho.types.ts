import type { StatusOS, PrioridadeOS } from '../../types/auth';

export interface RetrabalhoItemData {
  id: string;
  testeId: string;
  itemOrdemServicoId: string;
  quantidadeRetrabalho: number;
  detalhesDefeito: string | null;
  solucaoAplicada: string | null;
  dataInicio: string;
  dataFim: string | null;
  status: 'PENDENTE' | 'EM_EXECUCAO' | 'CONCLUIDO';
  motivoReprovacao?: {
    id: string;
    codigo: string;
    descricao: string;
    categoria: string;
  } | null;
  tecnicoResponsavel?: {
    id: string;
    nome: string;
  } | null;
  itemOrdemServico: {
    id: string;
    quantidade: number;
    defeitoRelatado: string | null;
    statusItem: StatusOS;
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
    tipoEquipamento: {
      id: string;
      nome: string;
      marca?: string | null;
      modelo?: string | null;
    };
  };
}

export interface ConcluirRetrabalhoPayload {
  solucaoAplicada: string;
  observacao?: string;
}

export interface HistoricoRetrabalhoItem {
  id: string;
  quantidadeRetrabalho: number;
  solucaoAplicada: string | null;
  detalhesDefeito: string | null;
  dataInicio: string;
  dataFim: string | null;
  status: string;
  tecnicoResponsavel?: {
    nome: string;
  } | null;
  motivoReprovacao?: {
    codigo: string;
    descricao: string;
  } | null;
  itemOrdemServico: {
    ordemServico: {
      numeroOS: number;
      cliente: {
        nomeRazaoSocial: string;
      };
    };
    tipoEquipamento: {
      nome: string;
    };
  };
}
