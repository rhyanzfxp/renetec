import { prisma, isDatabaseReady } from '../../database/prisma.js';
import { ensureUsuarioDbId, getTecnicoAliasIds, isValidUuid } from '../../database/db-utils.js';
import { CreateOsInput } from './os.schema.js';
import { StatusOS, PrioridadeOS } from '@prisma/client';

export interface OsListItem {
  id: string;
  numeroOS: number;
  dataEntrada: string;
  prioridade: PrioridadeOS;
  status: StatusOS;
  valorOrcamento: number | null;
  observacoes: string | null;
  cliente: {
    id: string;
    nomeRazaoSocial: string;
    contatoTelefone: string | null;
    email: string | null;
  };
  itens: {
    id: string;
    tipoEquipamento: {
      id: string;
      nome: string;
      marca: string | null;
      modelo: string | null;
    };
    quantidade: number;
    tipoCategoria?: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO';
    defeitoRelatado: string | null;
    servicoRealizado?: string | null;
    statusItem: StatusOS;
    tecnicoAlocado: {
      id: string;
      nome: string;
    } | null;
  }[];
  createdAt: string;
}

export class OsRepository {
  async list(filters: {
    search?: string;
    status?: string;
    tecnicoId?: string;
    clienteId?: string;
    page: number;
    limit: number;
  }): Promise<{ items: OsListItem[]; total: number }> {
    if (!isDatabaseReady()) {
      return { items: [], total: 0 };
    }

    try {
      const where: any = {};
      if (filters.status && filters.status !== 'TODOS') {
        where.status = filters.status;
      }
      if (filters.clienteId) {
        where.clienteId = filters.clienteId;
      }
      if (filters.tecnicoId) {
        const aliasIds = await getTecnicoAliasIds(filters.tecnicoId);
        where.itens = {
          some: {
            OR: [
              { tecnicoAlocadoId: { in: aliasIds } },
              { tecnicoAlocado: { nome: { contains: filters.tecnicoId.replace(/usr-|colab-/g, ''), mode: 'insensitive' } } },
            ],
          },
        };
      }
      if (filters.search) {
        const num = parseInt(filters.search);
        where.OR = [
          ...(isNaN(num) ? [] : [{ numeroOS: num }]),
          { cliente: { nomeRazaoSocial: { contains: filters.search, mode: 'insensitive' } } },
          { itens: { some: { tipoEquipamento: { nome: { contains: filters.search, mode: 'insensitive' } } } } },
        ];
      }

      const total = await prisma.ordemServico.count({ where });
      const records = await prisma.ordemServico.findMany({
        where,
        include: {
          cliente: true,
          itens: {
            include: {
              tipoEquipamento: true,
              tecnicoAlocado: true,
            },
          },
        },
        orderBy: { dataEntrada: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      });

      const items: OsListItem[] = records.map((r) => ({
        id: r.id,
        numeroOS: r.numeroOS,
        dataEntrada: r.dataEntrada.toISOString(),
        prioridade: r.prioridade,
        status: r.status,
        valorOrcamento: r.valorOrcamento ? Number(r.valorOrcamento) : null,
        observacoes: r.observacoes,
        cliente: {
          id: r.cliente.id,
          nomeRazaoSocial: r.cliente.nomeRazaoSocial,
          contatoTelefone: r.cliente.contatoTelefone,
          email: r.cliente.email,
        },
        itens: r.itens.map((it) => ({
          id: it.id,
          tipoEquipamento: {
            id: it.tipoEquipamento.id,
            nome: it.tipoEquipamento.nome,
            marca: it.tipoEquipamento.marca,
            modelo: it.tipoEquipamento.modelo,
          },
          quantidade: it.quantidade,
          defeitoRelatado: it.defeitoRelatado,
          statusItem: it.statusItem,
          tecnicoAlocado: it.tecnicoAlocado
            ? { id: it.tecnicoAlocado.id, nome: it.tecnicoAlocado.nome }
            : null,
        })),
        createdAt: r.createdAt.toISOString(),
      }));

      return { items, total };
    } catch (err) {
      console.error('[OsRepository.list] Erro ao buscar OSs no Supabase:', err);
      return { items: [], total: 0 };
    }
  }

  async findById(id: string): Promise<OsListItem | null> {
    if (!isDatabaseReady()) return null;

    try {
      const num = parseInt(id);
      const r = await prisma.ordemServico.findFirst({
        where: isNaN(num) ? { id } : { OR: [{ id }, { numeroOS: num }] },
        include: {
          cliente: true,
          itens: {
            include: {
              tipoEquipamento: true,
              tecnicoAlocado: true,
            },
          },
        },
      });

      if (!r) return null;

      return {
        id: r.id,
        numeroOS: r.numeroOS,
        dataEntrada: r.dataEntrada.toISOString(),
        prioridade: r.prioridade,
        status: r.status,
        valorOrcamento: r.valorOrcamento ? Number(r.valorOrcamento) : null,
        observacoes: r.observacoes,
        cliente: {
          id: r.cliente.id,
          nomeRazaoSocial: r.cliente.nomeRazaoSocial,
          contatoTelefone: r.cliente.contatoTelefone,
          email: r.cliente.email,
        },
        itens: r.itens.map((it) => ({
          id: it.id,
          tipoEquipamento: {
            id: it.tipoEquipamento.id,
            nome: it.tipoEquipamento.nome,
            marca: it.tipoEquipamento.marca,
            modelo: it.tipoEquipamento.modelo,
          },
          quantidade: it.quantidade,
          defeitoRelatado: it.defeitoRelatado,
          statusItem: it.statusItem,
          tecnicoAlocado: it.tecnicoAlocado
            ? { id: it.tecnicoAlocado.id, nome: it.tecnicoAlocado.nome }
            : null,
        })),
        createdAt: r.createdAt.toISOString(),
      };
    } catch (err) {
      console.error('[OsRepository.findById] Erro ao buscar OS por ID no Supabase:', err);
      return null;
    }
  }

  async create(data: CreateOsInput, clientesMap: any, tiposEquipMap: any, tecnicosMap: any): Promise<OsListItem> {
    const dataRegistro = data.dataEntrada ? new Date(data.dataEntrada) : new Date();
    const initialStatus = (data.status as StatusOS) || 'RECEBIDO';

    // 1. Resolver Cliente no banco
    let clienteDb = await prisma.cliente.findFirst({
      where: isValidUuid(data.clienteId)
        ? { OR: [{ id: data.clienteId }, { nomeRazaoSocial: { contains: 'MARANET', mode: 'insensitive' } }] }
        : { nomeRazaoSocial: { contains: 'MARANET', mode: 'insensitive' } },
    });

    if (!clienteDb) {
      const cliInfo = clientesMap[data.clienteId || 'cli-01'] || {
        nomeRazaoSocial: 'MARANET Telecomunicações',
        documento: '12.345.678/0001-90',
        contatoTelefone: '(98) 98765-4321',
        email: 'operacoes@maranet.com.br',
      };
      clienteDb = await prisma.cliente.create({
        data: {
          nomeRazaoSocial: cliInfo.nomeRazaoSocial,
          documento: cliInfo.documento || null,
          contatoTelefone: cliInfo.contatoTelefone || null,
          email: cliInfo.email || null,
        },
      });
    }

    // 2. Resolver Tipos de Equipamento no banco
    const tiposDbMap: Record<string, string> = {};
    for (const it of data.itens) {
      if (tiposDbMap[it.tipoEquipamentoId]) continue;
      const equipInfo = tiposEquipMap[it.tipoEquipamentoId] || { nome: 'Equipamento Renetec', marca: 'Geral', modelo: 'Padrão' };
      let tipoDb = await prisma.tipoEquipamento.findFirst({
        where: isValidUuid(it.tipoEquipamentoId)
          ? {
              OR: [
                { id: it.tipoEquipamentoId },
                { nome: { contains: equipInfo.nome.split('/')[0].trim(), mode: 'insensitive' } },
              ],
            }
          : { nome: { contains: equipInfo.nome.split('/')[0].trim(), mode: 'insensitive' } },
      });
      if (!tipoDb) {
        tipoDb = await prisma.tipoEquipamento.create({
          data: {
            nome: equipInfo.nome,
            marca: equipInfo.marca || 'Geral',
            modelo: equipInfo.modelo || 'Padrão',
            tempoEstimadoMinutos: equipInfo.tempoEstimadoMinutos || 45,
          },
        });
      }
      tiposDbMap[it.tipoEquipamentoId] = tipoDb.id;
    }

    // 3. Resolver Técnicos no banco
    const tecnicosDbMap: Record<string, string | null> = {};
    for (const it of data.itens) {
      if (it.tecnicoAlocadoId && !tecnicosDbMap[it.tecnicoAlocadoId]) {
        const tecInfo = tecnicosMap[it.tecnicoAlocadoId];
        tecnicosDbMap[it.tecnicoAlocadoId] = await ensureUsuarioDbId(
          it.tecnicoAlocadoId || tecInfo?.nome,
          'TECNICO'
        );
      }
    }

    // 4. Criar OS no banco
    const osDb = await prisma.ordemServico.create({
      data: {
        ...(data.numeroOS ? { numeroOS: Number(data.numeroOS) } : {}),
        clienteId: clienteDb.id,
        prioridade: (data.prioridade as PrioridadeOS) || 'MEDIA',
        status: initialStatus,
        dataEntrada: dataRegistro,
        valorOrcamento: data.valorOrcamento || null,
        observacoes: data.observacoes || null,
        itens: {
          create: data.itens.map((it) => ({
            tipoEquipamentoId: tiposDbMap[it.tipoEquipamentoId],
            quantidade: it.quantidade,
            defeitoRelatado: it.defeitoRelatado || 'Manutenção técnica realizada',
            statusItem: initialStatus,
            tecnicoAlocadoId: it.tecnicoAlocadoId ? tecnicosDbMap[it.tecnicoAlocadoId] : null,
          })),
        },
      },
      include: {
        cliente: true,
        itens: {
          include: {
            tipoEquipamento: true,
            tecnicoAlocado: true,
          },
        },
      },
    });

    return {
      id: osDb.id,
      numeroOS: osDb.numeroOS,
      dataEntrada: osDb.dataEntrada.toISOString(),
      prioridade: osDb.prioridade,
      status: osDb.status,
      valorOrcamento: osDb.valorOrcamento ? Number(osDb.valorOrcamento) : null,
      observacoes: osDb.observacoes,
      cliente: {
        id: osDb.cliente.id,
        nomeRazaoSocial: osDb.cliente.nomeRazaoSocial,
        contatoTelefone: osDb.cliente.contatoTelefone,
        email: osDb.cliente.email,
      },
      itens: osDb.itens.map((it) => ({
        id: it.id,
        tipoEquipamento: {
          id: it.tipoEquipamento.id,
          nome: it.tipoEquipamento.nome,
          marca: it.tipoEquipamento.marca,
          modelo: it.tipoEquipamento.modelo,
        },
        quantidade: it.quantidade,
        defeitoRelatado: it.defeitoRelatado,
        statusItem: it.statusItem,
        tecnicoAlocado: it.tecnicoAlocado
          ? { id: it.tecnicoAlocado.id, nome: it.tecnicoAlocado.nome }
          : null,
      })),
      createdAt: osDb.createdAt.toISOString(),
    };
  }

  async updateStatus(id: string, newStatus: StatusOS, observacao?: string): Promise<OsListItem | null> {
    if (!isDatabaseReady()) return null;

    try {
      const num = parseInt(id);
      const osExistente = await prisma.ordemServico.findFirst({
        where: isNaN(num) ? { id } : { OR: [{ id }, { numeroOS: num }] },
      });

      if (!osExistente) return null;

      const r = await prisma.ordemServico.update({
        where: { id: osExistente.id },
        data: {
          status: newStatus,
          itens: {
            updateMany: {
              where: {},
              data: { statusItem: newStatus },
            },
          },
        },
        include: {
          cliente: true,
          itens: {
            include: {
              tipoEquipamento: true,
              tecnicoAlocado: true,
            },
          },
        },
      });

      return {
        id: r.id,
        numeroOS: r.numeroOS,
        dataEntrada: r.dataEntrada.toISOString(),
        prioridade: r.prioridade,
        status: r.status,
        valorOrcamento: r.valorOrcamento ? Number(r.valorOrcamento) : null,
        observacoes: r.observacoes,
        cliente: {
          id: r.cliente.id,
          nomeRazaoSocial: r.cliente.nomeRazaoSocial,
          contatoTelefone: r.cliente.contatoTelefone,
          email: r.cliente.email,
        },
        itens: r.itens.map((it) => ({
          id: it.id,
          tipoEquipamento: {
            id: it.tipoEquipamento.id,
            nome: it.tipoEquipamento.nome,
            marca: it.tipoEquipamento.marca,
            modelo: it.tipoEquipamento.modelo,
          },
          quantidade: it.quantidade,
          defeitoRelatado: it.defeitoRelatado,
          statusItem: it.statusItem,
          tecnicoAlocado: it.tecnicoAlocado
            ? { id: it.tecnicoAlocado.id, nome: it.tecnicoAlocado.nome }
            : null,
        })),
        createdAt: r.createdAt.toISOString(),
      };
    } catch (err) {
      console.error('[OsRepository.updateStatus] Erro ao atualizar status no Supabase:', err);
      return null;
    }
  }
}

export const osRepository = new OsRepository();
