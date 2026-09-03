import { prisma, isDatabaseReady } from '../../database/prisma.js';
import { getTecnicoAliasIds, ensureUsuarioDbId, isValidUuid } from '../../database/db-utils.js';
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

// ─── Busca a fila de OSs disponíveis para um técnico específico ───────────────
export async function getMinhaFila(tecnicoId: string) {
  if (!isDatabaseReady()) return [];

  try {
    const aliasIds = await getTecnicoAliasIds(tecnicoId);

    const itens = await prisma.itemOrdemServico.findMany({
      where: {
        OR: [
          // Itens alocados diretamente ao técnico
          { tecnicoAlocadoId: { in: aliasIds } },
          { tecnicoAlocado: { nome: { contains: tecnicoId.replace(/usr-|colab-/g, ''), mode: 'insensitive' } } },
          // Itens EM_PRODUCAO criados pelo próprio técnico via apontamento rápido
          {
            statusItem: 'EM_PRODUCAO',
            producoes: {
              some: {
                OR: [
                  { tecnicoId: { in: aliasIds } },
                  { tecnico: { nome: { contains: tecnicoId.replace(/usr-|colab-/g, ''), mode: 'insensitive' } } },
                ],
              },
            },
          },
        ],
        statusItem: { in: ['AGUARDANDO_PRODUCAO', 'RECEBIDO', 'EM_PRODUCAO'] },
      },
      include: {
        ordemServico: {
          select: {
            id: true,
            numeroOS: true,
            prioridade: true,
            status: true,
            dataEntrada: true,
            observacoes: true,
            cliente: { select: { id: true, nomeRazaoSocial: true } },
          },
        },
        tipoEquipamento: {
          select: { id: true, nome: true, marca: true, modelo: true, tempoEstimadoMinutos: true },
        },
        producoes: {
          select: { id: true, status: true, quantidadeProduzida: true, servicoRealizado: true, observacao: true, dataInicio: true, dataFim: true },
          orderBy: { dataInicio: 'desc' },
        },
      },
      orderBy: [
        { ordemServico: { prioridade: 'desc' } },
        { ordemServico: { dataEntrada: 'asc' } },
      ],
    });

    return itens || [];
  } catch (err) {
    console.error('[getMinhaFila] Erro ao consultar fila no Supabase:', err);
    return [];
  }
}

// ─── Busca todas as caixas/OSs recentes do técnico (em bancada, fila ou aguardando teste) ───
export async function getMinhasCaixas(tecnicoId: string) {
  if (!isDatabaseReady()) return [];

  try {
    const aliasIds = await getTecnicoAliasIds(tecnicoId);
    const clean = tecnicoId.replace(/usr-|colab-/g, '');

    const producoes = await prisma.producao.findMany({
      where: {
        OR: [
          { tecnicoId: { in: aliasIds } },
          { tecnico: { nome: { contains: clean, mode: 'insensitive' } } },
          { itemOrdemServico: { tecnicoAlocadoId: { in: aliasIds } } },
        ],
      },
      include: {
        itemOrdemServico: {
          include: {
            ordemServico: {
              select: {
                id: true,
                numeroOS: true,
                prioridade: true,
                status: true,
                dataEntrada: true,
                observacoes: true,
                cliente: { select: { id: true, nomeRazaoSocial: true } },
                itens: { select: { id: true, quantidade: true, statusItem: true } },
              },
            },
            tipoEquipamento: {
              select: { id: true, nome: true, marca: true, modelo: true, tempoEstimadoMinutos: true },
            },
          },
        },
      },
      orderBy: { dataInicio: 'desc' },
      take: 50,
    });

    const seenItemIds = new Set<string>();
    const itens: any[] = [];

    for (const prod of producoes) {
      if (prod.itemOrdemServico && !seenItemIds.has(prod.itemOrdemServico.id)) {
        seenItemIds.add(prod.itemOrdemServico.id);
        const osItens = prod.itemOrdemServico.ordemServico?.itens || [];
        const totalAcumulado = osItens.reduce((acc: number, it: any) => acc + Number(it.quantidade || 0), 0) || prod.itemOrdemServico.quantidade;

        itens.push({
          ...prod.itemOrdemServico,
          quantidade: prod.quantidadeProduzida || prod.itemOrdemServico.quantidade,
          defeitoRelatado: prod.observacao || prod.servicoRealizado || prod.itemOrdemServico.defeitoRelatado,
          producaoId: prod.id,
          producaoStatus: prod.status,
          totalAcumuladoCaixa: totalAcumulado,
          anterioresNaCaixa: Math.max(0, totalAcumulado - (prod.quantidadeProduzida || prod.itemOrdemServico.quantidade)),
        });
      }
    }

    return itens;
  } catch (err) {
    console.error('[getMinhasCaixas] Erro ao consultar caixas do técnico:', err);
    return [];
  }
}

// ─── Busca a produção ativa (EM_ANDAMENTO) do técnico ─────────────────────────
export async function getProducaoAtiva(tecnicoId: string) {
  if (!isDatabaseReady()) return null;

  try {
    const aliasIds = await getTecnicoAliasIds(tecnicoId);

    const p = await prisma.producao.findFirst({
      where: {
        OR: [
          { tecnicoId: { in: aliasIds } },
          { tecnico: { nome: { contains: tecnicoId.replace(/usr-|colab-/g, ''), mode: 'insensitive' } } },
          { itemOrdemServico: { tecnicoAlocadoId: { in: aliasIds } } },
        ],
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
      orderBy: { dataInicio: 'desc' },
    });

    return p || null;
  } catch (err) {
    console.error('[getProducaoAtiva] Erro ao consultar produção ativa no Supabase:', err);
    return null;
  }
}

// ─── Inicia uma nova produção ─────────────────────────────────────────────────
export async function iniciarProducao(itemOrdemServicoId: string, tecnicoId: string) {
  const tecnicoDbId = await ensureUsuarioDbId(tecnicoId, 'TECNICO');

  if (!isDatabaseReady()) {
    throw new Error('Banco de dados indisponível no momento.');
  }

  const p = await prisma.$transaction(async (tx) => {
    const producao = await tx.producao.create({
      data: {
        itemOrdemServicoId,
        tecnicoId: tecnicoDbId,
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
}

// ─── Finaliza uma produção ────────────────────────────────────────────────────
export async function finalizarProducao(
  producaoId: string,
  dados: FinalizarProducaoInput
) {
  const agora = new Date();

  if (!isDatabaseReady()) {
    throw new Error('Banco de dados indisponível no momento.');
  }

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

    const enviarAoCQ = (dados as any).enviarAoCQ !== false;
    const nextStatus = enviarAoCQ ? 'AGUARDANDO_TESTE' : 'EM_PRODUCAO';

    await tx.itemOrdemServico.update({
      where: { id: itemId },
      data: { statusItem: nextStatus },
    });

    if (enviarAoCQ && todosAguardando) {
      await tx.ordemServico.update({
        where: { id: ordemServico.id },
        data: { status: 'AGUARDANDO_TESTE' },
      });
    } else if (!enviarAoCQ) {
      await tx.ordemServico.update({
        where: { id: ordemServico.id },
        data: { status: 'EM_PRODUCAO' },
      });
    }

    return producaoFinalizada;
  });

  return p;
}

// ─── Pausa uma produção ativa (mantém o item na bancada do técnico) ───────────
export async function pausarProducao(
  producaoId: string,
  observacao?: string
) {
  const agora = new Date();

  if (!isDatabaseReady()) {
    throw new Error('Banco de dados indisponível no momento.');
  }

  const p = await prisma.$transaction(async (tx) => {
    const producao = await tx.producao.findUniqueOrThrow({
      where: { id: producaoId },
      include: {
        itemOrdemServico: {
          include: {
            ordemServico: { select: { id: true, numeroOS: true } },
            tipoEquipamento: { select: { nome: true } },
          },
        },
      },
    });

    const producaoPausada = await tx.producao.update({
      where: { id: producaoId },
      data: {
        status: 'FINALIZADO',
        dataFim: agora,
        observacao: observacao || 'Produção pausada na bancada pelo técnico para continuação posterior.',
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

    // Mantém o item em EM_PRODUCAO na bancada do técnico
    await tx.itemOrdemServico.update({
      where: { id: producao.itemOrdemServicoId },
      data: { statusItem: 'EM_PRODUCAO' },
    });

    await tx.ordemServico.update({
      where: { id: producao.itemOrdemServico.ordemServico.id },
      data: { status: 'EM_PRODUCAO' },
    });

    return producaoPausada;
  });

  return p;
}

// ─── Histórico de produções do técnico (paginado) ────────────────────────────
export async function getHistoricoProducao(tecnicoId: string, page = 1, limit = 20) {
  if (!isDatabaseReady()) {
    return { producoes: [], total: 0, totalPages: 0 };
  }

  try {
    const aliasIds = await getTecnicoAliasIds(tecnicoId);
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { tecnicoId: { in: aliasIds } },
        { tecnico: { nome: { contains: tecnicoId.replace(/usr-|colab-/g, ''), mode: 'insensitive' } } },
        { itemOrdemServico: { tecnicoAlocadoId: { in: aliasIds } } },
      ],
      status: 'FINALIZADO',
    };

    const [producoes, total] = await Promise.all([
      prisma.producao.findMany({
        where,
        include: {
          itemOrdemServico: {
            include: {
              ordemServico: { select: { id: true, numeroOS: true, prioridade: true, status: true } },
              tipoEquipamento: { select: { id: true, nome: true, marca: true, modelo: true } },
            },
          },
          tecnico: { select: { id: true, nome: true } },
        },
        orderBy: { dataFim: 'desc' },
        skip,
        take: limit,
      }),
      prisma.producao.count({ where }),
    ]);

    return {
      producoes,
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.error('[getHistoricoProducao] Erro ao consultar histórico no Supabase:', err);
    return { producoes: [], total: 0, totalPages: 0 };
  }
}

// ─── Verifica se técnico já tem produção ativa no mesmo item ──────────────────
export async function getProducaoAtivaNoItem(itemOrdemServicoId: string, tecnicoId: string) {
  if (!isDatabaseReady()) return null;

  try {
    const aliasIds = await getTecnicoAliasIds(tecnicoId);
    const p = await prisma.producao.findFirst({
      where: {
        itemOrdemServicoId,
        OR: [
          { tecnicoId: { in: aliasIds } },
          { tecnico: { nome: { contains: tecnicoId.replace(/usr-|colab-/g, ''), mode: 'insensitive' } } },
        ],
        status: 'EM_ANDAMENTO',
      },
    });
    return p || null;
  } catch (err) {
    console.error('[getProducaoAtivaNoItem] Erro ao consultar item ativo no Supabase:', err);
    return null;
  }
}

// ─── Criar Apontamento de Lote do Técnico (Auto-atendimento com envio ao Teste ou Início Ao Vivo) ───
export async function criarApontamentoLote(
  tecnicoId: string,
  tecnicoNome: string,
  dados: {
    numeroOS?: number;
    clienteId?: string;
    dataEntrada?: string;
    prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
    observacoes?: string;
    enviarDiretoTeste?: boolean;
    iniciarProducaoAoVivo?: boolean;
    modoOperacao?: 'DESPACHAR_CQ' | 'INICIAR_PRODUCAO' | 'SALVAR_BANCADA';
    itens: {
      tipoEquipamentoId: string;
      quantidade: number;
      quantidadeTotalCaixa?: number;
      quantidadeReparada?: number;
      quantidadeSemDefeito?: number;
      quantidadeSucata?: number;
      quantidadeRestante?: number;
      tipoCategoria?: 'REPARADO' | 'SEM_DEFEITO' | 'RETRABALHO';
      defeitoRelatado?: string;
      servicoRealizado?: string;
      numeroSerie?: string;
    }[];
  },
  tiposEquipMap: any,
  clienteInfo: any
) {
  const agora = new Date();
  const dataRegistro = dados.dataEntrada ? new Date(dados.dataEntrada) : agora;
  
  const isAoVivo = dados.modoOperacao === 'INICIAR_PRODUCAO' || dados.iniciarProducaoAoVivo === true;
  const isDiretoCQ = dados.modoOperacao === 'DESPACHAR_CQ' || (dados.enviarDiretoTeste === true && !isAoVivo && dados.modoOperacao !== 'SALVAR_BANCADA');
  
  const initialStatus: StatusOS = isDiretoCQ ? 'AGUARDANDO_TESTE' : 'EM_PRODUCAO';

  // 1. Garantir ID de usuário válido no PostgreSQL para chave estrangeira
  const tecnicoDbId = await ensureUsuarioDbId(tecnicoId || tecnicoNome, 'TECNICO');

  // 2. Garantir que o cliente existe no banco (padrão MARANET se não informado)
  let clienteDb = await prisma.cliente.findFirst({
    where: { nomeRazaoSocial: { contains: clienteInfo?.nomeRazaoSocial || 'MARANET', mode: 'insensitive' } },
  });
  if (!clienteDb) {
    clienteDb = await prisma.cliente.create({
      data: {
        nomeRazaoSocial: clienteInfo?.nomeRazaoSocial || 'MARANET Telecomunicações',
        documento: clienteInfo?.documento || '00.000.000/0001-00',
        contatoTelefone: clienteInfo?.contatoTelefone || null,
        email: clienteInfo?.email || null,
      },
    });
  }

  // 3. Garantir que os tipos de equipamento existem no banco
  const tiposDbMap: Record<string, any> = {};
  for (const it of dados.itens) {
    if (tiposDbMap[it.tipoEquipamentoId]) continue;
    const equip = tiposEquipMap[it.tipoEquipamentoId] || { nome: 'Equipamento Renetec', marca: 'Geral', modelo: 'Padrão', tempoEstimadoMinutos: 45 };

    let tipoDb = await prisma.tipoEquipamento.findFirst({
      where: isValidUuid(it.tipoEquipamentoId)
        ? {
            OR: [
              { id: it.tipoEquipamentoId },
              { nome: { contains: equip.nome.split('/')[0].trim(), mode: 'insensitive' } },
            ],
          }
        : { nome: { contains: equip.nome.split('/')[0].trim(), mode: 'insensitive' } },
    });
    if (!tipoDb) {
      tipoDb = await prisma.tipoEquipamento.create({
        data: {
          nome: equip.nome,
          marca: equip.marca || 'Geral',
          modelo: equip.modelo || 'Padrão',
          tempoEstimadoMinutos: equip.tempoEstimadoMinutos || 45,
        },
      });
    }
    tiposDbMap[it.tipoEquipamentoId] = tipoDb;
  }

  // 4. Criar ou reutilizar a Ordem de Serviço no banco
  let osDb: any = null;
  if (dados.numeroOS && Number(dados.numeroOS) > 0) {
    const num = Number(dados.numeroOS);
    osDb = await prisma.ordemServico.findUnique({ where: { numeroOS: num } });
  }

  if (!osDb) {
    osDb = await prisma.ordemServico.create({
      data: {
        ...(dados.numeroOS && Number(dados.numeroOS) > 0 ? { numeroOS: Number(dados.numeroOS) } : {}),
        clienteId: clienteDb.id,
        prioridade: (dados.prioridade || 'MEDIA') as PrioridadeOS,
        status: initialStatus,
        dataEntrada: dataRegistro,
        observacoes: dados.observacoes || `OS criada pelo técnico ${tecnicoNome}`,
        valorOrcamento: null,
      },
    });
  } else {
    // Atualiza status se necessário
    await prisma.ordemServico.update({
      where: { id: osDb.id },
      data: { status: initialStatus },
    });
  }

  // 5. Criar os itens e produções no banco
  const createdItens: any[] = [];
  const createdProducoes: any[] = [];

  for (const it of dados.itens) {
    const tipoDb = tiposDbMap[it.tipoEquipamentoId];
    const categoria = it.tipoCategoria || 'REPARADO';
    const rep = Number(it.quantidadeReparada) || 0;
    const semDef = Number((it as any).quantidadeSemDefeito) || 0;
    const suc = Number((it as any).quantidadeSucata) || 0;
    const totalHoje = rep + semDef + suc;
    const totalCaixa = Number((it as any).quantidadeTotalCaixa) || totalHoje || it.quantidade;
    const qtdProntaCQ = (rep + semDef) > 0 ? (rep + semDef) : (it.quantidade || totalHoje || 1);

    // Descrição detalhada do lote/caixa
    const infoCaixa = ` [Caixa Total: ${totalCaixa} un | Hoje: ${rep} rep, ${semDef} sem def, ${suc} sucata]`;

    const defeito = it.defeitoRelatado || (
      categoria === 'SEM_DEFEITO'
        ? `Sem defeito aparente (Triagem)${infoCaixa}`
        : `Manutenção de bancada${infoCaixa}`
    );
    const servico = it.servicoRealizado || (
      categoria === 'SEM_DEFEITO'
        ? `Equipamento testado em triagem (${semDef || rep} un sem defeito)${suc ? ` | ${suc} un sucata` : ''}`
        : `Reparo efetuado (${rep} un reparadas${semDef ? `, ${semDef} sem defeito` : ''})${suc ? ` | ${suc} un sucata` : ''}`
    );

    // Cria o item da produção atual
    const itemDb = await prisma.itemOrdemServico.create({
      data: {
        ordemServicoId: osDb.id,
        tipoEquipamentoId: tipoDb.id,
        quantidade: qtdProntaCQ,
        defeitoRelatado: defeito,
        statusItem: initialStatus,
        tecnicoAlocadoId: tecnicoDbId,
      },
      include: {
        tipoEquipamento: true,
        tecnicoAlocado: { select: { id: true, nome: true } },
        ordemServico: { include: { cliente: true } },
      },
    });

    createdItens.push({
      ...itemDb,
      quantidadeReparada: rep,
      quantidadeSemDefeito: semDef,
      quantidadeSucata: suc,
      quantidadeTotalCaixa: totalCaixa,
    });

    // Criar registro de produção para o lote trabalhado
    const prodDb = await prisma.producao.create({
      data: {
        itemOrdemServicoId: itemDb.id,
        tecnicoId: tecnicoDbId,
        dataInicio: dataRegistro,
        dataFim: isAoVivo ? null : agora,
        quantidadeProduzida: qtdProntaCQ,
        servicoRealizado: servico,
        observacao: isDiretoCQ
          ? `Apontamento técnico despachado ao CQ por ${tecnicoNome}. Categoria: ${categoria}${infoCaixa}`
          : isAoVivo
          ? `Produção iniciada ao vivo na bancada por ${tecnicoNome}. Categoria: ${categoria}${infoCaixa}`
          : `Progresso de caixa salvo na bancada por ${tecnicoNome}. Categoria: ${categoria}${infoCaixa}`,
        status: isAoVivo ? 'EM_ANDAMENTO' : 'FINALIZADO',
      },
    });

    createdProducoes.push(prodDb);

    // Se houver saldo restante registrado na caixa para reparar depois,
    // cria automaticamente o saldo restante na bancada do técnico em AGUARDANDO_PRODUCAO
    const qtdRestante = (it as any).quantidadeRestante;
    if (isDiretoCQ && qtdRestante && Number(qtdRestante) > 0) {
      const itemRestanteDb = await prisma.itemOrdemServico.create({
        data: {
          ordemServicoId: osDb.id,
          tipoEquipamentoId: tipoDb.id,
          quantidade: Number(qtdRestante),
          defeitoRelatado: `Saldo restante da caixa (${qtdRestante} un pendentes de conserto)`,
          statusItem: 'AGUARDANDO_PRODUCAO',
          tecnicoAlocadoId: tecnicoDbId,
        },
        include: {
          tipoEquipamento: true,
          tecnicoAlocado: { select: { id: true, nome: true } },
          ordemServico: { include: { cliente: true } },
        },
      });
      createdItens.push(itemRestanteDb);
    }
  }

  const osRecord = {
    id: osDb.id,
    numeroOS: osDb.numeroOS,
    prioridade: osDb.prioridade,
    status: osDb.status,
    dataEntrada: new Date(osDb.dataEntrada).toISOString(),
    cliente: { id: clienteDb.id, nomeRazaoSocial: clienteDb.nomeRazaoSocial },
    observacoes: osDb.observacoes,
  };

  return { ordemServico: osRecord, itens: createdItens, producoes: createdProducoes };
}

// ─── Despacha um item de bancada (EM_PRODUCAO) para teste no CQ ──────────────
export async function despacharItemParaCQ(itemOrdemServicoId: string, tecnicoId: string) {
  if (!isDatabaseReady()) throw new Error('Banco de dados não está pronto.');

  const item = await prisma.itemOrdemServico.findUnique({
    where: { id: itemOrdemServicoId },
    include: {
      ordemServico: true,
      tipoEquipamento: true,
      tecnicoAlocado: true,
    },
  });

  if (!item) throw new Error('Item de OS não encontrado.');

  const agora = new Date();

  // 1. Atualizar o item para AGUARDANDO_TESTE
  const updatedItem = await prisma.itemOrdemServico.update({
    where: { id: itemOrdemServicoId },
    data: { statusItem: 'AGUARDANDO_TESTE' },
    include: {
      ordemServico: { include: { cliente: true } },
      tipoEquipamento: true,
      tecnicoAlocado: true,
    },
  });

  // 2. Atualizar a OS caso todos os itens estejam prontos
  await prisma.ordemServico.update({
    where: { id: item.ordemServicoId },
    data: { status: 'AGUARDANDO_TESTE' },
  });

  // 3. Finalizar produções ativas ou em andamento deste item
  await prisma.producao.updateMany({
    where: { itemOrdemServicoId, status: 'EM_ANDAMENTO' },
    data: { status: 'FINALIZADO', dataFim: agora },
  });

  return updatedItem;
}

