export type AuditAcao =
  | 'OS_CRIADA'
  | 'OS_STATUS_ALTERADO'
  | 'PRODUCAO_INICIADA'
  | 'PRODUCAO_FINALIZADA'
  | 'TESTE_REALIZADO'
  | 'TESTE_APROVADO'
  | 'TESTE_REPROVADO'
  | 'RETRABALHO_INICIADO'
  | 'RETRABALHO_CONCLUIDO'
  | 'META_ATUALIZADA'
  | 'USUARIO_LOGIN'
  | 'CONFIGURACAO_ALTERADA';

export interface AuditLogEntry {
  id: string;
  acao: AuditAcao;
  usuarioId: string | null;
  usuarioNome: string | null;
  usuarioPerfil: string | null;
  entidade: string;
  entidadeId: string | null;
  descricao: string;
  detalhes: Record<string, unknown> | null;
  ip: string | null;
  criadoEm: string;
}

export interface GetAuditLogsResponse {
  success: boolean;
  data: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}
