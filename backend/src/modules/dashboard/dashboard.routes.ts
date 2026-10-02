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
        const { periodo = 'mes_atual', mes, ano } = request.query as {
          periodo?: string;
          mes?: string;
          ano?: string;
        };
        const mesNum = mes ? parseInt(mes, 10) : undefined;
        const anoNum = ano ? parseInt(ano, 10) : undefined;
        const data = await service.getGerencialData(periodo, mesNum, anoNum);
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

  // ─── GET /dashboard/meses-disponiveis ─────────────────────────────────────
  // Retorna os meses disponíveis no histórico do sistema
  fastify.get(
    '/dashboard/meses-disponiveis',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const meses = await service.getMesesDisponiveis();
      return reply.send({ success: true, data: meses });
    }
  );

  // ─── GET /dashboard/fechamento-mensal ─────────────────────────────────────
  // Relatório oficial e consolidado do mês fechado (Exclusivo para ADMIN)
  fastify.get(
    '/dashboard/fechamento-mensal',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { mes, ano } = request.query as { mes?: string; ano?: string };
        const mesNum = mes ? parseInt(mes, 10) : undefined;
        const anoNum = ano ? parseInt(ano, 10) : undefined;
        const data = await service.getFechamentoMensal(mesNum, anoNum);
        return reply.send({ success: true, data });
      } catch (err: any) {
        request.log.error({ err }, 'Erro ao gerar fechamento mensal');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'FECHAMENTO_ERROR',
            message: 'Erro ao gerar fechamento mensal.',
            details: err?.message,
          },
        });
      }
    }
  );
};

