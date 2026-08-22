export type PerfilUsuario = 'ADMIN' | 'TECNICO' | 'QUALIDADE';

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type StatusOS =
  | 'RECEBIDO'
  | 'AGUARDANDO_PRODUCAO'
  | 'EM_PRODUCAO'
  | 'AGUARDANDO_TESTE'
  | 'APROVADO'
  | 'REPROVADO'
  | 'RETRABALHO'
  | 'AGUARDANDO_NOVO_TESTE'
  | 'CONCLUIDO'
  | 'AGUARDANDO_PECA'
  | 'AGUARDANDO_CLIENTE'
  | 'SEM_REPARO'
  | 'CANCELADO';

export type NavSection =
  | 'dashboard'
  | 'tv_fabrica'
  | 'minhas_os'
  | 'producao'
  | 'fila_testes'
  | 'retrabalho'
  | 'ordens_servico'
  | 'metas'
  | 'auditoria';

export type PrioridadeOS = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

