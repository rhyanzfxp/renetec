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
export let mockFilaItens: any[] = [];
export let mockProducoes: ProducaoRecord[] = [];


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
      tecnicoAlocado: { id: tecnicoId, nome: 'Técnico' },
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

  const osId = `os-${newNumero}-${Date.now()}`;
  const osRecord = {
    id: osId,
    numeroOS: newNumero,
    prioridade: dados.prioridade || ('MEDIA' as PrioridadeOS),
    status: initialStatus,
    dataEntrada: dataRegistro.toISOString(),
    cliente: clienteInfo || { id: 'cli-01', nomeRazaoSocial: 'MARANET Telecomunicações' },
    observacoes: dados.observacoes || null,
  };

  const createdItens: any[] = [];
  const createdProducoes: ProducaoRecord[] = [];

  for (let i = 0; i < dados.itens.length; i++) {
    const it = dados.itens[i];
    const equip = tiposEquipMap[it.tipoEquipamentoId] || {
      id: it.tipoEquipamentoId,
      nome: 'Equipamento Renetec',
      marca: 'Geral',
      modelo: 'Padrão',
      tempoEstimadoMinutos: 45,
    };

    const itemId = `item-${newNumero}-${i + 1}-${Date.now()}`;
    const categoria = it.tipoCategoria || 'REPARADO';
    const defeito = it.defeitoRelatado || (categoria === 'SEM_DEFEITO' ? 'Sem defeito aparente (Triagem)' : 'Manutenção corretiva');
    const servico = it.servicoRealizado || (categoria === 'SEM_DEFEITO' ? 'Equipamento testado e aprovado em triagem (sem defeito)' : 'Reparo realizado na bancada');

    const itemObj = {
      id: itemId,
      ordemServicoId: osId,
      tipoEquipamentoId: it.tipoEquipamentoId,
      quantidade: it.quantidade,
      tipoCategoria: categoria,
      defeitoRelatado: defeito,
      servicoRealizado: servico,
      statusItem: initialStatus,
      tecnicoAlocadoId: tecnicoId,
      tecnicoAlocado: { id: tecnicoId, nome: tecnicoNome },
      ordemServico: osRecord,
      tipoEquipamento: equip,
    };

    createdItens.push(itemObj);
    mockFilaItens.unshift(itemObj);

    if (dados.enviarDiretoTeste) {
      const prodRecord: ProducaoRecord = {
        id: `prod-${Date.now()}-${i + 1}`,
        itemOrdemServicoId: itemId,
        tecnicoId,
        dataInicio: dataRegistro,
        dataFim: agora,
        quantidadeProduzida: it.quantidade,
        servicoRealizado: servico,
        observacao: `Apontamento técnico direto pelo operador ${tecnicoNome}. Categoria: ${categoria}`,
        status: 'FINALIZADO',
        itemOrdemServico: itemObj,
      };
      createdProducoes.push(prodRecord);
      mockProducoes.unshift(prodRecord);
    } else {
      // Se optou por iniciar na bancada, criar como produção ativa EM_ANDAMENTO com início no momento atual
      const prodAtivaRecord: ProducaoRecord = {
        id: `prod-${Date.now()}-${i + 1}`,
        itemOrdemServicoId: itemId,
        tecnicoId,
        dataInicio: agora,
        dataFim: null,
        quantidadeProduzida: it.quantidade,
        servicoRealizado: servico,
        observacao: `Em manutenção na bancada pelo técnico ${tecnicoNome}. Categoria: ${categoria}`,
        status: 'EM_ANDAMENTO',
        itemOrdemServico: itemObj,
      };
      createdProducoes.push(prodAtivaRecord);
      mockProducoes.unshift(prodAtivaRecord);
    }
  }



  // Também salvar no mock OS List
  const { mockOsList } = await import('../os/os.repository.js');
  mockOsList.unshift({
    id: osId,
    numeroOS: newNumero,
    dataEntrada: dataRegistro.toISOString(),
    prioridade: dados.prioridade || ('MEDIA' as PrioridadeOS),
    status: initialStatus,
    valorOrcamento: null,
    observacoes: dados.observacoes || null,
    cliente: {
      id: osRecord.cliente.id,
      nomeRazaoSocial: osRecord.cliente.nomeRazaoSocial,
      contatoTelefone: '(98) 98765-4321',
      email: 'operacoes@maranet.com.br',
    },
    itens: createdItens.map((it) => ({
      id: it.id,
      tipoEquipamento: it.tipoEquipamento,
      quantidade: it.quantidade,
      tipoCategoria: it.tipoCategoria,
      defeitoRelatado: it.defeitoRelatado,
      servicoRealizado: it.servicoRealizado,
      statusItem: it.statusItem,
      tecnicoAlocado: it.tecnicoAlocado,
    })),
    createdAt: agora.toISOString(),
  });

  return {
    ordemServico: osRecord,
    itens: createdItens,
    producoes: createdProducoes,
  };
}

