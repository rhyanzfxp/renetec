import * as repo from './auditoria.repository.js';
import type { AuditAcao } from './auditoria.repository.js';

export interface LogEventoInput {
  acao: AuditAcao;
  usuarioId?: string | null;
  usuarioNome?: string | null;
  usuarioPerfil?: string | null;
  entidade: string;
  entidadeId?: string | null;
  descricao: string;
  detalhes?: Record<string, unknown> | null;
  ip?: string | null;
}

// Função central para registrar qualquer evento auditável
export async function log(input: LogEventoInput) {
  return repo.registrarAuditLog({
    acao: input.acao,
    usuarioId: input.usuarioId ?? null,
    usuarioNome: input.usuarioNome ?? null,
    usuarioPerfil: input.usuarioPerfil ?? null,
    entidade: input.entidade,
    entidadeId: input.entidadeId ?? null,
    descricao: input.descricao,
    detalhes: input.detalhes ?? null,
    ip: input.ip ?? null,
  });
}

// Consulta paginada com filtros
export async function getLogs(filtros: {
  acao?: AuditAcao;
  usuarioId?: string;
  entidade?: string;
  page?: number;
  limit?: number;
}) {
  return repo.getAuditLogs(filtros);
}
