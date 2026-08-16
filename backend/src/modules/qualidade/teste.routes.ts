import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { RealizarTesteSchema } from './teste.schema.js';
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
        return reply.status(400).send({
          success: false,
          error: {
            code: 'DADOS_INVALIDOS',
            message: parsed.error.issues[0]?.message || 'Dados de inspeção inválidos.',
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
              ? `Teste concluído: ${body.quantidadeAprovada} aprovados e ${body.quantidadeReprovada} encaminhados para retrabalho.`
              : `Lote 100% aprovado! ${body.quantidadeAprovada} unidades válidas contabilizadas para a meta.`,
          data: teste,
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
        data: resultado.testes,
        meta: {
          total: resultado.total,
          page: parseInt(page),
          totalPages: resultado.totalPages,
        },
      });
    }
  );
};
