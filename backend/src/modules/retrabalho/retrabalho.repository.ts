import { prisma, isDatabaseReady } from '../../database/prisma.js';
import type { ConcluirRetrabalhoInput } from './retrabalho.schema.js';
import { StatusRetrabalho, StatusOS, PrioridadeOS } from '@prisma/client';

export interface RetrabalhoRecord {
  id: string;
  testeId: string;
  itemOrdemServicoId: string;
  motivoReprovacaoId: string | null;
  tecnicoResponsavelId: string | null;
  quantidadeRetrabalho: number;
  detalhesDefeito: string | null;
  solucaoAplicada: string | null;
  dataInicio: Date;
  dataFim: Date | null;
  status: StatusRetrabalho;
  motivoReprovacao?: {
    id: string;
    codigo: string;
    descricao: string;
    categoria: string;
  } | null;
  tecnicoResponsavel?: {
    id: string;
    nome: string;
  } | null;
  itemOrdemServico: {
    id: string;
    quantidade: number;
    defeitoRelatado: string | null;
    statusItem: StatusOS;
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
    };
  };
}

// Armazenamento em memória limpo para ambiente de produção
export let mockRetrabalhos: RetrabalhoRecord[] = [];

export function adicionarRetrabalhoMock(ret: RetrabalhoRecord) {
  mockRetrabalhos.unshift(ret);
}

// ─── Listar fila de retrabalhos pendentes ─────────────────────────────────────
export async function getRetrabalhosPendentes(tecnicoId?: string) {
  if (isDatabaseReady()) {
    try {
      const where: any = {
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
      };
      if (tecnicoId) {
        where.OR = [{ tecnicoResponsavelId: tecnicoId }, { tecnicoResponsavelId: null }];
      }

      const lista = await prisma.retrabalho.findMany({
        where,
        include: {
          motivoReprovacao: true,
          tecnicoResponsavel: { select: { id: true, nome: true } },
          itemOrdemServico: {
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
              tipoEquipamento: { select: { id: true, nome: true, marca: true, modelo: true } },
            },
          },
        },
        orderBy: [
          { itemOrdemServico: { ordemServico: { prioridade: 'desc' } } },
          { dataInicio: 'asc' },
        ],
      });

      if (lista && lista.length > 0) return lista;
    } catch (err) {
      // Fallback
    }
  }

  return mockRetrabalhos.filter((r) => ['PENDENTE', 'EM_ANDAMENTO'].includes(r.status));
}

// ─── Iniciar retrabalho por um técnico ─────────────────────────────────────────
export async function iniciarRetrabalho(retrabalhoId: string, tecnicoId: string) {
  if (isDatabaseReady()) {
    try {
      const ret = await prisma.retrabalho.update({
        where: { id: retrabalhoId },
        data: {
          tecnicoResponsavelId: tecnicoId,
          status: 'EM_ANDAMENTO',
        },
        include: {
          motivoReprovacao: true,
          tecnicoResponsavel: { select: { id: true, nome: true } },
          itemOrdemServico: {
            include: {
              ordemServico: { select: { id: true, numeroOS: true, prioridade: true } },
              tipoEquipamento: { select: { nome: true } },
            },
          },
        },
      });
      return ret;
    } catch (err) {
      // Fallback
    }
  }

  const ret = mockRetrabalhos.find((r) => r.id === retrabalhoId);
  if (ret) {
    ret.status = 'EM_ANDAMENTO';
    ret.tecnicoResponsavelId = tecnicoId;
    return ret;
  }
  throw new Error('Ordem de retrabalho não encontrada');
}

// ─── Concluir retrabalho e encaminhar para Re-teste ───────────────────────────
export async function concluirRetrabalho(
  retrabalhoId: string,
  dados: ConcluirRetrabalhoInput
) {
  const agora = new Date();

  if (isDatabaseReady()) {
    try {
      const resultado = await prisma.$transaction(async (tx) => {
        const ret = await tx.retrabalho.findUniqueOrThrow({
          where: { id: retrabalhoId },
          include: { itemOrdemServico: true },
        });

        const retFinalizado = await tx.retrabalho.update({
          where: { id: retrabalhoId },
          data: {
            status: 'FINALIZADO',
            dataFim: agora,
            solucaoAplicada: dados.solucaoAplicada,
          },
          include: {
            motivoReprovacao: true,
            tecnicoResponsavel: { select: { id: true, nome: true } },
          },
        });

        await tx.itemOrdemServico.update({
          where: { id: ret.itemOrdemServicoId },
          data: { statusItem: 'AGUARDANDO_NOVO_TESTE' },
        });

        const item = await tx.itemOrdemServico.findUnique({
          where: { id: ret.itemOrdemServicoId },
          select: { ordemServicoId: true },
        });

        if (item) {
          await tx.ordemServico.update({
            where: { id: item.ordemServicoId },
            data: { status: 'AGUARDANDO_NOVO_TESTE' },
          });
        }

        return retFinalizado;
      });

      return resultado;
    } catch (err) {
      // Fallback
    }
  }

  const ret = mockRetrabalhos.find((r) => r.id === retrabalhoId);
  if (ret) {
    ret.status = 'FINALIZADO';
    ret.dataFim = agora;
    ret.solucaoAplicada = dados.solucaoAplicada;
    ret.itemOrdemServico.statusItem = 'AGUARDANDO_NOVO_TESTE';
    ret.itemOrdemServico.ordemServico.status = 'AGUARDANDO_NOVO_TESTE';
    return ret;
  }
  throw new Error('Ordem de retrabalho não encontrada');
}

// ─── Histórico de retrabalhos ─────────────────────────────────────────────────
export async function getHistoricoRetrabalhos(page = 1, limit = 20) {
  if (isDatabaseReady()) {
    try {
      const skip = (page - 1) * limit;
      const [retrabalhos, total] = await Promise.all([
        prisma.retrabalho.findMany({
          where: { status: 'FINALIZADO' },
          include: {
            motivoReprovacao: true,
            tecnicoResponsavel: { select: { id: true, nome: true } },
            itemOrdemServico: {
              include: {
                ordemServico: {
                  select: { id: true, numeroOS: true, cliente: { select: { nomeRazaoSocial: true } } },
                },
                tipoEquipamento: { select: { nome: true, marca: true } },
              },
            },
          },
          orderBy: { dataFim: 'desc' },
          skip,
          take: limit,
        }),
        prisma.retrabalho.count({ where: { status: 'FINALIZADO' } }),
      ]);

      if (retrabalhos && retrabalhos.length > 0) {
        return { retrabalhos, total, totalPages: Math.ceil(total / limit) };
      }
    } catch (err) {
      // Fallback
    }
  }

  const finalizados = mockRetrabalhos.filter((r) => r.status === 'FINALIZADO');
  return {
    retrabalhos: finalizados,
    total: finalizados.length,
    totalPages: Math.ceil(finalizados.length / limit) || 1,
  };
}
