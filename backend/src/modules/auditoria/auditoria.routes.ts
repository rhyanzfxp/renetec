import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { getLogs } from './auditoria.service.js';
import type { AuditAcao } from './auditoria.repository.js';

export const auditoriaRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /auditoria ───────────────────────────────────────────────────────
  // Trilha de auditoria completa (apenas ADMIN)
  fastify.get(
    '/auditoria',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const { acao, usuarioId, entidade, page, limit } = request.query as {
        acao?: AuditAcao;
        usuarioId?: string;
        entidade?: string;
        page?: string;
        limit?: string;
      };

      const resultado = await getLogs({
        acao,
        usuarioId,
        entidade,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
      });

      return reply.send({ success: true, ...resultado });
    }
  );
};
