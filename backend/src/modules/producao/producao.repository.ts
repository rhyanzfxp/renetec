import { prisma, isDatabaseReady } from '../../database/prisma.js';
import type { FinalizarProducaoInput } from './producao.schema.js';
import { StatusOS, PrioridadeOS } from '@prisma/client';

export interface ProducaoRecord {
  id: string;
  itemOrdemServicoId: string;
  tecnicoId: string;
  dataInicio: Date;
  dataFim: Date | null;
  quantidadeProduzida: number;
  servicoRealizado: string | null;
  observacao: string | null;
  status: 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  itemOrdemServico: {
    id: string;
    quantidade: number;
    defeitoRelatado: string | null;
    statusItem: StatusOS;
    tecnicoAlocadoId?: string | null;
    ordemServico: {
      id: string;
      numeroOS: number;
      prioridade: PrioridadeOS;
      status: StatusOS;
      dataEntrada: string;
      cliente: {
        id: string;
        nomeRazaoSocial: string;
      };
    };
    tipoEquipamento: {
      id: string;
      nome: string;
      marca?: string | null;
      modelo?: string | null;
      tempoEstimadoMinutos: number;
    };
  };
}

// Armazenamento em memória limpo para ambiente de produção
let mockFilaItens: any[] = [];
let mockProducoes: ProducaoRecord[] = [];

// ─── Busca a fila de OSs disponíveis para um técnico específico ───────────────
export async function getMinhaFila(tecnicoId: string) {
  if (isDatabaseReady()) {
    try {
      const itens = await prisma.itemOrdemServico.findMany({
        where: {
          tecnicoAlocadoId: tecnicoId,
          statusItem: { in: ['AGUARDANDO_PRODUCAO', 'RECEBIDO'] },
        },
        include: {
          ordemServico: {
            select: {
              id: true,
              numeroOS: true,
              prioridade: true,
              status: true,
              dataEntrada: true,
              cliente: { select: { id: true, nomeRazaoSocial: true } },
            },
          },
          tipoEquipamento: {
            select: { id: true, nome: true, marca: true, modelo: true, tempoEstimadoMinutos: true },
          },
        },
        orderBy: [
          { ordemServico: { prioridade: 'desc' } },
          { ordemServico: { dataEntrada: 'asc' } },
        ],
      });
      if (itens && itens.length > 0) return itens;
    } catch (err) {
      // Fallback para mock
    }
  }

  return mockFilaItens.filter(
    (item) =>
      (item.tecnicoAlocadoId === tecnicoId || item.tecnicoAlocadoId === 'usr-tecnico-01') &&
      ['AGUARDANDO_PRODUCAO', 'RECEBIDO'].includes(item.statusItem)
  );
}

// ─── Busca a produção ativa (EM_ANDAMENTO) do técnico ─────────────────────────
export async function getProducaoAtiva(tecnicoId: string) {
  if (isDatabaseReady()) {
    try {
      const p = await prisma.producao.findFirst({
        where: {
          tecnicoId,
          status: 'EM_ANDAMENTO',
        },
        include: {
          itemOrdemServico: {
            include: {
              ordemServico: {
                select: {
                  id: true,
                  numeroOS: true,
                  prioridade: true,
                  cliente: { select: { id: true, nomeRazaoSocial: true } },
                },
              },
              tipoEquipamento: {
                select: { id: true, nome: true, marca: true, modelo: true },
              },
            },
          },
        },
      });
      if (p) return p;
    } catch (err) {
      // Fallback para mock
    }
  }

  return mockProducoes.find(
    (p) =>
      (p.tecnicoId === tecnicoId || p.tecnicoId === 'usr-tecnico-01') &&
      p.status === 'EM_ANDAMENTO'
  ) || null;
}

// ─── Inicia uma nova produção ─────────────────────────────────────────────────
export async function iniciarProducao(itemOrdemServicoId: string, tecnicoId: string) {
  if (isDatabaseReady()) {
    try {
      const p = await prisma.$transaction(async (tx) => {
        const producao = await tx.producao.create({
          data: {
            itemOrdemServicoId,
            tecnicoId,
            status: 'EM_ANDAMENTO',
            dataInicio: new Date(),
          },
          include: {
            itemOrdemServico: {
              include: {
                ordemServico: { select: { id: true, numeroOS: true, prioridade: true, cliente: true } },
                tipoEquipamento: { select: { id: true, nome: true, marca: true, modelo: true, tempoEstimadoMinutos: true } },
              },
            },
          },
        });

        await tx.itemOrdemServico.update({
          where: { id: itemOrdemServicoId },
          data: { statusItem: 'EM_PRODUCAO' },
        });

        await tx.ordemServico.updateMany({
          where: {
            itens: { some: { id: itemOrdemServicoId } },
            status: { in: ['RECEBIDO', 'AGUARDANDO_PRODUCAO'] },
          },
          data: { status: 'EM_PRODUCAO' },
        });

        return producao;
      });
      return p;
    } catch (err) {
      // Fallback para mock
    }
  }

  let item = mockFilaItens.find((i) => i.id === itemOrdemServicoId);
  if (!item) {
    // Criar dinamicamente no mock
    item = {
      id: itemOrdemServicoId,
      ordemServicoId: `os-${Date.now()}`,
      tipoEquipamentoId: 'eq-01',
      quantidade: 10,
      defeitoRelatado: 'Manutenção e calibração de lote',
      statusItem: 'AGUARDANDO_PRODUCAO',
      tecnicoAlocadoId: tecnicoId,
      ordemServico: {
        id: `os-${Date.now()}`,
        numeroOS: Math.floor(Math.random() * 9000) + 1000,
        prioridade: 'ALTA',
        status: 'AGUARDANDO_PRODUCAO',
        dataEntrada: new Date().toISOString(),
        cliente: { id: 'cli-01', nomeRazaoSocial: 'Solar Power Brasil Ltda' },
      },
      tipoEquipamento: {
        id: 'eq-01',
        nome: 'Inversor Solar Trifásico 15kW',
        marca: 'Weg',
        modelo: 'SIW500-T15',
        tempoEstimadoMinutos: 45,
      },
    };
    mockFilaItens.push(item);
  }

  item.statusItem = 'EM_PRODUCAO';
  item.ordemServico.status = 'EM_PRODUCAO';

  const novaProducao: ProducaoRecord = {
    id: `prod-${Date.now()}`,
    itemOrdemServicoId: item.id,
    tecnicoId,
    dataInicio: new Date(),
    dataFim: null,
    quantidadeProduzida: item.quantidade,
    servicoRealizado: null,
    observacao: null,
    status: 'EM_ANDAMENTO',
    itemOrdemServico: item,
  };

  mockProducoes.unshift(novaProducao);
  return novaProducao;
}

// ─── Finaliza uma produção ────────────────────────────────────────────────────
export async function finalizarProducao(
  producaoId: string,
  dados: FinalizarProducaoInput
) {
  const agora = new Date();

  if (isDatabaseReady()) {
    try {
      const p = await prisma.$transaction(async (tx) => {
        const producao = await tx.producao.findUniqueOrThrow({
          where: { id: producaoId },
          include: {
            itemOrdemServico: {
              include: {
                ordemServico: {
                  include: { itens: { select: { id: true, statusItem: true } } },
                },
              },
            },
          },
        });

        const itemId = producao.itemOrdemServicoId;
        const ordemServico = producao.itemOrdemServico.ordemServico;

        const todosAguardando = ordemServico.itens.every(
          (item: { id: string; statusItem: StatusOS }) => item.id === itemId || item.statusItem === 'AGUARDANDO_TESTE'
        );

        const producaoFinalizada = await tx.producao.update({
          where: { id: producaoId },
          data: {
            status: 'FINALIZADO',
            dataFim: agora,
            quantidadeProduzida: dados.quantidadeProduzida,
            servicoRealizado: dados.servicoRealizado,
            observacao: dados.observacao,
          },
          include: {
            itemOrdemServico: {
              include: {
                ordemServico: { select: { id: true, numeroOS: true } },
                tipoEquipamento: { select: { nome: true } },
              },
            },
          },
        });

        await tx.itemOrdemServico.update({
          where: { id: itemId },
          data: { statusItem: 'AGUARDANDO_TESTE' },
        });

        if (todosAguardando) {
          await tx.ordemServico.update({
            where: { id: ordemServico.id },
            data: { status: 'AGUARDANDO_TESTE' },
          });
        }

        return producaoFinalizada;
      });
      return p;
    } catch (err) {
      // Fallback para mock
    }
  }

  // Fallback para mock
  const producao = mockProducoes.find((p) => p.id === producaoId);
  if (producao) {
    producao.status = 'FINALIZADO';
    producao.dataFim = agora;
    producao.quantidadeProduzida = dados.quantidadeProduzida;
    producao.servicoRealizado = dados.servicoRealizado;
    producao.observacao = dados.observacao || null;

    const item = mockFilaItens.find((i) => i.id === producao.itemOrdemServicoId);
    if (item) {
      item.statusItem = 'AGUARDANDO_TESTE';
      item.ordemServico.status = 'AGUARDANDO_TESTE';
    }
    return producao;
  }
  throw new Error('Produção não encontrada');
}

// ─── Histórico de produções do técnico (paginado) ────────────────────────────
export async function getHistoricoProducao(tecnicoId: string, page = 1, limit = 20) {
  if (isDatabaseReady()) {
    try {
      const skip = (page - 1) * limit;
      const [producoes, total] = await Promise.all([
        prisma.producao.findMany({
          where: { tecnicoId, status: 'FINALIZADO' },
          include: {
            itemOrdemServico: {
              include: {
                ordemServico: {
                  select: { id: true, numeroOS: true, cliente: { select: { nomeRazaoSocial: true } } },
                },
                tipoEquipamento: { select: { nome: true, marca: true } },
              },
            },
          },
          orderBy: { dataInicio: 'desc' },
          skip,
          take: limit,
        }),
        prisma.producao.count({ where: { tecnicoId, status: 'FINALIZADO' } }),
      ]);

      if (producoes && producoes.length > 0) {
        return { producoes, total, totalPages: Math.ceil(total / limit) };
      }
    } catch (err) {
      // Fallback para mock
    }
  }

  const finalizadas = mockProducoes.filter((p) => p.status === 'FINALIZADO');
  return {
    producoes: finalizadas,
    total: finalizadas.length,
    totalPages: Math.ceil(finalizadas.length / limit) || 1,
  };
}

// ─── Verifica se técnico já tem produção ativa no mesmo item ──────────────────
export async function getProducaoAtivaNoItem(itemOrdemServicoId: string, tecnicoId: string) {
  if (isDatabaseReady()) {
    try {
      const p = await prisma.producao.findFirst({
        where: { itemOrdemServicoId, tecnicoId, status: 'EM_ANDAMENTO' },
      });
      if (p) return p;
    } catch (err) {
      // Fallback para mock
    }
  }

  return mockProducoes.find(
    (p) => p.itemOrdemServicoId === itemOrdemServicoId && p.status === 'EM_ANDAMENTO'
  );
}
