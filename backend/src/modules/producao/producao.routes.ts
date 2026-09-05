import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { IniciarProducaoSchema, FinalizarProducaoSchema } from './producao.schema.js';
import * as service from './producao.service.js';

interface UserJwtPayload {
  sub: string;
  nome: string;
  email: string;
  perfil: 'ADMIN' | 'TECNICO' | 'QUALIDADE';
}

export const producaoRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /producao/minha-fila ─────────────────────────────────────────────
  // Retorna as OSs disponíveis para o técnico logado iniciar produção
  fastify.get(
    '/producao/minha-fila',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const user = request.user as UserJwtPayload;
      const fila = await service.getMinhaFila(user.sub);
      return reply.send({ success: true, data: fila });
    }
  );

  // ─── GET /producao/minhas-caixas ──────────────────────────────────────────
  // Retorna todas as caixas/OSs trabalhadas recentemente pelo técnico
  fastify.get(
    '/producao/minhas-caixas',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const user = request.user as UserJwtPayload;
      const caixas = await service.getMinhasCaixas(user.sub);
      return reply.send({ success: true, data: caixas });
    }
  );

  // ─── GET /producao/ativa ──────────────────────────────────────────────────
  // Retorna a produção EM_ANDAMENTO do técnico logado (ou null)
  fastify.get(
    '/producao/ativa',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const user = request.user as UserJwtPayload;
      const producaoAtiva = await service.getProducaoAtiva(user.sub);
      return reply.send({ success: true, data: producaoAtiva });
    }
  );

  // ─── POST /producao/iniciar ───────────────────────────────────────────────
  // Inicia um apontamento de produção — timestamp gerado no servidor
  fastify.post(
    '/producao/iniciar',
    { preHandler: [authenticate, authorize(['TECNICO'])] },
    async (request, reply) => {
      const body = IniciarProducaoSchema.parse(request.body);
      const user = request.user as UserJwtPayload;

      try {
        const producao = await service.iniciarProducao(body.itemOrdemServicoId, user.sub);
        return reply.status(201).send({
          success: true,
          message: 'Produção iniciada com sucesso.',
          data: producao,
        });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string; producaoAtiva?: unknown };
        if (e.statusCode === 409) {
          return reply.status(409).send({
            success: false,
            message: e.message,
            data: e.producaoAtiva ?? null,
          });
        }
        throw err;
      }
    }
  );

  // ─── POST /producao/:id/finalizar ─────────────────────────────────────────
  // Finaliza o apontamento e transiciona item para AGUARDANDO_TESTE
  fastify.post(
    '/producao/:id/finalizar',
    { preHandler: [authenticate, authorize(['TECNICO'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = FinalizarProducaoSchema.parse(request.body);
      const user = request.user as UserJwtPayload;

      try {
        const producao = await service.finalizarProducao(id, user.sub, body);
        return reply.send({
          success: true,
          message: 'Produção finalizada! Lote encaminhado para Controle de Qualidade.',
          data: producao,
        });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        if (e.statusCode === 403) {
          return reply.status(403).send({ success: false, message: e.message });
        }
        throw err;
      }
    }
  );

  // ─── POST /producao/pausar ou POST /producao/:id/pausar ──────────────────
  // Pausa a produção ativa e mantém o item na bancada do técnico
  fastify.post(
    '/producao/pausar',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const user = request.user as UserJwtPayload;
      const body = (request.body || {}) as { producaoId?: string; observacao?: string };

      try {
        const pausada = await service.pausarProducao(body.producaoId, user.sub, body.observacao);
        return reply.send({
          success: true,
          message: 'Produção pausada. A OS continua na sua bancada para continuação posterior.',
          data: pausada,
        });
      } catch (err: any) {
        return reply.status(err.statusCode || 400).send({
          success: false,
          message: err.message || 'Erro ao pausar produção.',
        });
      }
    }
  );

  fastify.post(
    '/producao/:id/pausar',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as UserJwtPayload;
      const body = (request.body || {}) as { observacao?: string };

      try {
        const pausada = await service.pausarProducao(id, user.sub, body.observacao);
        return reply.send({
          success: true,
          message: 'Produção pausada. A OS continua na sua bancada para continuação posterior.',
          data: pausada,
        });
      } catch (err: any) {
        return reply.status(err.statusCode || 400).send({
          success: false,
          message: err.message || 'Erro ao pausar produção.',
        });
      }
    }
  );

  // ─── POST /producao/apontamento-lote ─────────────────────────────────────
  // Auto-atendimento do Técnico: Cria OS + Itens e envia direto ao Teste (ou fila)
  fastify.post(
    '/producao/apontamento-lote',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user as UserJwtPayload;
      const { ApontamentoLoteSchema } = await import('./producao.schema.js');
      const body = ApontamentoLoteSchema.parse(request.body);

      try {
        const resultado = await service.apontarLoteTecnico(user.sub, user.nome || 'Técnico', body);
        return reply.status(201).send({
          success: true,
          message: `Lote da OS #${resultado.ordemServico.numeroOS} registrado com sucesso!`,
          data: resultado,
        });
      } catch (err: any) {
        console.error('[apontamento-lote] ERROR DETALHADO:', err);
        return reply.status(400).send({
          success: false,
          message: err.message || 'Erro ao registrar apontamento de lote.',
        });
      }
    }
  );

  // ─── POST /producao/item/:id/despachar-cq ────────────────────────────────
  // Despacha um item de bancada (EM_PRODUCAO) para a fila do Testador (CQ)
  fastify.post(
    '/producao/item/:id/despachar-cq',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as UserJwtPayload;

      try {
        const item = await service.despacharItemParaCQ(id, user.sub, user.nome || 'Técnico');
        return reply.send({
          success: true,
          message: `Lote da OS #${item.ordemServico.numeroOS} (${item.quantidade} un) despachado com sucesso para o Controle de Qualidade!`,
          data: item,
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          message: err.message || 'Erro ao despachar lote para o CQ.',
        });
      }
    }
  );

  // ─── GET /producao/em-andamento ──────────────────────────────────────────
  // Lista todas as OSs em andamento do técnico com histórico e totais separados
  fastify.get(
    '/producao/em-andamento',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const user = request.user as UserJwtPayload;
      const osList = await service.getMinhasOsEmAndamento(user.sub);
      return reply.send({ success: true, data: osList });
    }
  );

  // ─── GET /producao/resumo-hoje ────────────────────────────────────────────
  // Retorna a produção estrita de hoje do técnico logado
  fastify.get(
    '/producao/resumo-hoje',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const user = request.user as UserJwtPayload;
      const resumo = await service.getProducaoHoje(user.sub);
      return reply.send({ success: true, data: resumo });
    }
  );

  // ─── POST /producao/os/:id/concluir ───────────────────────────────────────
  // Conclui a OS definitivamente
  fastify.post(
    '/producao/os/:id/concluir',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { observacao?: string } | undefined;
      const user = request.user as UserJwtPayload;

      try {
        const osConcluida = await service.concluirOrdemServico(
          id,
          user.sub,
          user.nome || 'Técnico',
          body?.observacao
        );
        return reply.send({
          success: true,
          message: `OS #${osConcluida.numeroOS} concluída com sucesso!`,
          data: osConcluida,
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          message: err.message || 'Erro ao concluir OS.',
        });
      }
    }
  );

  // ─── POST /producao/os/:id/despachar-cq ───────────────────────────────────
  // Despacha a OS e todos os itens para a fila de testes do CQ
  fastify.post(
    '/producao/os/:id/despachar-cq',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { observacao?: string } | undefined;
      const user = request.user as UserJwtPayload;

      try {
        const osDespachada = await service.despacharOrdemServicoParaCQ(
          id,
          user.sub,
          user.nome || 'Técnico',
          body?.observacao
        );
        return reply.send({
          success: true,
          message: `OS #${osDespachada.numeroOS} enviada com sucesso para a fila de testes do CQ!`,
          data: osDespachada,
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          message: err.message || 'Erro ao despachar OS para o CQ.',
        });
      }
    }
  );

  // ─── DELETE /producao/os/:id ──────────────────────────────────────────────
  // Exclui uma OS incorreta/errada lançada por engano
  fastify.delete(
    '/producao/os/:id',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as UserJwtPayload;

      try {
        const deleted = await service.excluirOrdemServico(id, user.sub);
        return reply.send({
          success: true,
          message: `Ordem de Serviço #${deleted.numeroOS} excluída com sucesso!`,
          data: deleted,
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          message: err.message || 'Erro ao excluir OS.',
        });
      }
    }
  );


  // ─── GET /producao/historico ──────────────────────────────────────────────
  // Histórico de produções do técnico logado
  fastify.get(
    '/producao/historico',
    { preHandler: [authenticate, authorize(['TECNICO', 'ADMIN'])] },
    async (request, reply) => {
      const user = request.user as UserJwtPayload;
      const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };

      const resultado = await service.getHistoricoProducao(
        user.sub,
        parseInt(page),
        parseInt(limit)
      );

      return reply.send({
        success: true,
        data: resultado.producoes,
        meta: {
          total: resultado.total,
          page: parseInt(page),
          totalPages: resultado.totalPages,
        },
      });
    }
  );
};


