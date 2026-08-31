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
          select: { id: true, nome: true, marca: true, modelo: true, tempoEstimadoMinutos: true, pontos: true },
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

    const itens = await prisma.itemOrdemServico.findMany({
      where: {
        OR: [
          { tecnicoAlocadoId: { in: aliasIds } },
          { tecnicoAlocado: { nome: { in: aliasIds, mode: 'insensitive' } } },
          {
            producoes: {
              some: {
                OR: [
                  { tecnicoId: { in: aliasIds } },
                  { tecnico: { nome: { in: aliasIds, mode: 'insensitive' } } },
                ],
              },
            },
          },
        ],
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
          select: { id: true, nome: true, marca: true, modelo: true, tempoEstimadoMinutos: true, pontos: true },
        },
        producoes: {
          select: { id: true, status: true, quantidadeProduzida: true, servicoRealizado: true, observacao: true, dataInicio: true, dataFim: true },
          orderBy: { dataInicio: 'desc' },
        },
      },
      orderBy: [
        { ordemServico: { dataEntrada: 'desc' } },
      ],
      take: 50,
    });

    return itens || [];
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

// ─── Criar Apontamento de Lote do Técnico (Auto-atendimento com envio ao Teste) ───
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
    itens: {
      tipoEquipamentoId: string;
      quantidade: number;
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
  const initialStatus: StatusOS = dados.enviarDiretoTeste ? 'AGUARDANDO_TESTE' : 'EM_PRODUCAO';
  const newNumero = dados.numeroOS ? Number(dados.numeroOS) : Math.floor(Math.random() * 9000) + 1000;

  // 1. Garantir ID de usuário válido no PostgreSQL para chave estrangeira
  const tecnicoDbId = await ensureUsuarioDbId(tecnicoId || tecnicoNome, 'TECNICO');

  // 2. Garantir que o cliente existe no banco
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
  if (dados.numeroOS) {
    const num = Number(dados.numeroOS);
    osDb = await prisma.ordemServico.findUnique({ where: { numeroOS: num } });
  }

  if (!osDb) {
    osDb = await prisma.ordemServico.create({
      data: {
        ...(dados.numeroOS ? { numeroOS: Number(dados.numeroOS) } : {}),
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
    
    // Descrição informativa do lote/caixa
    const infoCaixa = (it as any).quantidadeTotalCaixa
      ? ` [Caixa: ${(it as any).quantidadeTotalCaixa} un | Reparadas: ${it.quantidade} un${(it as any).quantidadeSucata ? ` | Sucata: ${(it as any).quantidadeSucata} un` : ''}${(it as any).quantidadeRestante ? ` | Restantes: ${(it as any).quantidadeRestante} un` : ''}]`
      : '';

    const defeito = it.defeitoRelatado || (categoria === 'SEM_DEFEITO' ? `Sem defeito aparente (Triagem)${infoCaixa}` : `Manutenção corretiva${infoCaixa}`);
    const servico = it.servicoRealizado || (categoria === 'SEM_DEFEITO' ? `Equipamento testado e aprovado em triagem (sem defeito)${infoCaixa}` : `Reparo realizado na bancada${infoCaixa}`);

    // Cria o item da produção atual (unidades reparadas prontas para teste ou em andamento)
    const itemDb = await prisma.itemOrdemServico.create({
      data: {
        ordemServicoId: osDb.id,
        tipoEquipamentoId: tipoDb.id,
        quantidade: it.quantidade,
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

    createdItens.push(itemDb);

    // Criar registro de produção para o lote trabalhado
    const prodDb = await prisma.producao.create({
      data: {
        itemOrdemServicoId: itemDb.id,
        tecnicoId: tecnicoDbId,
        dataInicio: dataRegistro,
        dataFim: agora,
        quantidadeProduzida: it.quantidade,
        servicoRealizado: servico,
        observacao: dados.enviarDiretoTeste
          ? `Apontamento técnico despachado ao CQ pelo operador ${tecnicoNome}. Categoria: ${categoria}${infoCaixa}`
          : `Progresso de caixa salvo na bancada pelo técnico ${tecnicoNome}. Categoria: ${categoria}${infoCaixa}`,
        status: 'FINALIZADO',
      },
    });

    createdProducoes.push(prodDb);

    // Se houve envio ao teste de lote parcial e ainda restam unidades na caixa para reparar depois,
    // cria automaticamente o saldo restante na bancada do técnico em AGUARDANDO_PRODUCAO
    const qtdRestante = (it as any).quantidadeRestante;
    if (dados.enviarDiretoTeste && qtdRestante && Number(qtdRestante) > 0) {
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
    where: { itemOrdemServicoId, status: { in: ['EM_ANDAMENTO', 'PAUSADO'] } },
    data: { status: 'FINALIZADO', dataFim: agora },
  });

  return updatedItem;
}

