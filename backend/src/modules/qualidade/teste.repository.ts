import { prisma, isDatabaseReady } from '../../database/prisma.js';
import { ensureUsuarioDbId } from '../../database/db-utils.js';
import type { RealizarTesteInput } from './teste.schema.js';
import { StatusOS, CategoriaReprovacao } from '@prisma/client';

export interface MotivoReprovacaoRecord {
  id: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaReprovacao;
  ativo: boolean;
}

export interface TesteRecord {
  id: string;
  producaoId: string;
  inspetorId: string;
  quantidadeTestada: number;
  quantidadeAprovada: number;
  quantidadeReprovada: number;
  dataTeste: Date;
  observacao: string | null;
  inspetor: {
    id: string;
    nome: string;
  };
  producao: {
    id: string;
    itemOrdemServico: {
      id: string;
      quantidade: number;
      ordemServico: {
        id: string;
        numeroOS: number;
        cliente: {
          nomeRazaoSocial: string;
        };
      };
      tipoEquipamento: {
        nome: string;
        marca?: string | null;
      };
    };
  };
}

// ─── Listar motivos de reprovação ─────────────────────────────────────────────
export async function getMotivosReprovacao(): Promise<MotivoReprovacaoRecord[]> {
  if (!isDatabaseReady()) return [];

  try {
    const motivos = await prisma.motivoReprovacao.findMany({
      where: { ativo: true },
      orderBy: { codigo: 'asc' },
    });
    return motivos as MotivoReprovacaoRecord[];
  } catch (err) {
    console.error('[getMotivosReprovacao] Erro ao buscar motivos no Supabase:', err);
    return [];
  }
}

// ─── Listar fila de itens aguardando teste de CQ ───────────────────────────────
export async function getFilaTestes() {
  if (!isDatabaseReady()) return [];

  try {
    const itens = await prisma.itemOrdemServico.findMany({
      where: { statusItem: { in: ['AGUARDANDO_TESTE', 'AGUARDANDO_NOVO_TESTE'] } },
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
          select: { id: true, nome: true, marca: true, modelo: true },
        },
        tecnicoAlocado: {
          select: { id: true, nome: true },
        },
        producoes: {
          where: { status: 'FINALIZADO' },
          orderBy: { dataFim: 'desc' },
          take: 1,
          select: { id: true, servicoRealizado: true, quantidadeProduzida: true, dataFim: true },
        },
        retrabalhos: {
          where: { status: 'CONCLUIDO' },
          orderBy: { dataFim: 'desc' },
          take: 1,
          select: { id: true, solucaoAplicada: true, quantidadeRetrabalho: true, dataFim: true },
        },
      },
      orderBy: [
        { ordemServico: { prioridade: 'desc' } },
        { ordemServico: { dataEntrada: 'asc' } },
      ],
    });

    return itens.map((it) => {
      const prodRecente = it.producoes?.[0];
      const retRecente = it.retrabalhos?.[0];

      return {
        id: it.id,
        ordemServicoId: it.ordemServicoId,
        tipoEquipamentoId: it.tipoEquipamentoId,
        quantidade: it.quantidade,
        defeitoRelatado: it.defeitoRelatado,
        servicoRealizado: retRecente?.solucaoAplicada || prodRecente?.servicoRealizado || it.servicoRealizado || 'Reparo concluído',
        statusItem: it.statusItem,
        tecnicoAlocadoId: it.tecnicoAlocadoId,
        tecnicoAlocado: it.tecnicoAlocado,
        ordemServico: it.ordemServico,
        tipoEquipamento: it.tipoEquipamento,
        producoes: it.producoes,
      };
    });
  } catch (err) {
    console.error('[getFilaTestes] Erro ao buscar fila de testes no Supabase:', err);
    return [];
  }
}

// ─── Realizar Teste de Qualidade com Validação Invariável ─────────────────────
export async function realizarTeste(
  inspetorId: string,
  dados: RealizarTesteInput
) {
  const agora = new Date();
  const temReprovacao = dados.quantidadeReprovada > 0;
  const novoStatusItem: StatusOS = temReprovacao ? 'RETRABALHO' : 'APROVADO';

  if (!isDatabaseReady()) {
    throw new Error('Banco de dados indisponível no momento.');
  }

  const inspetorDbId = await ensureUsuarioDbId(inspetorId, 'QUALIDADE');
  const tecnicoRespDbId = dados.tecnicoResponsavelId
    ? await ensureUsuarioDbId(dados.tecnicoResponsavelId, 'TECNICO')
    : null;

  const resultado = await prisma.$transaction(async (tx) => {
    // 0. Garantir que a produção existe no DB (ou buscar a mais recente)
    let producaoDbId = dados.producaoId;
    const producaoExiste = await tx.producao.findUnique({ where: { id: producaoDbId } });
    if (!producaoExiste) {
      const prodMaisRecente = await tx.producao.findFirst({
        where: { itemOrdemServicoId: dados.itemOrdemServicoId },
        orderBy: { dataInicio: 'desc' },
      });
      if (prodMaisRecente) {
        producaoDbId = prodMaisRecente.id;
      } else {
        const novaProd = await tx.producao.create({
          data: {
            itemOrdemServicoId: dados.itemOrdemServicoId,
            tecnicoId: tecnicoRespDbId || inspetorDbId,
            dataInicio: agora,
            dataFim: agora,
            quantidadeProduzida: dados.quantidadeTestada,
            status: 'FINALIZADO',
            servicoRealizado: 'Produção apontada',
          },
        });
        producaoDbId = novaProd.id;
      }
    }

    // 1. Criar o registro do Teste
    const teste = await tx.teste.create({
      data: {
        producaoId: producaoDbId,
        inspetorId: inspetorDbId,
        quantidadeTestada: dados.quantidadeTestada,
        quantidadeAprovada: dados.quantidadeAprovada,
        quantidadeReprovada: dados.quantidadeReprovada,
        observacao: dados.observacao,
        dataTeste: agora,
      },
      include: {
        inspetor: { select: { id: true, nome: true } },
        producao: {
          include: {
            itemOrdemServico: {
              include: {
                ordemServico: { select: { id: true, numeroOS: true, cliente: { select: { nomeRazaoSocial: true } } } },
                tipoEquipamento: { select: { nome: true, marca: true } },
              },
            },
          },
        },
      },
    });

    // 2. Se houver unidades reprovadas, gerar automaticamente o Retrabalho
    if (temReprovacao) {
      let motivoId = dados.motivoReprovacaoId;
      if (motivoId) {
        const m = await tx.motivoReprovacao.findUnique({ where: { id: motivoId } });
        if (!m) {
          const firstM = await tx.motivoReprovacao.findFirst();
          motivoId = firstM?.id || null;
        }
      }

      await tx.retrabalho.create({
        data: {
          testeId: teste.id,
          itemOrdemServicoId: dados.itemOrdemServicoId,
          motivoReprovacaoId: motivoId,
          tecnicoResponsavelId: tecnicoRespDbId,
          quantidadeRetrabalho: dados.quantidadeReprovada,
          detalhesDefeito: dados.detalhesDefeito || dados.observacao || 'Não conformidade detectada no CQ',
          status: 'PENDENTE',
          dataInicio: agora,
        },
      });
    }

    // 3. Atualizar status do Item da OS
    await tx.itemOrdemServico.update({
      where: { id: dados.itemOrdemServicoId },
      data: { statusItem: novoStatusItem },
    });

    // 4. Atualizar status da OS pai se todos os itens foram concluídos
    const itemDb = await tx.itemOrdemServico.findUnique({
      where: { id: dados.itemOrdemServicoId },
      select: {
        ordemServicoId: true,
        ordemServico: {
          select: {
            id: true,
            itens: { select: { id: true, statusItem: true } },
          },
        },
      },
    });

    if (itemDb?.ordemServico) {
      const todosAprovados = itemDb.ordemServico.itens.every(
        (it) => (it.id === dados.itemOrdemServicoId ? novoStatusItem === 'APROVADO' : it.statusItem === 'APROVADO')
      );
      const temAlgumRetrabalho = itemDb.ordemServico.itens.some(
        (it) => (it.id === dados.itemOrdemServicoId ? novoStatusItem === 'RETRABALHO' : it.statusItem === 'RETRABALHO')
      );

      const statusOsFinal: StatusOS = temAlgumRetrabalho ? 'RETRABALHO' : (todosAprovados ? 'APROVADO' : novoStatusItem);

      await tx.ordemServico.update({
        where: { id: itemDb.ordemServicoId },
        data: { status: statusOsFinal },
      });
    }

    return teste;
  });

  return resultado;
}

// ─── Histórico de Testes de CQ (paginado) ────────────────────────────────────
export async function getHistoricoTestes(page = 1, limit = 20) {
  if (!isDatabaseReady()) {
    return { data: [], total: 0, page, totalPages: 0 };
  }

  try {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.teste.findMany({
        include: {
          inspetor: { select: { id: true, nome: true } },
          producao: {
            include: {
              itemOrdemServico: {
                include: {
                  ordemServico: { select: { id: true, numeroOS: true, prioridade: true } },
                  tipoEquipamento: { select: { id: true, nome: true, marca: true, modelo: true } },
                },
              },
            },
          },
        },
        orderBy: { dataTeste: 'desc' },
        skip,
        take: limit,
      }),
      prisma.teste.count(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.error('[getHistoricoTestes] Erro ao consultar histórico no Supabase:', err);
    return { data: [], total: 0, page, totalPages: 0 };
  }
}

