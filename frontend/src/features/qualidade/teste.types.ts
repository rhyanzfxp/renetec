import type { StatusOS, PrioridadeOS } from '../../types/auth';

export interface MotivoReprovacaoData {
  id: string;
  codigo: string;
  descricao: string;
  categoria: 'SOLDA' | 'COMPONENTE_QUEIMADO' | 'FALHA_LOGICA' | 'MECANICO' | 'CALIBRACAO' | 'OUTRO';
  ativo: boolean;
}

export interface FilaTesteItem {
  id: string;
  ordemServicoId: string;
  quantidade: number;
  defeitoRelatado: string | null;
  statusItem: StatusOS;
  tecnicoAlocado?: {
    id: string;
    nome: string;
  } | null;
  producoes?: {
    id: string;
    servicoRealizado: string | null;
    quantidadeProduzida: number;
    dataFim: string;
  }[];
  producaoRecente?: {
    id: string;
    servicoRealizado: string | null;
    quantidadeProduzida: number;
    dataFim: string;
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
  tipoEquipamento: {
    id: string;
    nome: string;
    marca?: string | null;
    modelo?: string | null;
  };
}

export interface RealizarTestePayload {
  producaoId: string;
  itemOrdemServicoId: string;
  quantidadeTestada: number;
  quantidadeAprovada: number;
  quantidadeReprovada: number;
  motivoReprovacaoId?: string;
  detalhesDefeito?: string;
  observacao?: string;
}

export interface HistoricoTesteItem {
  id: string;
  quantidadeTestada: number;
  quantidadeAprovada: number;
  quantidadeReprovada: number;
  dataTeste: string;
  observacao: string | null;
  inspetor: {
    nome: string;
  };
  producao: {
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
  };
}
