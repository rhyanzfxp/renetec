import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { ConcluirRetrabalhoSchema } from './retrabalho.schema.js';
import * as service from './retrabalho.service.js';

interface UserJwtPayload {
  sub: string;
  nome: string;
  email: string;
  perfil: 'ADMIN' | 'TECNICO' | 'QUALIDADE';
}

export const retrabalhoRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /retrabalho/fila ─────────────────────────────────────────────────
  // Lista de ordens de retrabalho pendentes ou em execução
  fastify.get(
    '/retrabalho/fila',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user as UserJwtPayload;
      const tecnicoId = user.perfil === 'TECNICO' ? user.sub : undefined;
      const fila = await service.getRetrabalhosPendentes(tecnicoId);
      return reply.send({ success: true, data: fila });
    }
  );

  // ─── POST /retrabalho/:id/iniciar ─────────────────────────────────────────
  // Inicia a execução do retrabalho pelo técnico
  fastify.post(
    '/retrabalho/:id/iniciar',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as UserJwtPayload;

      try {
        const retrabalho = await service.iniciarRetrabalho(id, user.sub);
        return reply.send({
          success: true,
          message: 'Execução de retrabalho iniciada.',
          data: retrabalho,
        });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        if (e.statusCode) {
          return reply.status(e.statusCode).send({ success: false, message: e.message });
        }
        throw err;
      }
    }
  );

  // ─── POST /retrabalho/:id/concluir ────────────────────────────────────────
  // Conclui o retrabalho e encaminha para Re-teste (AGUARDANDO_NOVO_TESTE)
  fastify.post(
    '/retrabalho/:id/concluir',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = ConcluirRetrabalhoSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'DADOS_INVALIDOS',
            message: parsed.error.issues[0]?.message || 'Dados inválidos.',
            details: parsed.error.issues,
          },
        });
      }

      try {
        const retrabalho = await service.concluirRetrabalho(id, parsed.data);
        return reply.send({
          success: true,
          message: 'Retrabalho concluído com sucesso! Lote encaminhado para Re-teste no CQ.',
          data: retrabalho,
        });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        if (e.statusCode) {
          return reply.status(e.statusCode).send({ success: false, message: e.message });
        }
        throw err;
      }
    }
  );

  // ─── GET /retrabalho/historico ────────────────────────────────────────────
  // Histórico de retrabalhos finalizados
  fastify.get(
    '/retrabalho/historico',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
      const resultado = await service.getHistoricoRetrabalhos(parseInt(page), parseInt(limit));
      return reply.send({
        success: true,
        data: resultado.data || [],
        meta: {
          total: resultado.total || 0,
          page: parseInt(page),
          totalPages: resultado.totalPages || 0,
        },
      });
    }
  );
};
