import { prisma, isDatabaseReady } from '../../database/prisma.js';
import { ensureUsuarioDbId } from '../../database/db-utils.js';

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

// ─── Registrar evento de auditoria ───────────────────────────────────────────
export async function registrarAuditLog(dados: Omit<AuditLogRecord, 'id' | 'criadoEm'>) {
  if (isDatabaseReady()) {
    try {
      const usuarioDbId = dados.usuarioId ? await ensureUsuarioDbId(dados.usuarioId) : null;

      const log = await prisma.auditoriaLog.create({
        data: {
          usuarioId: usuarioDbId,
          entidade: dados.entidade || 'geral',
          registroId: dados.entidadeId || '0',
          acao: dados.acao,
          dadosNovos: {
            descricao: dados.descricao,
            usuarioNome: dados.usuarioNome,
            usuarioPerfil: dados.usuarioPerfil,
            ...(dados.detalhes || {}),
          },
          ipAddress: dados.ip || null,
        },
      });

      return {
        id: log.id.toString(),
        acao: dados.acao,
        usuarioId: dados.usuarioId,
        usuarioNome: dados.usuarioNome,
        usuarioPerfil: dados.usuarioPerfil,
        entidade: dados.entidade,
        entidadeId: dados.entidadeId,
        descricao: dados.descricao,
        detalhes: dados.detalhes,
        ip: dados.ip,
        criadoEm: log.createdAt,
      };
    } catch (err) {
      console.error('[registrarAuditLog] Erro ao gravar log de auditoria no Supabase:', err);
    }
  }

  return {
    id: `log-${Date.now()}`,
    ...dados,
    criadoEm: new Date(),
  };
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

  if (!isDatabaseReady()) {
    return { data: [], total: 0, page, totalPages: 0 };
  }

  try {
    const where: any = {};
    if (filtros.acao) where.acao = filtros.acao;
    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.entidade) where.entidade = filtros.entidade;

    const [logs, total] = await Promise.all([
      prisma.auditoriaLog.findMany({
        where,
        include: { usuario: { select: { id: true, nome: true, perfil: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditoriaLog.count({ where }),
    ]);

    return {
      data: logs.map((l) => ({
        id: l.id.toString(),
        acao: l.acao as AuditAcao,
        usuarioId: l.usuarioId,
        usuarioNome: l.usuario?.nome || null,
        usuarioPerfil: l.usuario?.perfil || null,
        entidade: l.entidade,
        entidadeId: l.registroId,
        descricao: (l.dadosNovos as any)?.descricao || `${l.acao} em ${l.entidade}`,
        detalhes: l.dadosNovos as Record<string, unknown> | null,
        ip: l.ipAddress,
        criadoEm: l.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.error('[getAuditLogs] Erro ao consultar logs de auditoria no Supabase:', err);
    return { data: [], total: 0, page, totalPages: 0 };
  }
}
