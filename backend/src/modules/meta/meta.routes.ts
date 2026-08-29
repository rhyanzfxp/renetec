import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { UpdateMetaConfigSchema, UpdateBonusSimulationSchema } from './meta.schema.js';
import * as service from './meta.service.js';

export const metaRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /metas/atual ─────────────────────────────────────────────────────
  // Retorna os dados completos do mês corrente: pontos realizados, metas (Base, Alvo, Excelência),
  // status da qualidade/retrabalho, projeção, multiplicador e rateio de bônus (70/30).
  fastify.get(
    '/metas/atual',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const dados = await service.getMetasAtual();
      return reply.send({ success: true, data: dados });
    }
  );

  // ─── GET /metas/pontuacao ─────────────────────────────────────────────────
  // Retorna a tabela oficial de pontuação de equipamentos e serviços
  fastify.get(
    '/metas/pontuacao',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const tabela = await service.getTabelaPontuacao();
      return reply.send({ success: true, data: tabela });
    }
  );

  // ─── GET /metas/guia ──────────────────────────────────────────────────────
  // Retorna o guia operacional "Como usar a meta Renetec"
  fastify.get(
    '/metas/guia',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const guia = await service.getGuiaComoUsar();
      return reply.send({ success: true, data: guia });
    }
  );

  // ─── GET /metas/historico ─────────────────────────────────────────────────
  // Retorna o histórico de atingimento de metas dos meses anteriores
  fastify.get(
    '/metas/historico',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { ano } = request.query as { ano?: string };
      const historico = await service.getHistoricoMetas(ano ? parseInt(ano) : undefined);
      return reply.send({ success: true, data: historico });
    }
  );

  // ─── PUT /metas/config ────────────────────────────────────────────────────
  // Atualização dos parâmetros de metas pelo Administrador
  fastify.put(
    '/metas/config',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const parsed = UpdateMetaConfigSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'DADOS_INVALIDOS',
            message: parsed.error.issues[0]?.message || 'Dados de meta inválidos.',
            details: parsed.error.issues,
          },
        });
      }

      const atualizado = await service.updateMetaConfig(parsed.data);
      return reply.send({
        success: true,
        message: 'Configuração de metas atualizada com sucesso.',
        data: atualizado,
      });
    }
  );

  // ─── PUT /metas/bonus-simulacao ───────────────────────────────────────────
  // Simulação de faturamento e ajuste de status de metas individuais
  fastify.put(
    '/metas/bonus-simulacao',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const parsed = UpdateBonusSimulationSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'DADOS_INVALIDOS',
            message: parsed.error.issues[0]?.message || 'Dados de simulação inválidos.',
            details: parsed.error.issues,
          },
        });
      }

      const atualizado = await service.updateBonusSimulation(parsed.data);
      return reply.send({
        success: true,
        message: 'Simulação de bônus atualizada com sucesso.',
        data: atualizado,
      });
    }
  );

  // ─── POST /metas/resetar ───────────────────────────────────────────────────
  // Reset administrativo de metas e produções do mês (somente ADMIN)
  fastify.post(
    '/metas/resetar',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const { mesReferencia, anoReferencia, resetarTudo } = (request.body || {}) as {
        mesReferencia?: number;
        anoReferencia?: number;
        resetarTudo?: boolean;
      };

      const resultado = await service.resetarMetas(
        mesReferencia,
        anoReferencia,
        resetarTudo,
        request.user?.id
      );

      return reply.send({
        success: true,
        message: resultado.message || 'Metas e produções resetadas com sucesso.',
        data: resultado,
      });
    }
  );
};
