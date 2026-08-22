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

  return mockRetrabalhos.filter((r) => {
    const isStatusOk = ['PENDENTE', 'EM_ANDAMENTO', 'EM_EXECUCAO'].includes(r.status);
    if (!isStatusOk) return false;
    if (!tecnicoId) return true;
    return (
      !r.tecnicoResponsavelId ||
      r.tecnicoResponsavelId === tecnicoId ||
      r.tecnicoResponsavelId.toLowerCase().includes(tecnicoId.toLowerCase()) ||
      tecnicoId.toLowerCase().includes(r.tecnicoResponsavelId.toLowerCase())
    );
  });
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

    // 1. Atualizar em mockFilaItens
    const { mockFilaItens } = await import('../producao/producao.repository.js');
    const fIt = mockFilaItens.find((x) => x.id === ret.itemOrdemServicoId);
    if (fIt) {
      fIt.statusItem = 'AGUARDANDO_NOVO_TESTE';
      fIt.quantidade = ret.quantidadeRetrabalho;
      fIt.tipoCategoria = 'RETRABALHO';
      fIt.servicoRealizado = dados.solucaoAplicada || 'Retrabalho efetuado pelo técnico';
      if (fIt.ordemServico) fIt.ordemServico.status = 'AGUARDANDO_NOVO_TESTE';
    }

    // 2. Atualizar em mockOsList
    const { mockOsList } = await import('../os/os.repository.js');
    for (const os of mockOsList) {
      if (os.id === ret.itemOrdemServico.ordemServico?.id || os.numeroOS === ret.itemOrdemServico.ordemServico?.numeroOS) {
        os.status = 'AGUARDANDO_NOVO_TESTE';
        os.itens.forEach((it) => {
          if (it.id === ret.itemOrdemServicoId) {
            it.statusItem = 'AGUARDANDO_NOVO_TESTE';
            it.tipoCategoria = 'RETRABALHO';
            it.servicoRealizado = dados.solucaoAplicada;
          }
        });
      }
    }

    // 3. Atualizar ou adicionar em mockFilaCq
    const { mockFilaCq } = await import('../qualidade/teste.repository.js');
    const existCq = mockFilaCq.find((x) => x.id === ret.itemOrdemServicoId);
    if (existCq) {
      existCq.statusItem = 'AGUARDANDO_NOVO_TESTE';
      existCq.quantidade = ret.quantidadeRetrabalho;
      existCq.tipoCategoria = 'RETRABALHO';
      existCq.servicoRealizado = dados.solucaoAplicada || 'Retrabalho efetuado pelo técnico';
      if (existCq.ordemServico) existCq.ordemServico.status = 'AGUARDANDO_NOVO_TESTE';
    } else {
      mockFilaCq.unshift({
        id: ret.itemOrdemServicoId,
        ordemServicoId: ret.itemOrdemServico.ordemServico.id,
        tipoEquipamentoId: ret.itemOrdemServico.tipoEquipamento.id,
        quantidade: ret.quantidadeRetrabalho,
        tipoCategoria: 'RETRABALHO',
        defeitoRelatado: ret.detalhesDefeito || 'Reprovado em teste anterior',
        servicoRealizado: dados.solucaoAplicada || 'Retrabalho efetuado pelo técnico',
        statusItem: 'AGUARDANDO_NOVO_TESTE',
        tecnicoAlocadoId: ret.tecnicoResponsavelId,
        tecnicoAlocado: ret.tecnicoResponsavel || { id: 'colab-joao', nome: 'João' },
        ordemServico: ret.itemOrdemServico.ordemServico,
        tipoEquipamento: ret.itemOrdemServico.tipoEquipamento,
        producoes: [
          {
            id: `prod-ret-${ret.id}`,
            servicoRealizado: dados.solucaoAplicada || 'Retrabalho concluído',
            quantidadeProduzida: ret.quantidadeRetrabalho,
            dataFim: agora,
          },
        ],
      });
    }

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
