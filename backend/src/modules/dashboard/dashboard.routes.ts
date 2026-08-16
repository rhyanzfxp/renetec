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
  // Dados executivos para o Admin e Qualidade
  fastify.get(
    '/dashboard/gerencial',
    { preHandler: [authenticate, authorize(['ADMIN', 'QUALIDADE'])] },
    async (request, reply) => {
      const { periodo = 'mes_atual' } = request.query as { periodo?: string };
      const data = await service.getGerencialData(periodo);
      return reply.send({ success: true, data });
    }
  );
};
