import type { StatusOS } from '../../types/auth';

export interface ClienteOption {
  id: string;
  nomeRazaoSocial: string;
  documento?: string;
  contatoTelefone?: string;
  email?: string;
}

export interface TipoEquipamentoOption {
  id: string;
  nome: string;
  marca?: string;
  modelo?: string;
  tempoEstimadoMinutos?: number;
  pontos?: number;
}

export interface TecnicoOption {
  id: string;
  nome: string;
  email: string;
  funcao?: string;
}

export interface ItemOsData {
  id: string;
  tipoEquipamento: {
    id: string;
    nome: string;
    marca?: string | null;
    modelo?: string | null;
    pontos?: number;
  };
  quantidade: number;
  defeitoRelatado: string | null;
  statusItem: StatusOS;
  tecnicoAlocado: {
    id: string;
    nome: string;
  } | null;
}

export interface OrdemServicoData {
  id: string;
  numeroOS: number;
  dataEntrada: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  status: StatusOS;
  valorOrcamento: number | null;
  observacoes: string | null;
  cliente: {
    id: string;
    nomeRazaoSocial: string;
    contatoTelefone?: string | null;
    email?: string | null;
  };
  itens: ItemOsData[];
  createdAt: string;
}

export interface CreateOsPayload {
  clienteId: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  valorOrcamento?: number;
  observacoes?: string;
  itens: {
    tipoEquipamentoId: string;
    quantidade: number;
    defeitoRelatado: string;
    tecnicoAlocadoId?: string;
  }[];
}

export interface CreateClientePayload {
  nomeRazaoSocial: string;
  documento?: string;
  contatoTelefone?: string;
  email?: string;
  endereco?: string;
}


