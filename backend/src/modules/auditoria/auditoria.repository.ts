import { prisma, isDatabaseReady } from '../../database/prisma.js';

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

export interface AuditLogRecord {
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
  criadoEm: Date;
}

// Mock em memória para desenvolvimento
const mockLogs: AuditLogRecord[] = [];

// ─── Registrar evento de auditoria ───────────────────────────────────────────
export async function registrarAuditLog(dados: Omit<AuditLogRecord, 'id' | 'criadoEm'>) {
  const log: AuditLogRecord = {
    ...dados,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    criadoEm: new Date(),
  };

  // Adiciona no mock em memória SEMPRE (fallback e desenvolvimento)
  mockLogs.unshift(log);
  if (mockLogs.length > 500) mockLogs.pop(); // Limitar buffer

  // Tentar persistir no banco (silencioso se falhar)
  if (isDatabaseReady()) {
    try {
      await prisma.auditLog.create({
        data: {
          acao: dados.acao,
          usuarioId: dados.usuarioId,
          usuarioNome: dados.usuarioNome,
          usuarioPerfil: dados.usuarioPerfil,
          entidade: dados.entidade,
          entidadeId: dados.entidadeId,
          descricao: dados.descricao,
          detalhes: dados.detalhes ? JSON.stringify(dados.detalhes) : null,
          ip: dados.ip,
        },
      });
    } catch {
      // Falha silenciosa — log já está em memória
    }
  }

  return log;
}

// ─── Buscar histórico de auditoria com filtros ────────────────────────────────
export async function getAuditLogs(filtros: {
  acao?: AuditAcao;
  usuarioId?: string;
  entidade?: string;
  page?: number;
  limit?: number;
}) {
  const page = filtros.page || 1;
  const limit = filtros.limit || 50;

  if (isDatabaseReady()) {
    try {
      const where: any = {};
      if (filtros.acao) where.acao = filtros.acao;
      if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
      if (filtros.entidade) where.entidade = filtros.entidade;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { criadoEm: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        data: logs.map((l) => ({
          ...l,
          detalhes: l.detalhes ? JSON.parse(l.detalhes as string) : null,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch {
      // Fallback para mock
    }
  }

  // Filtrar mock em memória
  let resultado = [...mockLogs];
  if (filtros.acao) resultado = resultado.filter((l) => l.acao === filtros.acao);
  if (filtros.usuarioId) resultado = resultado.filter((l) => l.usuarioId === filtros.usuarioId);
  if (filtros.entidade) resultado = resultado.filter((l) => l.entidade === filtros.entidade);

  const total = resultado.length;
  const paginado = resultado.slice((page - 1) * limit, page * limit);

  return {
    data: paginado,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
