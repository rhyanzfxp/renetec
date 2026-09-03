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
        servicoRealizado: retRecente?.solucaoAplicada || prodRecente?.servicoRealizado || 'Reparo concluído',
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
  const agora = dados.dataTeste ? new Date(dados.dataTeste) : new Date();
  const temReprovacao = dados.quantidadeReprovada > 0;
  const novoStatusItem: StatusOS = temReprovacao ? 'RETRABALHO' : 'APROVADO';

  if (!isDatabaseReady()) {
    throw new Error('Banco de dados indisponível no momento.');
  }

  const inspetorDbId = await ensureUsuarioDbId(inspetorId, 'QUALIDADE');
  let tecnicoRespDbId = dados.tecnicoResponsavelId
    ? await ensureUsuarioDbId(dados.tecnicoResponsavelId, 'TECNICO')
    : null;

  const tecnicoDestinoDbId = dados.tecnicoDestinoId
    ? await ensureUsuarioDbId(dados.tecnicoDestinoId, 'TECNICO')
    : tecnicoRespDbId;

  // Se não veio técnico e veio item da OS, busca o técnico alocado no item
  if (!tecnicoRespDbId && dados.itemOrdemServicoId && dados.itemOrdemServicoId !== 'item-direto') {
    const itemDb = await prisma.itemOrdemServico.findUnique({
      where: { id: dados.itemOrdemServicoId },
      select: { tecnicoAlocadoId: true },
    });
    if (itemDb?.tecnicoAlocadoId) {
      tecnicoRespDbId = itemDb.tecnicoAlocadoId;
    }
  }

  const resultado = await prisma.$transaction(async (tx) => {
    let itemOrdemServicoId = dados.itemOrdemServicoId;
    let producaoDbId = dados.producaoId;

    // A. Apontamento Direto do CQ (sem item pré-existente na fila)
    if (!itemOrdemServicoId || itemOrdemServicoId === 'item-direto') {
      // 1. Garantir cliente padrão
      let clienteDb = await tx.cliente.findFirst();
      if (!clienteDb) {
        clienteDb = await tx.cliente.create({
          data: {
            nomeRazaoSocial: 'MARANET Telecomunicações',
            documento: '00.000.000/0001-00',
          },
        });
      }

      // 2. Garantir tipo de equipamento
      let tipoDb = dados.tipoEquipamentoId
        ? await tx.tipoEquipamento.findUnique({ where: { id: dados.tipoEquipamentoId } })
        : await tx.tipoEquipamento.findFirst();

      if (!tipoDb) {
        tipoDb = await tx.tipoEquipamento.create({
          data: {
            nome: 'Equipamento Geral',
            marca: 'Padrão',
            modelo: 'Geral',
            tempoEstimadoMinutos: 45,
          },
        });
      }

      // 3. Ordem de Serviço
      let osDb: any = null;
      if (dados.numeroOS && Number(dados.numeroOS) > 0) {
        osDb = await tx.ordemServico.findUnique({ where: { numeroOS: Number(dados.numeroOS) } });
      }
      if (!osDb) {
        osDb = await tx.ordemServico.create({
          data: {
            ...(dados.numeroOS && Number(dados.numeroOS) > 0 ? { numeroOS: Number(dados.numeroOS) } : {}),
            clienteId: clienteDb.id,
            status: novoStatusItem,
            prioridade: 'MEDIA',
            observacoes: `Apontamento direto registrado pelo Controle de Qualidade`,
          },
        });
      }

      // 4. Criar Item da OS
      const novoItem = await tx.itemOrdemServico.create({
        data: {
          ordemServicoId: osDb.id,
          tipoEquipamentoId: tipoDb.id,
          quantidade: dados.quantidadeTestada,
          statusItem: novoStatusItem,
          tecnicoAlocadoId: tecnicoRespDbId || inspetorDbId,
          defeitoRelatado: `Inspeção de bancada CQ (${dados.quantidadeAprovada} aprovadas, ${dados.quantidadeReprovada} retrabalho)`,
        },
      });
      itemOrdemServicoId = novoItem.id;

      // 5. Criar Produção vinculada ao técnico responsável
      const novaProd = await tx.producao.create({
        data: {
          itemOrdemServicoId: novoItem.id,
          tecnicoId: tecnicoRespDbId || inspetorDbId,
          dataInicio: agora,
          dataFim: agora,
          quantidadeProduzida: dados.quantidadeTestada,
          status: 'FINALIZADO',
          servicoRealizado: `Reparo inspecionado e testado pelo CQ`,
          observacao: `Apontamento de CQ. ${dados.quantidadeAprovada} un aprovadas, ${dados.quantidadeReprovada} un retrabalho.`,
        },
      });
      producaoDbId = novaProd.id;
    } else {
      // B. Inspeção de item existente da fila
      const itemExistente = await tx.itemOrdemServico.findUnique({
        where: { id: itemOrdemServicoId },
        include: { producoes: { orderBy: { dataInicio: 'desc' }, take: 1 } },
      });

      if (itemExistente) {
        // Se o teste foi parcial (testou menos que o total do lote na fila)
        if (dados.quantidadeTestada < itemExistente.quantidade) {
          const qtdRestante = itemExistente.quantidade - dados.quantidadeTestada;
          // Cria o item com o saldo restante na fila
          await tx.itemOrdemServico.create({
            data: {
              ordemServicoId: itemExistente.ordemServicoId,
              tipoEquipamentoId: itemExistente.tipoEquipamentoId,
              quantidade: qtdRestante,
              statusItem: 'AGUARDANDO_TESTE',
              tecnicoAlocadoId: itemExistente.tecnicoAlocadoId,
              defeitoRelatado: `Saldo restante para teste CQ (${qtdRestante} un pendentes)`,
            },
          });
          // Ajusta a quantidade do item atual para a quantidade que foi realmente testada hoje
          await tx.itemOrdemServico.update({
            where: { id: itemOrdemServicoId },
            data: { quantidade: dados.quantidadeTestada },
          });
        }

        // Garantir produção válida
        let producaoExiste = producaoDbId && producaoDbId !== 'prod-direto'
          ? await tx.producao.findUnique({ where: { id: producaoDbId } })
          : null;

        if (!producaoExiste) {
          const prodMaisRecente = itemExistente.producoes?.[0];
          if (prodMaisRecente) {
            producaoDbId = prodMaisRecente.id;
          } else {
            const novaProd = await tx.producao.create({
              data: {
                itemOrdemServicoId,
                tecnicoId: itemExistente.tecnicoAlocadoId || tecnicoRespDbId || inspetorDbId,
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
        observacao: dados.observacao || (dados.quantidadeReprovada > 0 ? dados.detalhesDefeito : 'Aprovado em conformidade no CQ'),
        dataTeste: agora,
      },
      include: {
        inspetor: { select: { id: true, nome: true } },
        producao: {
          include: {
            tecnico: { select: { id: true, nome: true } },
            itemOrdemServico: {
              include: {
                ordemServico: { select: { id: true, numeroOS: true, cliente: { select: { nomeRazaoSocial: true } } } },
                tipoEquipamento: { select: { nome: true, marca: true } },
                tecnicoAlocado: { select: { id: true, nome: true } },
              },
            },
          },
        },
      },
    });

    // 2. Se houver unidades reprovadas, gerar automaticamente o Retrabalho atribuído ao técnico de destino
    if (temReprovacao) {
      let motivoId = dados.motivoReprovacaoId;
      if (motivoId) {
        const m = await tx.motivoReprovacao.findUnique({ where: { id: motivoId } });
        if (!m) {
          const firstM = await tx.motivoReprovacao.findFirst();
          motivoId = firstM?.id || undefined;
        }
      }

      await tx.retrabalho.create({
        data: {
          testeId: teste.id,
          itemOrdemServicoId,
          motivoReprovacaoId: motivoId || undefined,
          tecnicoResponsavelId: tecnicoDestinoDbId || tecnicoRespDbId,
          quantidadeRetrabalho: dados.quantidadeReprovada,
          detalhesDefeito: dados.detalhesDefeito || dados.observacao || 'Não conformidade detectada no CQ',
          status: 'PENDENTE',
          dataInicio: agora,
        },
      });
    }

    // 3. Atualizar status do Item da OS
    await tx.itemOrdemServico.update({
      where: { id: itemOrdemServicoId },
      data: { statusItem: novoStatusItem },
    });

    // 4. Atualizar status da OS pai
    const itemDb = await tx.itemOrdemServico.findUnique({
      where: { id: itemOrdemServicoId },
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
        (it) => (it.id === itemOrdemServicoId ? novoStatusItem === 'APROVADO' : it.statusItem === 'APROVADO')
      );
      const temAlgumRetrabalho = itemDb.ordemServico.itens.some(
        (it) => (it.id === itemOrdemServicoId ? novoStatusItem === 'RETRABALHO' : it.statusItem === 'RETRABALHO')
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

// ─── Histórico de Testes de CQ (paginado com dados completos de técnicos e retrabalho) ───
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
          retrabalhos: {
            include: {
              tecnicoResponsavel: { select: { id: true, nome: true } },
              motivoReprovacao: { select: { id: true, descricao: true, categoria: true } },
            },
          },
          producao: {
            include: {
              tecnico: { select: { id: true, nome: true } },
              itemOrdemServico: {
                include: {
                  tecnicoAlocado: { select: { id: true, nome: true } },
                  ordemServico: {
                    select: {
                      id: true,
                      numeroOS: true,
                      prioridade: true,
                      cliente: { select: { id: true, nomeRazaoSocial: true } },
                    },
                  },
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

