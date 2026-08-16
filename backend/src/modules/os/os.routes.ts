import { FastifyInstance } from 'fastify';
import { createOsSchema, updateOsStatusSchema, queryOsSchema } from './os.schema.js';
import { osService } from './os.service.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { StatusOS } from '@prisma/client';

export async function osRoutes(app: FastifyInstance) {
  // Lista de Clientes
  app.get('/clientes', { preHandler: [authenticate] }, async (request, reply) => {
    return {
      success: true,
      data: osService.getClientes(),
    };
  });

  // Lista de Tipos de Equipamento
  app.get('/tipos-equipamento', { preHandler: [authenticate] }, async (request, reply) => {
    return {
      success: true,
      data: osService.getTiposEquipamento(),
    };
  });

  // Lista de Técnicos
  app.get('/tecnicos', { preHandler: [authenticate] }, async (request, reply) => {
    return {
      success: true,
      data: osService.getTecnicos(),
    };
  });

  // Listagem de OSs com filtros e busca
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const query = queryOsSchema.parse(request.query);
    const user = request.user as { sub: string; perfil: string };

    // Se o usuário for técnico e não especificar filtro, pode filtrar por ele
    let filterTecnico = query.tecnicoId;
    if (user.perfil === 'TECNICO' && request.url.includes('minhas=true')) {
      filterTecnico = user.sub;
    }

    const { items, total } = await osService.list({
      search: query.search,
      status: query.status,
      tecnicoId: filterTecnico,
      clienteId: query.clienteId,
      page: query.page,
      limit: query.limit,
    });

    return {
      success: true,
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  });

  // Detalhes da OS por ID
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const os = await osService.getById(id);
      return {
        success: true,
        data: os,
      };
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'OS_NAO_ENCONTRADA',
          message: 'Ordem de serviço não localizada.',
        },
      });
    }
  });

  // Cadastro de Nova OS (Restrito a Admin)
  app.post('/', { preHandler: [authenticate, authorize(['ADMIN'])] }, async (request, reply) => {
    const parseResult = createOsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'DADOS_INVALIDOS',
          message: 'Parâmetros de criação da OS inválidos.',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const user = request.user as { sub: string };
    const newOs = await osService.create(parseResult.data, user.sub);

    return reply.status(201).send({
      success: true,
      data: newOs,
      message: `Ordem de Serviço #${newOs.numeroOS} cadastrada com sucesso!`,
    });
  });

  // Atualização de Status da OS
  app.patch('/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateOsStatusSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'DADOS_INVALIDOS',
          message: 'Status inválido.',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const user = request.user as { sub: string };
    try {
      const updated = await osService.updateStatus(
        id,
        parseResult.data.status as StatusOS,
        parseResult.data.observacao,
        user.sub
      );

      return {
        success: true,
        data: updated,
        message: 'Status da OS atualizado com sucesso.',
      };
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'OS_NAO_ENCONTRADA',
          message: 'Ordem de serviço não localizada para atualização.',
        },
      });
    }
  });
}
