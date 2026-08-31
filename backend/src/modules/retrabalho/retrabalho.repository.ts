import { prisma, isDatabaseReady } from '../../database/prisma.js';
import { getTecnicoAliasIds, ensureUsuarioDbId } from '../../database/db-utils.js';
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

// ─── Listar fila de retrabalhos pendentes ─────────────────────────────────────
export async function getRetrabalhosPendentes(tecnicoId?: string) {
  if (!isDatabaseReady()) return [];

  try {
    const aliasIds = tecnicoId ? await getTecnicoAliasIds(tecnicoId) : [];

    const where: any = {
      status: { in: ['PENDENTE', 'EM_EXECUCAO'] },
    };
    if (tecnicoId && aliasIds.length > 0) {
      const cleanName = tecnicoId.replace(/usr-|colab-/g, '');
      where.OR = [
        { tecnicoResponsavelId: { in: aliasIds } },
        { tecnicoResponsavel: { nome: { contains: cleanName, mode: 'insensitive' } } },
        { itemOrdemServico: { tecnicoAlocadoId: { in: aliasIds } } },
        { itemOrdemServico: { tecnicoAlocado: { nome: { contains: cleanName, mode: 'insensitive' } } } },
      ];
    }

    const lista = await prisma.retrabalho.findMany({
      where,
      include: {
        motivoReprovacao: true,
        tecnicoResponsavel: { select: { id: true, nome: true } },
        itemOrdemServico: {
          include: {
            tecnicoAlocado: { select: { id: true, nome: true } },
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

    return lista || [];
  } catch (err) {
    console.error('[getRetrabalhosPendentes] Erro ao buscar retrabalhos no Supabase:', err);
    return [];
  }
}

// ─── Iniciar retrabalho por um técnico ─────────────────────────────────────────
export async function iniciarRetrabalho(retrabalhoId: string, tecnicoId: string) {
  if (!isDatabaseReady()) {
    throw new Error('Banco de dados indisponível no momento.');
  }

  const tecDbId = await ensureUsuarioDbId(tecnicoId, 'TECNICO');

  const ret = await prisma.retrabalho.update({
    where: { id: retrabalhoId },
    data: {
      tecnicoResponsavelId: tecDbId,
      status: 'EM_EXECUCAO',
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
}

// ─── Concluir retrabalho e encaminhar para Re-teste ───────────────────────────
export async function concluirRetrabalho(
  retrabalhoId: string,
  dados: ConcluirRetrabalhoInput
) {
  const agora = new Date();

  if (!isDatabaseReady()) {
    throw new Error('Banco de dados indisponível no momento.');
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const ret = await tx.retrabalho.findUniqueOrThrow({
      where: { id: retrabalhoId },
      include: { itemOrdemServico: true },
    });

    const retFinalizado = await tx.retrabalho.update({
      where: { id: retrabalhoId },
      data: {
        status: 'CONCLUIDO',
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
}

// ─── Histórico de retrabalhos concluídos ───────────────────────────────────────
export async function getHistoricoRetrabalhos(page = 1, limit = 20, tecnicoId?: string) {
  if (!isDatabaseReady()) {
    return { data: [], total: 0, page, totalPages: 0 };
  }

  try {
    const aliasIds = tecnicoId ? await getTecnicoAliasIds(tecnicoId) : [];
    const skip = (page - 1) * limit;

    const where: any = { status: 'CONCLUIDO' };
    if (tecnicoId && aliasIds.length > 0) {
      const cleanName = tecnicoId.replace(/usr-|colab-/g, '');
      where.OR = [
        { tecnicoResponsavelId: { in: aliasIds } },
        { tecnicoResponsavel: { nome: { contains: cleanName, mode: 'insensitive' } } },
        { itemOrdemServico: { tecnicoAlocadoId: { in: aliasIds } } },
        { itemOrdemServico: { tecnicoAlocado: { nome: { contains: cleanName, mode: 'insensitive' } } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.retrabalho.findMany({
        where,
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
        orderBy: { dataFim: 'desc' },
        skip,
        take: limit,
      }),
      prisma.retrabalho.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.error('[getHistoricoRetrabalhos] Erro ao buscar histórico no Supabase:', err);
    return { data: [], total: 0, page, totalPages: 0 };
  }
}
