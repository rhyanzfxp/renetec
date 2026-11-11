import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { RealizarTesteSchema, EditarTesteSchema } from './teste.schema.js';
import * as service from './teste.service.js';

interface UserJwtPayload {
  sub: string;
  nome: string;
  email: string;
  perfil: 'ADMIN' | 'TECNICO' | 'QUALIDADE';
}

export const qualidadeRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /qualidade/motivos ───────────────────────────────────────────────
  // Catálogo de motivos de não-conformidade
  fastify.get(
    '/qualidade/motivos',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const motivos = await service.getMotivosReprovacao();
      return reply.send({ success: true, data: motivos });
    }
  );

  // ─── GET /qualidade/fila ──────────────────────────────────────────────────
  // Fila de equipamentos aguardando inspeção do CQ
  fastify.get(
    '/qualidade/fila',
    { preHandler: [authenticate, authorize(['QUALIDADE', 'ADMIN'])] },
    async (request, reply) => {
      const fila = await service.getFilaTestes();
      return reply.send({ success: true, data: fila });
    }
  );

  // ─── POST /qualidade/testar ───────────────────────────────────────────────
  // Realiza a inspeção do lote com aprovação ou reprovação para retrabalho
  fastify.post(
    '/qualidade/testar',
    { preHandler: [authenticate, authorize(['QUALIDADE', 'ADMIN'])] },
    async (request, reply) => {
      const parsed = RealizarTesteSchema.safeParse(request.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || 'Dados de inspeção inválidos.';
        return reply.status(400).send({
          success: false,
          message: errorMsg,
          error: {
            code: 'DADOS_INVALIDOS',
            message: errorMsg,
            details: parsed.error.issues,
          },
        });
      }

      const body = parsed.data;
      const user = request.user as UserJwtPayload;

      try {
        const teste = await service.realizarTeste(user.sub, body);
        return reply.status(201).send({
          success: true,
          message:
            body.quantidadeReprovada > 0
              ? `Teste concluído: ${body.quantidadeAprovada} aprovados (reparados) e ${body.quantidadeReprovada} encaminhados para retrabalho.`
              : `Lote concluído! ${body.quantidadeAprovada} peças reparadas aprovadas contabilizadas para a meta.`,
          data: teste,
        });
      } catch (err: any) {
        request.log.error(err);
        const statusCode = err.statusCode || (err.status ? Number(err.status) : 400);
        return reply.status(statusCode).send({
          success: false,
          message: err.message || 'Erro ao processar laudo de inspeção do CQ.',
        });
      }
    }
  );

  // ─── GET /qualidade/historico ─────────────────────────────────────────────
  // Histórico de inspeções realizadas
  fastify.get(
    '/qualidade/historico',
    { preHandler: [authenticate, authorize(['QUALIDADE', 'ADMIN'])] },
    async (request, reply) => {
      const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
      const resultado = await service.getHistoricoTestes(parseInt(page), parseInt(limit));
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

  // ─── PATCH /qualidade/testes/:id ──────────────────────────────────────────
  // Corrige técnico de reparo e/ou observação de um laudo já registrado
  fastify.patch(
    '/qualidade/testes/:id',
    { preHandler: [authenticate, authorize(['QUALIDADE', 'ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = EditarTesteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'DADOS_INVALIDOS',
            message: parsed.error.issues[0]?.message || 'Dados de edição inválidos.',
            details: parsed.error.issues,
          },
        });
      }
      const user = request.user as UserJwtPayload;
      try {
        const teste = await service.editarTeste(user.sub, id, parsed.data);
        return reply.send({ success: true, message: 'Laudo corrigido com sucesso.', data: teste });
      } catch (err: any) {
        request.log.error(err);
        const statusCode = err.statusCode || (err.status ? Number(err.status) : 400);
        return reply.status(statusCode).send({
          success: false,
          message: err.message || 'Erro ao processar laudo de inspeção do CQ.',
        });
      }
    }
  );
};
