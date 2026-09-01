import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import * as service from './dashboard.service.js';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /dashboard/tv-fabrica ────────────────────────────────────────────
  // Dados ao vivo para a TV/Telão do chão de fábrica
  fastify.get(
    '/dashboard/tv-fabrica',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const data = await service.getTvFabricaData();
      return reply.send({ success: true, data });
    }
  );

  // ─── GET /dashboard/gerencial ─────────────────────────────────────────────
  // Dados executivos e indicadores gerenciais acessíveis aos usuários autenticados
  fastify.get(
    '/dashboard/gerencial',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { periodo = 'mes_atual' } = request.query as { periodo?: string };
        const data = await service.getGerencialData(periodo);
        return reply.send({ success: true, data });
      } catch (err: any) {
        request.log.error({ err }, 'Erro ao gerar dados do dashboard gerencial');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'DASHBOARD_ERROR',
            message: 'Erro ao consolidar dados gerenciais da fábrica.',
            details: err?.message,
          },
        });
      }
    }
  );
};

