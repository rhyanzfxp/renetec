import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { relatorioService } from './relatorio.service.js';

export const relatorioRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /relatorios/producao ─────────────────────────────────────────────
  fastify.get(
    '/relatorios/producao',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { dataInicio, dataFim, tecnicoId, clienteId, tipoEquipamentoId, numeroOS } =
          request.query as {
            dataInicio?: string;
            dataFim?: string;
            tecnicoId?: string;
            clienteId?: string;
            tipoEquipamentoId?: string;
            numeroOS?: string;
          };

        const data = await relatorioService.getRelatorioProducao({
          dataInicio,
          dataFim,
          tecnicoId,
          clienteId,
          tipoEquipamentoId,
          numeroOS: numeroOS ? parseInt(numeroOS) : undefined,
        });

        return reply.send({ success: true, data });
      } catch (err: any) {
        request.log.error({ err }, 'Erro ao gerar relatório de produção');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'RELATORIO_PRODUCAO_ERROR',
            message: 'Erro ao gerar relatório de produção.',
            details: err?.message,
          },
        });
      }
    }
  );

  // ─── GET /relatorios/qualidade ────────────────────────────────────────────
  fastify.get(
    '/relatorios/qualidade',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { dataInicio, dataFim, inspetorId, tecnicoId, clienteId, tipoEquipamentoId, numeroOS } =
          request.query as {
            dataInicio?: string;
            dataFim?: string;
            inspetorId?: string;
            tecnicoId?: string;
            clienteId?: string;
            tipoEquipamentoId?: string;
            numeroOS?: string;
          };

        const data = await relatorioService.getRelatorioQualidade({
          dataInicio,
          dataFim,
          inspetorId,
          tecnicoId,
          clienteId,
          tipoEquipamentoId,
          numeroOS: numeroOS ? parseInt(numeroOS) : undefined,
        });

        return reply.send({ success: true, data });
      } catch (err: any) {
        request.log.error({ err }, 'Erro ao gerar relatório de qualidade');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'RELATORIO_QUALIDADE_ERROR',
            message: 'Erro ao gerar relatório de Testes & CQ.',
            details: err?.message,
          },
        });
      }
    }
  );

  // ─── GET /relatorios/retrabalho ───────────────────────────────────────────
  fastify.get(
    '/relatorios/retrabalho',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { dataInicio, dataFim, tecnicoId, clienteId } =
          request.query as {
            dataInicio?: string;
            dataFim?: string;
            tecnicoId?: string;
            clienteId?: string;
          };

        const data = await relatorioService.getRelatorioRetrabalhos({
          dataInicio,
          dataFim,
          tecnicoId,
          clienteId,
        });

        return reply.send({ success: true, data });
      } catch (err: any) {
        request.log.error({ err }, 'Erro ao gerar relatório de retrabalhos');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'RELATORIO_RETRABALHO_ERROR',
            message: 'Erro ao gerar relatório de retrabalhos.',
            details: err?.message,
          },
        });
      }
    }
  );

  // ─── GET /relatorios/consolidado ──────────────────────────────────────────
  fastify.get(
    '/relatorios/consolidado',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { dataInicio, dataFim, tecnicoId, inspetorId, clienteId } =
          request.query as {
            dataInicio?: string;
            dataFim?: string;
            tecnicoId?: string;
            inspetorId?: string;
            clienteId?: string;
          };

        const data = await relatorioService.getRelatorioConsolidado({
          dataInicio,
          dataFim,
          tecnicoId,
          inspetorId,
          clienteId,
        });

        return reply.send({ success: true, data });
      } catch (err: any) {
        request.log.error({ err }, 'Erro ao gerar consolidado');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'RELATORIO_CONSOLIDADO_ERROR',
            message: 'Erro ao gerar relatório consolidado.',
            details: err?.message,
          },
        });
      }
    }
  );

  // ─── GET /relatorios/clientes ─────────────────────────────────────────────
  fastify.get(
    '/relatorios/clientes',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { dataInicio, dataFim } =
          request.query as { dataInicio?: string; dataFim?: string };

        const data = await relatorioService.getRelatorioClientes({ dataInicio, dataFim });

        return reply.send({ success: true, data });
      } catch (err: any) {
        request.log.error({ err }, 'Erro ao gerar relatório de clientes');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'RELATORIO_CLIENTES_ERROR',
            message: 'Erro ao gerar relatório por clientes.',
            details: err?.message,
          },
        });
      }
    }
  );
};
