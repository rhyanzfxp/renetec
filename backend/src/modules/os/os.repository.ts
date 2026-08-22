import { prisma, isDatabaseReady } from '../../database/prisma.js';
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

// Armazenamento em memória limpo para ambiente de produção
export let mockOsList: OsListItem[] = [];

let nextOsNumber = 1001;

export class OsRepository {
  async list(filters: {
    search?: string;
    status?: string;
    tecnicoId?: string;
    clienteId?: string;
    page: number;
    limit: number;
  }): Promise<{ items: OsListItem[]; total: number }> {
    if (isDatabaseReady()) {
      try {
        const where: any = {};
      if (filters.status && filters.status !== 'TODOS') {
        where.status = filters.status;
      }
      if (filters.clienteId) {
        where.clienteId = filters.clienteId;
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

        if (records.length > 0) {
          const items = records.map((r) => ({
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
        }
      } catch {
        // Fallback
      }
    }

    // Filtragem no mock
    let filtered = [...mockOsList];

    if (filters.status && filters.status !== 'TODOS') {
      filtered = filtered.filter((os) => os.status === filters.status);
    }

    if (filters.tecnicoId) {
      filtered = filtered.filter((os) =>
        os.itens.some((it) => it.tecnicoAlocado?.id === filters.tecnicoId)
      );
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (os) =>
          os.numeroOS.toString().includes(q) ||
          os.cliente.nomeRazaoSocial.toLowerCase().includes(q) ||
          os.itens.some((it) => it.tipoEquipamento.nome.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const items = filtered.slice(
      (filters.page - 1) * filters.limit,
      filters.page * filters.limit
    );

    return { items, total };
  }

  async findById(id: string): Promise<OsListItem | null> {
    if (isDatabaseReady()) {
      try {
        const r = await prisma.ordemServico.findUnique({
        where: { id },
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

      if (r) {
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
      }
    } catch {
      // Fallback
    }
  }

    const item = mockOsList.find((os) => os.id === id || os.numeroOS.toString() === id);
    return item || null;
  }

  async create(data: CreateOsInput, clientesMap: any, tiposEquipMap: any, tecnicosMap: any): Promise<OsListItem> {
    const newNumero = data.numeroOS ? Number(data.numeroOS) : nextOsNumber++;
    if (data.numeroOS && Number(data.numeroOS) >= nextOsNumber) {
      nextOsNumber = Number(data.numeroOS) + 1;
    }
    const cliente = clientesMap[data.clienteId || 'cli-01'] || {
      id: data.clienteId || 'cli-01',
      nomeRazaoSocial: 'MARANET Telecomunicações',
      contatoTelefone: '(98) 98765-4321',
      email: 'operacoes@maranet.com.br',
    };

    const initialStatus = (data.status as StatusOS) || 'RECEBIDO';
    const dataRegistro = data.dataEntrada ? new Date(data.dataEntrada).toISOString() : new Date().toISOString();

    const newOs: OsListItem = {
      id: `os-${newNumero}-${Date.now()}`,
      numeroOS: newNumero,
      dataEntrada: dataRegistro,
      prioridade: (data.prioridade as PrioridadeOS) || 'MEDIA',
      status: initialStatus,
      valorOrcamento: data.valorOrcamento || null,
      observacoes: data.observacoes || null,
      cliente,
      itens: data.itens.map((it, idx) => {
        const eq = tiposEquipMap[it.tipoEquipamentoId] || {
          id: it.tipoEquipamentoId,
          nome: 'Equipamento Renetec',
          marca: 'Geral',
          modelo: 'Padrão',
        };
        const tec = it.tecnicoAlocadoId ? tecnicosMap[it.tecnicoAlocadoId] : null;
        return {
          id: `item-${newNumero}-${idx + 1}-${Date.now()}`,
          tipoEquipamento: eq,
          quantidade: it.quantidade,
          tipoCategoria: it.tipoCategoria || 'REPARADO',
          defeitoRelatado: it.defeitoRelatado || 'Manutenção técnica realizada',
          servicoRealizado: it.servicoRealizado || null,
          statusItem: initialStatus,
          tecnicoAlocado: tec ? { id: tec.id, nome: tec.nome } : null,
        };
      }),
      createdAt: new Date().toISOString(),
    };

    if (isDatabaseReady()) {
      try {
        await prisma.ordemServico.create({
          data: {
            numeroOS: newNumero,
            clienteId: data.clienteId || 'cli-01',
            prioridade: data.prioridade || 'MEDIA',
            status: initialStatus,
            valorOrcamento: data.valorOrcamento,
            observacoes: data.observacoes,
            itens: {
              create: data.itens.map((it) => ({
                tipoEquipamentoId: it.tipoEquipamentoId,
                quantidade: it.quantidade,
                defeitoRelatado: it.defeitoRelatado,
                statusItem: initialStatus,
                tecnicoAlocadoId: it.tecnicoAlocadoId,
              })),
            },
          },
        });
      } catch {
        // Gravação no mock
      }
    }

    mockOsList.unshift(newOs);
    return newOs;
  }

  async updateStatus(id: string, newStatus: StatusOS, observacao?: string): Promise<OsListItem | null> {
    if (isDatabaseReady()) {
      try {
        await prisma.ordemServico.update({
          where: { id },
          data: { status: newStatus },
        });
      } catch {
        // Mock update
      }
    }

    const item = mockOsList.find((os) => os.id === id || os.numeroOS.toString() === id);
    if (item) {
      item.status = newStatus;
      item.itens.forEach((it) => {
        it.statusItem = newStatus;
      });
      return item;
    }
    return null;
  }
}


export const osRepository = new OsRepository();
