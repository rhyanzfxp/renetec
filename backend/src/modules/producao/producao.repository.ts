import { prisma, isDatabaseReady } from '../../database/prisma.js';
import { getTecnicoAliasIds, ensureUsuarioDbId, isValidUuid } from '../../database/db-utils.js';
import type { FinalizarProducaoInput } from './producao.schema.js';
import { StatusOS, PrioridadeOS } from '@prisma/client';
import { getPontosUnitarios } from '../meta/meta.repository.js';

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
              },
            },
            tipoEquipamento: {
              select: { id: true, nome: true, marca: true, modelo: true, tempoEstimadoMinutos: true },
            },
            producoes: {
              select: {
                id: true,
                quantidadeProduzida: true,
                quantidadeReparada: true,
                quantidadeSemDefeito: true,
                quantidadeSucata: true,
                dataProducao: true,
                servicoRealizado: true,
                observacao: true,
                status: true,
              },
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
        const allProds = prod.itemOrdemServico.producoes || [];
        
        // Apenas produções reais do técnico na bancada (ignorar registros de inspeção do CQ)
        const itemProdsTecnico = allProds.filter((p) => {
          const isCq = p.servicoRealizado === 'Inspeção CQ' ||
                       p.servicoRealizado === 'Reparo inspecionado e testado pelo CQ' ||
                       (p.observacao && p.observacao.includes('Apontamento de CQ'));
          return !isCq;
        });

        // Produção mais recente do técnico (se houver)
        const ultimaProdTecnico = itemProdsTecnico[0] || null;

        const totalRep = itemProdsTecnico.reduce((acc, p) => acc + (p.quantidadeReparada || 0), 0);
        const totalSemDef = itemProdsTecnico.reduce((acc, p) => acc + (p.quantidadeSemDefeito || 0), 0);
        const totalSuc = itemProdsTecnico.reduce((acc, p) => acc + (p.quantidadeSucata || 0), 0);
        const totalAcumulado = (totalRep + totalSemDef + totalSuc) || prod.itemOrdemServico.quantidade;

        itens.push({
          ...prod.itemOrdemServico,
          quantidade: ultimaProdTecnico?.quantidadeProduzida || prod.itemOrdemServico.quantidade,
          quantidadeReparada: ultimaProdTecnico?.quantidadeReparada || 0,
          quantidadeSemDefeito: ultimaProdTecnico?.quantidadeSemDefeito || 0,
          quantidadeSucata: ultimaProdTecnico?.quantidadeSucata || 0,
          defeitoRelatado: ultimaProdTecnico?.observacao || ultimaProdTecnico?.servicoRealizado || prod.itemOrdemServico.defeitoRelatado,
          producaoId: ultimaProdTecnico?.id || prod.id,
          producaoStatus: ultimaProdTecnico?.status || prod.status,
          totalAcumuladoCaixa: totalAcumulado,
          totalReparadasCaixa: totalRep,
          totalSemDefeitoCaixa: totalSemDef,
          totalSucataCaixa: totalSuc,
          anterioresNaCaixa: Math.max(0, totalAcumulado - (ultimaProdTecnico?.quantidadeProduzida || prod.itemOrdemServico.quantidade)),
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
  }, { maxWait: 10000, timeout: 30000 });

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
  }, { maxWait: 10000, timeout: 30000 });

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
  }, { maxWait: 10000, timeout: 30000 });

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
              ordemServico: {
                select: {
                  id: true,
                  numeroOS: true,
                  prioridade: true,
                  status: true,
                  cliente: { select: { id: true, nomeRazaoSocial: true } },
                },
              },
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
    dataProducao?: string;
    idempotencyKey?: string;
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
  if (!dados.numeroOS || Number(dados.numeroOS) <= 0) {
    throw new Error('Informe o número oficial da OS antes de registrar a produção.');
  }
  const dataRegistro = dados.dataEntrada ? new Date(dados.dataEntrada) : agora;
  const dataProd = dados.dataProducao ? new Date(dados.dataProducao) : (dados.dataEntrada ? new Date(dados.dataEntrada) : agora);
  
  const isAoVivo = dados.modoOperacao === 'INICIAR_PRODUCAO' || dados.iniciarProducaoAoVivo === true;
  const isDiretoCQ = dados.modoOperacao === 'DESPACHAR_CQ' || (dados.enviarDiretoTeste === true && !isAoVivo && dados.modoOperacao !== 'SALVAR_BANCADA');
  
  const initialStatus: StatusOS = isDiretoCQ ? 'AGUARDANDO_TESTE' : 'EM_PRODUCAO';

  // 1. Garantir ID de usuário válido no PostgreSQL para chave estrangeira
  const tecnicoDbId = await ensureUsuarioDbId(tecnicoId || tecnicoNome, 'TECNICO');

  // 1.1 Proteção de Idempotência: se idempotencyKey foi fornecido e já existe, retorna o resultado prévio
  if (dados.idempotencyKey) {
    const existingProd = await prisma.producao.findFirst({
      where: { idempotencyKey: { startsWith: dados.idempotencyKey } },
      include: {
        itemOrdemServico: {
          include: {
            ordemServico: { include: { cliente: true } },
            tipoEquipamento: true,
          },
        },
      },
    });

    if (existingProd?.itemOrdemServico?.ordemServico) {
      const os = existingProd.itemOrdemServico.ordemServico;
      const osRecord = {
        id: os.id,
        numeroOS: os.numeroOS,
        prioridade: os.prioridade,
        status: os.status,
        dataEntrada: new Date(os.dataEntrada).toISOString(),
        cliente: { id: os.cliente.id, nomeRazaoSocial: os.cliente.nomeRazaoSocial },
        observacoes: os.observacoes,
      };
      return {
        ordemServico: osRecord,
        itens: [existingProd.itemOrdemServico],
        producoes: [existingProd],
      };
    }
  }

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

    let tipoDb = isValidUuid(it.tipoEquipamentoId)
      ? await prisma.tipoEquipamento.findUnique({ where: { id: it.tipoEquipamentoId } })
      : await prisma.tipoEquipamento.findFirst({
          where: { nome: { contains: equip.nome.split('/')[0].trim(), mode: 'insensitive' } },
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

  // 4. Criar ou reutilizar a Ordem de Serviço no banco (UMA OS = UM REGISTRO).
  // `upsert` torna a regra atômica: duas requisições simultâneas para #1234
  // continuam apontando para o mesmo cabeçalho de OS.
  const numeroOS = Number(dados.numeroOS);
  const osAnterior = await prisma.ordemServico.findUnique({ where: { numeroOS } });
  if (osAnterior && ['CONCLUIDO', 'CANCELADO'].includes(osAnterior.status)) {
    throw new Error(`A OS #${numeroOS} já foi ${osAnterior.status === 'CONCLUIDO' ? 'concluída' : 'cancelada'} e não pode receber nova produção.`);
  }

  const osDb = await prisma.ordemServico.upsert({
    where: { numeroOS },
    create: {
      numeroOS,
      clienteId: clienteDb.id,
      prioridade: (dados.prioridade || 'MEDIA') as PrioridadeOS,
      status: initialStatus,
      dataEntrada: dataRegistro,
      tecnicoResponsavelId: tecnicoDbId,
      observacoes: dados.observacoes || `OS criada pelo técnico ${tecnicoNome}`,
      valorOrcamento: null,
    },
    update: {
      status: initialStatus,
      tecnicoResponsavelId: osAnterior?.tecnicoResponsavelId || tecnicoDbId,
    },
  });

  // 5. Criar ou atualizar os itens e produções no banco (SEM DUPLICAÇÃO DE ITENS)
  const createdItens: any[] = [];
  const createdProducoes: any[] = [];

  for (let idx = 0; idx < dados.itens.length; idx++) {
    const it = dados.itens[idx];
    const tipoDb = tiposDbMap[it.tipoEquipamentoId];
    const categoria = it.tipoCategoria || 'REPARADO';
    const rep = Number(it.quantidadeReparada) || 0;
    const semDef = Number((it as any).quantidadeSemDefeito) || 0;
    const suc = Number((it as any).quantidadeSucata) || 0;
    const totalHoje = rep + semDef + suc;
    const totalCaixaInformado = Number((it as any).quantidadeTotalCaixa) || 0;
    const qtdProntaCQ = (rep + semDef) > 0 ? (rep + semDef) : (totalHoje > 0 ? totalHoje : (it.quantidade || 1));

    // Descrição do serviço e defeito
    const infoCaixa = ` [Hoje: ${rep} rep, ${semDef} sem def, ${suc} sucata]`;
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

    // REGRA DE OURO: Localiza item de OS EXISTENTE deste tipo de equipamento na OS!
    // Não cria itens duplicados nem saldo restante fictício.
    let itemDb = await prisma.itemOrdemServico.findFirst({
      where: {
        ordemServicoId: osDb.id,
        tipoEquipamentoId: tipoDb.id,
      },
      include: {
        tipoEquipamento: true,
        tecnicoAlocado: { select: { id: true, nome: true } },
        ordemServico: { include: { cliente: true } },
      },
    });

    if (!itemDb) {
      itemDb = await prisma.itemOrdemServico.create({
        data: {
          ordemServicoId: osDb.id,
          tipoEquipamentoId: tipoDb.id,
          quantidade: totalCaixaInformado || qtdProntaCQ,
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
      // REGRA: A quantidade do item da OS representa o total FÍSICO de equipamentos na caixa/OS,
      // e NÃO a soma de todas as passagens de produção/retrabalho.
      // Quando retrabalhos voltam para a bancada, eles já pertencem à caixa e não devem inflar a quantidade total.
      const prevTotal = itemDb.quantidade || 0;
      const novoTotal = totalCaixaInformado > 0
        ? totalCaixaInformado
        : (prevTotal > 0 ? prevTotal : qtdProntaCQ);
      itemDb = await prisma.itemOrdemServico.update({
        where: { id: itemDb.id },
        data: {
          statusItem: initialStatus,
          quantidade: novoTotal,
          tecnicoAlocadoId: itemDb.tecnicoAlocadoId || tecnicoDbId,
        },
        include: {
          tipoEquipamento: true,
          tecnicoAlocado: { select: { id: true, nome: true } },
          ordemServico: { include: { cliente: true } },
        },
      });
    }

    // Chave única para este apontamento nesta data/item
    const itemKey = dados.idempotencyKey
      ? `${dados.idempotencyKey}-${tipoDb.id}-${idx}`
      : null;

    // Criar registro de produção tipado para a produção realizada hoje
    const prodDb = await prisma.producao.create({
      data: {
        itemOrdemServicoId: itemDb.id,
        tecnicoId: tecnicoDbId,
        dataInicio: dataRegistro,
        dataFim: isAoVivo ? null : agora,
        dataProducao: dataProd,
        quantidadeProduzida: qtdProntaCQ,
        quantidadeReparada: rep,
        quantidadeSemDefeito: semDef,
        quantidadeSucata: suc,
        idempotencyKey: itemKey,
        servicoRealizado: servico,
        observacao: isDiretoCQ
          ? `Apontamento despachado ao CQ por ${tecnicoNome}. Categoria: ${categoria}${infoCaixa}`
          : isAoVivo
          ? `Produção iniciada ao vivo na bancada por ${tecnicoNome}. Categoria: ${categoria}${infoCaixa}`
          : `Progresso de OS salvo na bancada por ${tecnicoNome}. Categoria: ${categoria}${infoCaixa}`,
        status: isAoVivo ? 'EM_ANDAMENTO' : 'FINALIZADO',
      },
    });

    createdItens.push({
      ...itemDb,
      quantidadeReparada: rep,
      quantidadeSemDefeito: semDef,
      quantidadeSucata: suc,
    });
    createdProducoes.push(prodDb);
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

// ─── Busca todas as OSs em andamento do técnico com histórico e totais ────────
export async function getMinhasOsEmAndamento(tecnicoId: string) {
  if (!isDatabaseReady()) return [];
  try {
    const aliasIds = await getTecnicoAliasIds(tecnicoId);
    const clean = tecnicoId.replace(/usr-|colab-/g, '');

    const ordens = await prisma.ordemServico.findMany({
      where: {
        status: { notIn: ['CONCLUIDO', 'CANCELADO', 'SEM_REPARO'] },
        OR: [
          { tecnicoResponsavelId: { in: aliasIds } },
          { itens: { some: { tecnicoAlocadoId: { in: aliasIds } } } },
          { itens: { some: { tecnicoAlocado: { nome: { contains: clean, mode: 'insensitive' } } } } },
          { itens: { some: { producoes: { some: { tecnicoId: { in: aliasIds } } } } } },
          { itens: { some: { producoes: { some: { tecnico: { nome: { contains: clean, mode: 'insensitive' } } } } } } },
        ],
      },
      include: {
        cliente: true,
        itens: {
          include: {
            tipoEquipamento: true,
            tecnicoAlocado: true,
            producoes: {
              orderBy: { dataProducao: 'desc' },
              include: {
                tecnico: { select: { id: true, nome: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { prioridade: 'desc' },
        { dataEntrada: 'asc' },
      ],
    });

    const hojeStart = new Date();
    hojeStart.setHours(0, 0, 0, 0);
    const hojeEnd = new Date();
    hojeEnd.setHours(23, 59, 59, 999);

    return ordens.map((os) => {
      let osReparadosTotal = 0;
      let osSemDefeitoTotal = 0;
      let osSucataTotal = 0;

      let osReparadosHoje = 0;
      let osSemDefeitoHoje = 0;
      let osSucataHoje = 0;

      let ultimaAtividade: Date = os.dataEntrada;

      const equipamentosResumo = os.itens.map((it) => {
        let repTotal = 0;
        let semDefTotal = 0;
        let sucTotal = 0;

        let repHoje = 0;
        let semDefHoje = 0;
        let sucHoje = 0;

        const historicoDias: any[] = [];

        for (const p of it.producoes) {
          // Ignorar produções de CQ para as contagens de reparo do técnico
          const isCq = p.servicoRealizado === 'Inspeção CQ' ||
                       p.servicoRealizado === 'Reparo inspecionado e testado pelo CQ' ||
                       (p.observacao && p.observacao.includes('Apontamento de CQ'));
          if (isCq) continue;

          const dProd = new Date(p.dataProducao || p.dataFim || p.dataInicio || p.createdAt);
          if (dProd > ultimaAtividade) {
            ultimaAtividade = dProd;
          }

          const r = p.quantidadeReparada || 0;
          const sd = p.quantidadeSemDefeito || 0;
          const s = p.quantidadeSucata || 0;

          repTotal += r;
          semDefTotal += sd;
          sucTotal += s;

          const isHoje = dProd >= hojeStart && dProd <= hojeEnd;
          if (isHoje) {
            repHoje += r;
            semDefHoje += sd;
            sucHoje += s;
          }

          historicoDias.push({
            id: p.id,
            dataProducao: dProd.toISOString(),
            quantidadeReparada: r,
            quantidadeSemDefeito: sd,
            quantidadeSucata: s,
            quantidadeProduzida: p.quantidadeProduzida,
            servicoRealizado: p.servicoRealizado,
            observacao: p.observacao,
            tecnicoNome: p.tecnico?.nome || 'Técnico',
            status: p.status,
          });
        }

        osReparadosTotal += repTotal;
        osSemDefeitoTotal += semDefTotal;
        osSucataTotal += sucTotal;

        osReparadosHoje += repHoje;
        osSemDefeitoHoje += semDefHoje;
        osSucataHoje += sucHoje;

        return {
          itemId: it.id,
          tipoEquipamentoId: it.tipoEquipamentoId,
          tipoEquipamentoNome: it.tipoEquipamento.nome,
          tipoEquipamentoMarca: it.tipoEquipamento.marca,
          statusItem: it.statusItem,
          quantidadePrevista: it.quantidade,
          // Acumulado da OS para este equipamento
          totalReparadas: repTotal,
          totalSemDefeito: semDefTotal,
          totalSucata: sucTotal,
          totalAcumulado: it.quantidade > 0 ? it.quantidade : (repTotal + semDefTotal + sucTotal),
          // Produção realizada hoje para este equipamento
          hojeReparadas: repHoje,
          hojeSemDefeito: semDefHoje,
          hojeSucata: sucHoje,
          hojeTotal: repHoje + semDefHoje + sucHoje,
          historicoDias,
        };
      });

      // Uma OS é apresentada como um resumo por tipo de equipamento. Itens do
      // mesmo tipo podem coexistir internamente em etapas diferentes (bancada,
      // CQ ou retrabalho), mas isso não deve repetir "ONU" ou "ONT" na tela.
      const equipamentosConsolidados = Array.from(
        equipamentosResumo.reduce((acc: Map<string, any>, equipamento: any) => {
          const existente = acc.get(equipamento.tipoEquipamentoId);
          if (!existente) {
            acc.set(equipamento.tipoEquipamentoId, { ...equipamento, historicoDias: [...equipamento.historicoDias] });
            return acc;
          }

          existente.quantidadePrevista += equipamento.quantidadePrevista;
          existente.totalReparadas += equipamento.totalReparadas;
          existente.totalSemDefeito += equipamento.totalSemDefeito;
          existente.totalSucata += equipamento.totalSucata;
          existente.totalAcumulado = existente.quantidadePrevista > 0
            ? existente.quantidadePrevista
            : (existente.totalReparadas + existente.totalSemDefeito + existente.totalSucata);
          existente.hojeReparadas += equipamento.hojeReparadas;
          existente.hojeSemDefeito += equipamento.hojeSemDefeito;
          existente.hojeSucata += equipamento.hojeSucata;
          existente.hojeTotal += equipamento.hojeTotal;
          existente.historicoDias.push(...equipamento.historicoDias);
          return acc;
        }, new Map<string, any>()).values()
      );

      return {
        id: os.id,
        numeroOS: os.numeroOS,
        clienteNome: os.cliente.nomeRazaoSocial,
        clienteId: os.cliente.id,
        cliente: {
          id: os.cliente.id,
          nomeRazaoSocial: os.cliente.nomeRazaoSocial,
        },
        prioridade: os.prioridade,
        status: os.status,
        dataCriacao: os.dataEntrada.toISOString(),
        dataEntrada: os.dataEntrada.toISOString(),
        dataConclusao: os.dataConclusao?.toISOString() || null,
        ultimaAtividade: ultimaAtividade.toISOString(),
        observacoes: os.observacoes,
        // Totais acumulados da OS
        totalReparados: osReparadosTotal,
        totalGeralReparado: osReparadosTotal,
        totalSemDefeito: osSemDefeitoTotal,
        totalGeralSemDefeito: osSemDefeitoTotal,
        totalSucata: osSucataTotal,
        totalGeralSucata: osSucataTotal,
        totalProcessado: osReparadosTotal + osSemDefeitoTotal + osSucataTotal,
        totalGeralEquipamentos: os.itens.reduce((sum, item) => sum + (item.quantidade || 0), 0) || (osReparadosTotal + osSemDefeitoTotal + osSucataTotal),
        // Totais de hoje desta OS
        hojeReparados: osReparadosHoje,
        hojeSemDefeito: osSemDefeitoHoje,
        hojeSucata: osSucataHoje,
        hojeProcessado: osReparadosHoje + osSemDefeitoHoje + osSucataHoje,
        equipamentos: equipamentosConsolidados,
        historicoDias: Array.from(
          equipamentosConsolidados.reduce((acc: Map<string, any>, it: any) => {
            for (const h of it.historicoDias || []) {
              const dia = (h.dataProducao || '').split('T')[0];
              if (!dia) continue;
              const existing = acc.get(dia) || { data: dia, totalReparado: 0, totalSemDefeito: 0, totalSucata: 0 };
              existing.totalReparado += h.quantidadeReparada || 0;
              existing.totalSemDefeito += h.quantidadeSemDefeito || 0;
              existing.totalSucata += h.quantidadeSucata || 0;
              acc.set(dia, existing);
            }
            return acc;
          }, new Map()).values()
        ),
      };
    });
  } catch (err) {
    console.error('[getMinhasOsEmAndamento] Erro ao consultar OSs em andamento:', err);
    return [];
  }
}

// ─── Busca a Produção de Hoje do Técnico (Consolidada e por OS) ───────────────
export async function getProducaoHojeTecnico(tecnicoId: string) {
  if (!isDatabaseReady()) {
    return {
      totalReparados: 0,
      totalSemDefeito: 0,
      totalSucata: 0,
      totalProcessado: 0,
      totalPontos: 0,
      itensPorOs: [],
    };
  }

  try {
    const aliasIds = await getTecnicoAliasIds(tecnicoId);
    const clean = tecnicoId.replace(/usr-|colab-/g, '');

    const hojeStart = new Date();
    hojeStart.setHours(0, 0, 0, 0);
    const hojeEnd = new Date();
    hojeEnd.setHours(23, 59, 59, 999);

    const producoes = await prisma.producao.findMany({
      where: {
        OR: [
          { tecnicoId: { in: aliasIds } },
          { tecnico: { nome: { contains: clean, mode: 'insensitive' } } },
        ],
        dataProducao: { gte: hojeStart, lte: hojeEnd },
      },
      include: {
        itemOrdemServico: {
          include: {
            ordemServico: { select: { id: true, numeroOS: true, cliente: { select: { nomeRazaoSocial: true } } } },
            tipoEquipamento: true,
          },
        },
      },
      orderBy: { dataProducao: 'desc' },
    });

    let totalRep = 0;
    let totalSemDef = 0;
    let totalSuc = 0;
    let totalPontos = 0;

    // A tela recebe uma linha por OS + tipo de equipamento, e não uma linha
    // por clique/apontamento. O histórico bruto continua preservado no banco,
    // mas o resumo diário fica legível mesmo com muitos lançamentos na mesma OS.
    const resumoPorOsEEquipamento = new Map<string, any>();

    for (const p of producoes) {
      // REGRA OFICIAL: Ignorar registros de inspeção/testes do CQ!
      // A produção de hoje do técnico deve mostrar APENAS o que o técnico consertou na bancada.
      const isCq = p.servicoRealizado === 'Inspeção CQ' ||
                   p.servicoRealizado === 'Reparo inspecionado e testado pelo CQ' ||
                   (p.observacao && p.observacao.includes('Apontamento de CQ'));
      if (isCq) continue;

      const rep = p.quantidadeReparada || 0;
      const semDef = p.quantidadeSemDefeito || 0;
      const suc = p.quantidadeSucata || 0;
      const eqNome = p.itemOrdemServico?.tipoEquipamento?.nome || '';
      const ptsUnit = getPontosUnitarios(eqNome);

      totalRep += rep;
      totalSemDef += semDef;
      totalSuc += suc;
      // REGRA OFICIAL: Apenas reparadas contam pontos! Sem defeito não conta ponto
      totalPontos += rep * ptsUnit;

      const osId = p.itemOrdemServico?.ordemServico?.id || 'sem-os';
      const tipoId = p.itemOrdemServico?.tipoEquipamento?.id || eqNome || 'sem-tipo';
      const key = `${osId}:${tipoId}`;
      const resumoExistente = resumoPorOsEEquipamento.get(key);

      if (resumoExistente) {
        resumoExistente.quantidadeReparada += rep;
        resumoExistente.quantidadeSemDefeito += semDef;
        resumoExistente.quantidadeSucata += suc;
        resumoExistente.quantidadeTotal += rep + semDef + suc;
        resumoExistente.pontosGanhos += rep * ptsUnit;
        resumoExistente.pontos = resumoExistente.pontosGanhos;
        resumoExistente.apontamentos += 1;
      } else {
        resumoPorOsEEquipamento.set(key, {
          producaoId: p.id,
          osId,
          numeroOS: p.itemOrdemServico?.ordemServico?.numeroOS,
          clienteNome: p.itemOrdemServico?.ordemServico?.cliente?.nomeRazaoSocial || 'Cliente',
          tipoEquipamentoNome: eqNome,
          equipamentoNome: eqNome,
          quantidadeReparada: rep,
          quantidadeSemDefeito: semDef,
          quantidadeSucata: suc,
          quantidadeTotal: rep + semDef + suc,
          pontosGanhos: rep * ptsUnit,
          pontos: rep * ptsUnit,
          hora: p.dataProducao,
          dataProducao: p.dataProducao,
          servicoRealizado: p.servicoRealizado,
          apontamentos: 1,
        });
      }
    }

    return {
      data: hojeStart.toISOString().slice(0, 10),
      totalReparados: totalRep,
      totalSemDefeito: totalSemDef,
      totalSucata: totalSuc,
      totalProcessado: totalRep + totalSemDef + totalSuc,
      totalPontos,
      itensPorOs: Array.from(resumoPorOsEEquipamento.values()),
    };
  } catch (err) {
    console.error('[getProducaoHojeTecnico] Erro ao consultar produção de hoje:', err);
    return {
      data: new Date().toISOString().slice(0, 10),
      totalReparados: 0,
      totalSemDefeito: 0,
      totalSucata: 0,
      totalProcessado: 0,
      totalPontos: 0,
      itensPorOs: [],
    };
  }
}

// ─── Conclui a Ordem de Serviço Definitivamente ───────────────────────────────
export async function concluirOrdemServico(osIdOrNumero: string | number, tecnicoId: string, observacao?: string) {
  if (!isDatabaseReady()) throw new Error('Banco de dados indisponível.');

  const str = String(osIdOrNumero);
  const num = parseInt(str.replace(/\D/g, ''));
  const isUuid = str.length > 20 && str.includes('-');

  const osDb = await prisma.ordemServico.findFirst({
    where: isUuid
      ? { id: str }
      : !isNaN(num) && num > 0
      ? { OR: [{ id: str }, { numeroOS: num }] }
      : { id: str },
    include: {
      itens: {
        include: { tipoEquipamento: true },
      },
      cliente: true,
    },
  });

  if (!osDb) {
    throw new Error('Ordem de Serviço não encontrada.');
  }

  if (osDb.status === 'CONCLUIDO') {
    return osDb;
  }

  const agora = new Date();
  const obsAtualizada = observacao
    ? `${osDb.observacoes ? osDb.observacoes + ' | ' : ''}Concluída em ${agora.toLocaleDateString('pt-BR')}: ${observacao}`
    : osDb.observacoes;

  const updatedOs = await prisma.$transaction(async (tx) => {
    // 1. Atualiza OS para CONCLUIDO e salva dataConclusao
    const osAtualizada = await tx.ordemServico.update({
      where: { id: osDb.id },
      data: {
        status: 'CONCLUIDO',
        dataConclusao: agora,
        observacoes: obsAtualizada,
      },
      include: {
        cliente: true,
        itens: {
          include: { tipoEquipamento: true },
        },
      },
    });

    // 2. Atualiza todos os itens da OS para CONCLUIDO
    await tx.itemOrdemServico.updateMany({
      where: { ordemServicoId: osDb.id },
      data: { statusItem: 'CONCLUIDO' },
    });

    // 3. Finaliza produções ativas que ainda estejam em andamento nesta OS
    await tx.producao.updateMany({
      where: {
        itemOrdemServico: { ordemServicoId: osDb.id },
        status: 'EM_ANDAMENTO',
      },
      data: {
        status: 'FINALIZADO',
        dataFim: agora,
      },
    });

    return osAtualizada;
  }, { maxWait: 10000, timeout: 30000 });

  return updatedOs;
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

// ─── Despacha a Ordem de Serviço inteira e todos os itens para o CQ ────────────
export async function despacharOrdemServicoParaCQ(
  osIdOrNumero: string | number,
  tecnicoId: string,
  observacao?: string
) {
  if (!isDatabaseReady()) throw new Error('Banco de dados indisponível.');

  const str = String(osIdOrNumero);
  const num = parseInt(str.replace(/\D/g, ''));
  const isUuid = str.length > 20 && str.includes('-');

  const osDb = await prisma.ordemServico.findFirst({
    where: isUuid
      ? { id: str }
      : !isNaN(num) && num > 0
      ? { OR: [{ id: str }, { numeroOS: num }] }
      : { id: str },
    include: {
      itens: {
        include: { tipoEquipamento: true },
      },
      cliente: true,
    },
  });

  if (!osDb) {
    throw new Error('Ordem de Serviço não encontrada.');
  }

  const agora = new Date();
  const obsAtualizada = observacao
    ? `${osDb.observacoes ? osDb.observacoes + ' | ' : ''}[Enviada ao CQ em ${agora.toLocaleDateString('pt-BR')}]: ${observacao}`
    : osDb.observacoes;

  const updatedOs = await prisma.$transaction(async (tx) => {
    // 1. Atualizar a OS para AGUARDANDO_TESTE
    const osAtualizada = await tx.ordemServico.update({
      where: { id: osDb.id },
      data: {
        status: 'AGUARDANDO_TESTE',
        observacoes: obsAtualizada,
      },
      include: {
        cliente: true,
        itens: {
          include: { tipoEquipamento: true },
        },
      },
    });

    // 2. Atualizar todos os itens da OS para AGUARDANDO_TESTE
    await tx.itemOrdemServico.updateMany({
      where: { ordemServicoId: osDb.id },
      data: { statusItem: 'AGUARDANDO_TESTE' },
    });

    // 3. Finalizar produções ativas ou em andamento desta OS
    await tx.producao.updateMany({
      where: {
        itemOrdemServico: { ordemServicoId: osDb.id },
        status: 'EM_ANDAMENTO',
      },
      data: {
        status: 'FINALIZADO',
        dataFim: agora,
      },
    });

    // 4. Registrar no histórico de status
    try {
      const tecnicoDbId = await ensureUsuarioDbId(tecnicoId, 'TECNICO');
      await tx.historicoStatus.create({
        data: {
          ordemServicoId: osDb.id,
          statusAnterior: osDb.status,
          statusNovo: 'AGUARDANDO_TESTE',
          usuarioId: tecnicoDbId,
          observacao: observacao || 'OS despachada para a fila de testes do CQ pelo técnico.',
        },
      });
    } catch {
      // Histórico opcional se usuário não tiver FK direta
    }

    return osAtualizada;
  }, { maxWait: 10000, timeout: 30000 });

  return updatedOs;
}

// ─── Exclui uma Ordem de Serviço incorreta/errada (com cascata limpa) ────────
export async function excluirOrdemServico(
  osIdOrNumero: string | number,
  usuarioId: string
) {
  if (!isDatabaseReady()) throw new Error('Banco de dados indisponível.');

  const str = String(osIdOrNumero);
  const num = parseInt(str.replace(/\D/g, ''));
  const isUuid = str.length > 20 && str.includes('-');

  const osDb = await prisma.ordemServico.findFirst({
    where: isUuid
      ? { id: str }
      : !isNaN(num) && num > 0
      ? { OR: [{ id: str }, { numeroOS: num }] }
      : { id: str },
    include: {
      itens: true,
      cliente: true,
    },
  });

  if (!osDb) {
    throw new Error('Ordem de Serviço não encontrada para exclusão.');
  }

  const numeroOS = osDb.numeroOS;
  const osId = osDb.id;

  await prisma.$transaction(async (tx) => {
    // 1. Exclusão determinística e segura em cascata
    const itemIds = osDb.itens.map((it) => it.id);
    if (itemIds.length > 0) {
      await tx.retrabalho.deleteMany({
        where: { itemOrdemServicoId: { in: itemIds } },
      });
      await tx.teste.deleteMany({
        where: { producao: { itemOrdemServicoId: { in: itemIds } } },
      });
      await tx.producao.deleteMany({
        where: { itemOrdemServicoId: { in: itemIds } },
      });
      await tx.itemOrdemServico.deleteMany({
        where: { ordemServicoId: osId },
      });
    }

    await tx.historicoStatus.deleteMany({
      where: { ordemServicoId: osId },
    });

    await tx.ordemServico.delete({
      where: { id: osId },
    });
  }, { maxWait: 10000, timeout: 30000 });

  return { id: osId, numeroOS };
}
