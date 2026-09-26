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
  const qtdSucata = Number(dados.quantidadeSucata) || 0;
  const qtdSemDefeito = Number(dados.quantidadeSemDefeito) || 0;
  const temAprovacao = dados.quantidadeAprovada > 0 || qtdSemDefeito > 0;
  const novoStatusItem: StatusOS = temReprovacao
    ? 'RETRABALHO'
    : temAprovacao
    ? 'APROVADO'
    : qtdSucata > 0
    ? 'SEM_REPARO'
    : 'APROVADO';

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

      // 3. Ordem de Serviço. O teste direto não pode gerar uma OS paralela
      // quando outro usuário registra o mesmo número no mesmo instante.
      const numeroOS = Number(dados.numeroOS);
      const osAnterior = await tx.ordemServico.findUnique({ where: { numeroOS } });
      if (osAnterior && ['CONCLUIDO', 'CANCELADO'].includes(osAnterior.status)) {
        throw new Error(`A OS #${numeroOS} já está encerrada e não aceita novo teste direto.`);
      }

      const osDb = await tx.ordemServico.upsert({
        where: { numeroOS },
        create: {
          numeroOS,
          clienteId: clienteDb.id,
          status: novoStatusItem,
          prioridade: 'MEDIA',
          tecnicoResponsavelId: tecnicoRespDbId || inspetorDbId,
          observacoes: 'Apontamento direto registrado pelo Controle de Qualidade',
        },
        update: osAnterior?.tecnicoResponsavelId || !tecnicoRespDbId
          ? {}
          : { tecnicoResponsavelId: tecnicoRespDbId },
      });

      // 4. Reutilizar o item deste tipo de equipamento quando ele já pertence
      // à OS. Assim, uma OS #1234 pode conter ONU e ONT, sem receber várias
      // linhas paralelas de ONU a cada lançamento direto do CQ.
      const itemExistenteMesmoTipo = await tx.itemOrdemServico.findFirst({
        where: { ordemServicoId: osDb.id, tipoEquipamentoId: tipoDb.id },
      });

      const itemDb = itemExistenteMesmoTipo
        ? await tx.itemOrdemServico.update({
            where: { id: itemExistenteMesmoTipo.id },
            data: {
              // Não somar novamente um equipamento que já veio da produção.
              quantidade: Math.max(itemExistenteMesmoTipo.quantidade, dados.quantidadeTestada),
              statusItem: novoStatusItem,
              tecnicoAlocadoId: itemExistenteMesmoTipo.tecnicoAlocadoId || tecnicoRespDbId || inspetorDbId,
            },
          })
        : await tx.itemOrdemServico.create({
            data: {
              ordemServicoId: osDb.id,
              tipoEquipamentoId: tipoDb.id,
              quantidade: dados.quantidadeTestada,
              statusItem: novoStatusItem,
              tecnicoAlocadoId: tecnicoRespDbId || inspetorDbId,
              defeitoRelatado: `Inspeção de bancada CQ (${dados.quantidadeAprovada} aprovadas${qtdSemDefeito > 0 ? `, ${qtdSemDefeito} sem defeito` : ''}, ${dados.quantidadeReprovada} retrabalho${qtdSucata > 0 ? `, ${qtdSucata} sucata/morta` : ''})`,
            },
          });
      itemOrdemServicoId = itemDb.id;

      // 5. Criar registro de produção vinculado ao teste CQ para chave estrangeira.
      // REGRA: Testes de CQ NÃO são reparos de bancada! Quantidade reparada deve ser SEMPRE 0,
      // e o autor é o inspetor do CQ, não o técnico de bancada.
      const novaProd = await tx.producao.create({
        data: {
          itemOrdemServicoId: itemDb.id,
          tecnicoId: inspetorDbId,
          dataInicio: agora,
          dataFim: agora,
          dataProducao: agora,
          quantidadeProduzida: 0,
          quantidadeReparada: 0,
          quantidadeSemDefeito: qtdSemDefeito,
          quantidadeSucata: qtdSucata,
          status: 'FINALIZADO',
          servicoRealizado: 'Inspeção CQ',
          observacao: `Apontamento de CQ. ${dados.quantidadeAprovada} un aprovadas${qtdSemDefeito > 0 ? `, ${qtdSemDefeito} un sem defeito` : ''}, ${dados.quantidadeReprovada} un retrabalho${qtdSucata > 0 ? `, ${qtdSucata} un sucata/morta` : ''}.`,
        },
      });
      producaoDbId = novaProd.id;

      // Se foi apontado um técnico responsável na OS direta, registra a produção correspondente para ele
      if (tecnicoRespDbId && tecnicoRespDbId !== inspetorDbId) {
        await tx.producao.create({
          data: {
            itemOrdemServicoId: itemDb.id,
            tecnicoId: tecnicoRespDbId,
            dataInicio: agora,
            dataFim: agora,
            dataProducao: agora,
            quantidadeProduzida: dados.quantidadeAprovada + qtdSemDefeito + qtdSucata,
            quantidadeReparada: dados.quantidadeAprovada,
            quantidadeSemDefeito: qtdSemDefeito,
            quantidadeSucata: qtdSucata,
            status: 'FINALIZADO',
            servicoRealizado: 'Reparo de Bancada',
            observacao: `Apontamento direto via CQ (#OS ${dados.numeroOS || ''})`,
          },
        }).catch(() => {});
      }
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
            const updateData: any = {};
            if (qtdSucata > 0) updateData.quantidadeSucata = { increment: qtdSucata };
            if (qtdSemDefeito > 0) {
              updateData.quantidadeSemDefeito = { increment: qtdSemDefeito };
              if (prodMaisRecente.quantidadeReparada >= qtdSemDefeito) {
                updateData.quantidadeReparada = { decrement: qtdSemDefeito };
              }
            }
            if (Object.keys(updateData).length > 0) {
              await tx.producao.update({
                where: { id: prodMaisRecente.id },
                data: updateData,
              }).catch(() => {});
            }
          } else {
            const novaProd = await tx.producao.create({
              data: {
                itemOrdemServicoId,
                tecnicoId: itemExistente.tecnicoAlocadoId || inspetorDbId,
                dataInicio: agora,
                dataFim: agora,
                dataProducao: agora,
                quantidadeProduzida: dados.quantidadeAprovada + qtdSemDefeito,
                quantidadeReparada: dados.quantidadeAprovada,
                quantidadeSemDefeito: qtdSemDefeito,
                quantidadeSucata: qtdSucata,
                status: 'FINALIZADO',
                servicoRealizado: 'Reparo de Bancada',
                observacao: `Concluído via CQ (${dados.quantidadeAprovada} aprovadas${qtdSemDefeito > 0 ? `, ${qtdSemDefeito} sem defeito` : ''}, ${dados.quantidadeReprovada} retrabalho).`,
              },
            });
            producaoDbId = novaProd.id;
          }
        } else {
          const updateData: any = {};
          if (qtdSucata > 0) updateData.quantidadeSucata = { increment: qtdSucata };
          if (qtdSemDefeito > 0) {
            updateData.quantidadeSemDefeito = { increment: qtdSemDefeito };
            if (producaoExiste.quantidadeReparada >= qtdSemDefeito) {
              updateData.quantidadeReparada = { decrement: qtdSemDefeito };
            }
          }
          if (Object.keys(updateData).length > 0) {
            await tx.producao.update({
              where: { id: producaoExiste.id },
              data: updateData,
            }).catch(() => {});
          }
        }
      }
    }

    const semDefeitoPrefixo = qtdSemDefeito > 0 ? `[Sem Defeito: ${qtdSemDefeito} un] ` : '';
    const sucataPrefixo = qtdSucata > 0 ? `[Sucata: ${qtdSucata} un] ` : '';
    const baseObs = dados.observacao || (dados.quantidadeReprovada > 0 ? dados.detalhesDefeito : (qtdSucata > 0 && dados.quantidadeAprovada === 0 && qtdSemDefeito === 0 ? 'Equipamento sucata / sem conserto' : 'Aprovado em conformidade no CQ'));
    const obsFinal = `${semDefeitoPrefixo}${sucataPrefixo}${baseObs || ''}`.trim();

    // 1. Criar o registro do Teste
    // Aprovados do teste = Aprovados (reparados) + Sem Defeito (pois ambos passaram no teste)
    const totalAprovadosTeste = dados.quantidadeAprovada + qtdSemDefeito;

    const teste = await tx.teste.create({
      data: {
        producaoId: producaoDbId,
        inspetorId: inspetorDbId,
        quantidadeTestada: dados.quantidadeTestada,
        quantidadeAprovada: totalAprovadosTeste,
        quantidadeReprovada: dados.quantidadeReprovada,
        observacao: obsFinal || null,
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
    // NOTA: Sucata NÃO gera retrabalho, pois peças mortas/irrecuperáveis não voltam para a bancada
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
      const allItens = itemDb.ordemServico.itens;
      const temAlgumRetrabalho = allItens.some(
        (it) => (it.id === itemOrdemServicoId ? novoStatusItem === 'RETRABALHO' : it.statusItem === 'RETRABALHO')
      );
      const todosAprovados = allItens.every(
        (it) => (it.id === itemOrdemServicoId ? novoStatusItem === 'APROVADO' : it.statusItem === 'APROVADO')
      );
      const todosSemReparo = allItens.every(
        (it) => (it.id === itemOrdemServicoId ? novoStatusItem === 'SEM_REPARO' : it.statusItem === 'SEM_REPARO')
      );

      const statusOsFinal: StatusOS = temAlgumRetrabalho
        ? 'RETRABALHO'
        : todosAprovados
        ? 'APROVADO'
        : todosSemReparo
        ? 'SEM_REPARO'
        : novoStatusItem;

      await tx.ordemServico.update({
        where: { id: itemDb.ordemServicoId },
        data: { status: statusOsFinal },
      });
    }

    return teste;
  }, { maxWait: 10000, timeout: 30000 });

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

    const mappedData = data.map((t: any) => {
      let sucata = t.producao?.quantidadeSucata || 0;
      if (!sucata && t.observacao) {
        const match = t.observacao.match(/\[Sucata:\s*(\d+)\s*un\]/i);
        if (match) sucata = parseInt(match[1], 10);
      }
      return {
        ...t,
        quantidadeSucata: sucata,
      };
    });

    return {
      data: mappedData,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.error('[getHistoricoTestes] Erro ao consultar histórico no Supabase:', err);
    return { data: [], total: 0, page, totalPages: 0 };
  }
}
