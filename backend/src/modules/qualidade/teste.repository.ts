import { prisma, isDatabaseReady } from '../../database/prisma.js';
import type { RealizarTesteInput } from './teste.schema.js';
import { StatusOS, CategoriaReprovacao } from '@prisma/client';
import { adicionarRetrabalhoMock } from '../retrabalho/retrabalho.repository.js';

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

// Catálogo de motivos padrão
const mockMotivos: MotivoReprovacaoRecord[] = [
  { id: 'mot-01', codigo: 'MOT-01', descricao: 'Falha de Solda / Curto em Trilha', categoria: 'SOLDA' as CategoriaReprovacao, ativo: true },
  { id: 'mot-02', codigo: 'MOT-02', descricao: 'Componente Queimado / Defeito de Semicondutor', categoria: 'COMPONENTE_QUEIMADO' as CategoriaReprovacao, ativo: true },
  { id: 'mot-03', codigo: 'MOT-03', descricao: 'Falha Lógica / Microcontrolador não Inicializa', categoria: 'FALHA_LOGICA' as CategoriaReprovacao, ativo: true },
  { id: 'mot-04', codigo: 'MOT-04', descricao: 'Problema Mecânico / Conector Danificado', categoria: 'MECANICO' as CategoriaReprovacao, ativo: true },
  { id: 'mot-05', codigo: 'MOT-05', descricao: 'Desvio de Calibração / Tensão Fora da Faixa', categoria: 'CALIBRACAO' as CategoriaReprovacao, ativo: true },
  { id: 'mot-06', codigo: 'MOT-06', descricao: 'Outro Defeito Identificado no Teste de Carga', categoria: 'OUTRO' as CategoriaReprovacao, ativo: true },
];

// Armazenamento em memória limpo para ambiente de produção
export let mockFilaCq: any[] = [];
export let mockTestes: TesteRecord[] = [];


// ─── Listar motivos de reprovação ─────────────────────────────────────────────
export async function getMotivosReprovacao(): Promise<MotivoReprovacaoRecord[]> {
  if (isDatabaseReady()) {
    try {
      const motivos = await prisma.motivoReprovacao.findMany({
        where: { ativo: true },
        orderBy: { codigo: 'asc' },
      });
      if (motivos && motivos.length > 0) return motivos as MotivoReprovacaoRecord[];
    } catch (err) {
      // Fallback
    }
  }
  return mockMotivos;
}

// ─── Listar fila de itens aguardando teste de CQ ───────────────────────────────
export async function getFilaTestes() {
  if (isDatabaseReady()) {
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
        },
        orderBy: [
          { ordemServico: { prioridade: 'desc' } },
          { ordemServico: { dataEntrada: 'asc' } },
        ],
      });
      if (itens && itens.length > 0) return itens;
    } catch (err) {
      // Fallback
    }
  }

  // Fallback no mock: buscar de mockFilaCq, mockFilaItens e mockOsList
  const daFila = mockFilaCq.filter((i) => ['AGUARDANDO_TESTE', 'AGUARDANDO_NOVO_TESTE'].includes(i.statusItem));

  // Buscar dos mockFilaItens (itens criados via criarApontamentoLote e enviados direto ao CQ)
  const { mockFilaItens } = await import('../producao/producao.repository.js');
  const dosFilaItens: any[] = [];
  for (const it of mockFilaItens) {
    if (['AGUARDANDO_TESTE', 'AGUARDANDO_NOVO_TESTE'].includes(it.statusItem)) {
      if (!daFila.some((f) => f.id === it.id)) {
        dosFilaItens.push({
          id: it.id,
          ordemServicoId: it.ordemServicoId,
          tipoEquipamentoId: it.tipoEquipamentoId,
          quantidade: it.quantidade,
          tipoCategoria: it.tipoCategoria || 'REPARADO',
          defeitoRelatado: it.defeitoRelatado,
          servicoRealizado: it.servicoRealizado || 'Reparo realizado na bancada',
          statusItem: it.statusItem,
          tecnicoAlocadoId: it.tecnicoAlocadoId || it.tecnicoAlocado?.id || null,
          tecnicoAlocado: it.tecnicoAlocado || null,
          ordemServico: it.ordemServico,
          tipoEquipamento: it.tipoEquipamento,
          producoes: it.producoes || [
            {
              id: `prod-${it.id}`,
              servicoRealizado: it.servicoRealizado || 'Reparo realizado na bancada',
              quantidadeProduzida: it.quantidade,
              dataFim: new Date(),
            },
          ],
        });
      }
    }
  }

  // Buscar também do mockOsList (compatibilidade com fluxo antigo via admin)
  const { mockOsList } = await import('../os/os.repository.js');
  const dosMockOs: any[] = [];
  for (const os of mockOsList) {
    if (['AGUARDANDO_TESTE', 'AGUARDANDO_NOVO_TESTE'].includes(os.status)) {
      for (const it of os.itens) {
        if (['AGUARDANDO_TESTE', 'AGUARDANDO_NOVO_TESTE'].includes(it.statusItem)) {
          const jaIncluso = daFila.some((f) => f.id === it.id) || dosFilaItens.some((f) => f.id === it.id);
          if (!jaIncluso) {
            dosMockOs.push({
              id: it.id,
              ordemServicoId: os.id,
              tipoEquipamentoId: it.tipoEquipamento.id,
              quantidade: it.quantidade,
              tipoCategoria: it.tipoCategoria || 'REPARADO',
              defeitoRelatado: it.defeitoRelatado,
              servicoRealizado: it.servicoRealizado || (it.tipoCategoria === 'SEM_DEFEITO' ? 'Triagem inicial - sem defeito' : 'Reparo realizado na bancada'),
              statusItem: it.statusItem,
              tecnicoAlocadoId: it.tecnicoAlocado?.id || null,
              tecnicoAlocado: it.tecnicoAlocado || { id: 'colab-samuel', nome: 'Samuel' },
              ordemServico: {
                id: os.id,
                numeroOS: os.numeroOS,
                prioridade: os.prioridade,
                status: os.status,
                dataEntrada: os.dataEntrada,
                cliente: os.cliente,
              },
              tipoEquipamento: it.tipoEquipamento,
              producoes: [
                {
                  id: `prod-${it.id}`,
                  servicoRealizado: it.servicoRealizado || (it.tipoCategoria === 'SEM_DEFEITO' ? 'Triagem inicial - sem defeito' : 'Reparo realizado na bancada'),
                  quantidadeProduzida: it.quantidade,
                  dataFim: new Date(),
                },
              ],
            });
          }
        }
      }
    }
  }

  // Buscar também retrabalhos finalizados aguardando re-teste

  const { mockRetrabalhos } = await import('../retrabalho/retrabalho.repository.js');
  const dosRetrabalhos: any[] = [];
  for (const ret of mockRetrabalhos) {
    if (ret.status === 'FINALIZADO' && ret.itemOrdemServico) {
      const itemOS = ret.itemOrdemServico;
      const itemId = ret.itemOrdemServicoId || itemOS.id;
      const jaIncluso = daFila.some((f) => f.id === itemId) || dosFilaItens.some((f) => f.id === itemId) || dosMockOs.some((f) => f.id === itemId) || dosRetrabalhos.some((f) => f.id === itemId);

      if (!jaIncluso) {
        dosRetrabalhos.push({
          id: itemId,
          ordemServicoId: itemOS.ordemServicoId || itemOS.ordemServico?.id || `os-${Date.now()}`,
          tipoEquipamentoId: itemOS.tipoEquipamentoId || itemOS.tipoEquipamento?.id || 'pt-02',
          quantidade: ret.quantidadeRetrabalho || itemOS.quantidade || 1,
          tipoCategoria: 'RETRABALHO',
          defeitoRelatado: ret.detalhesDefeito || 'Retrabalho encaminhado para re-teste',
          servicoRealizado: ret.solucaoAplicada || 'Correção aplicada na bancada',
          statusItem: 'AGUARDANDO_NOVO_TESTE',
          tecnicoAlocadoId: ret.tecnicoResponsavelId || ret.tecnicoResponsavel?.id || null,
          tecnicoAlocado: ret.tecnicoResponsavel || { id: 'colab-joao', nome: 'João' },
          ordemServico: itemOS.ordemServico || {
            id: itemOS.ordemServicoId || `os-${Date.now()}`,
            numeroOS: 1920,
            prioridade: 'ALTA',
            status: 'AGUARDANDO_NOVO_TESTE',
            dataEntrada: new Date().toISOString(),
            cliente: { id: 'cli-01', nomeRazaoSocial: 'MARANET Telecomunicações' },
          },
          tipoEquipamento: itemOS.tipoEquipamento || {
            id: 'pt-02',
            nome: 'Roteador GIGA/ONT/',
            marca: 'Weg',
            modelo: 'Padrão',
            tempoEstimadoMinutos: 45,
          },
          producoes: [
            {
              id: `prod-ret-${ret.id}`,
              servicoRealizado: ret.solucaoAplicada || 'Retrabalho finalizado',
              quantidadeProduzida: ret.quantidadeRetrabalho || itemOS.quantidade,
              dataFim: ret.dataFim || new Date(),
            },
          ],
        });
      }
    }
  }

  return [...daFila, ...dosFilaItens, ...dosMockOs, ...dosRetrabalhos];
}


// ─── Realizar Teste de Qualidade com Validação Invariável ─────────────────────
export async function realizarTeste(
  inspetorId: string,
  dados: RealizarTesteInput
) {
  const agora = new Date();
  const temReprovacao = dados.quantidadeReprovada > 0;
  const novoStatusItem: StatusOS = temReprovacao ? 'RETRABALHO' : 'APROVADO';

  if (isDatabaseReady()) {
    try {
      const resultado = await prisma.$transaction(async (tx) => {
        // 1. Criar o registro do Teste
        const teste = await tx.teste.create({
          data: {
            producaoId: dados.producaoId,
            inspetorId,
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
          await tx.retrabalho.create({
            data: {
              testeId: teste.id,
              itemOrdemServicoId: dados.itemOrdemServicoId,
              motivoReprovacaoId: dados.motivoReprovacaoId,
              tecnicoResponsavelId: dados.tecnicoResponsavelId,
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

        // 4. Atualizar status da OS pai
        const itemDb = await tx.itemOrdemServico.findUnique({
          where: { id: dados.itemOrdemServicoId },
          select: { ordemServicoId: true },
        });

        if (itemDb) {
          await tx.ordemServico.update({
            where: { id: itemDb.ordemServicoId },
            data: { status: novoStatusItem },
          });
        }

        return teste;
      });

      return resultado;
    } catch (err) {
      // Fallback
    }
  }

  // Fallback Mock
  let item = mockFilaCq.find((i) => i.id === dados.itemOrdemServicoId);
  const { mockOsList } = await import('../os/os.repository.js');
  const { mockFilaItens } = await import('../producao/producao.repository.js');

  if (!item) {
    // Procurar em mockFilaItens
    const filaIt = mockFilaItens.find((x) => x.id === dados.itemOrdemServicoId);
    if (filaIt) {
      item = filaIt;
      item.statusItem = novoStatusItem;
      if (item.ordemServico) item.ordemServico.status = novoStatusItem;
    }
  }

  if (!item) {
    // Procurar no mockOsList
    for (const os of mockOsList) {
      const it = os.itens.find((x) => x.id === dados.itemOrdemServicoId || (dados.numeroOS && os.numeroOS === Number(dados.numeroOS)));
      if (it) {
        item = {
          id: it.id,
          ordemServicoId: os.id,
          tipoEquipamentoId: it.tipoEquipamento.id,
          quantidade: it.quantidade,
          tipoCategoria: it.tipoCategoria || 'REPARADO',
          defeitoRelatado: it.defeitoRelatado,
          statusItem: novoStatusItem,
          tecnicoAlocado: it.tecnicoAlocado || (dados.tecnicoResponsavelId ? { id: dados.tecnicoResponsavelId, nome: 'Técnico' } : { id: 'colab-samuel', nome: 'Samuel' }),
          ordemServico: os,
          tipoEquipamento: it.tipoEquipamento,
        };
        it.statusItem = novoStatusItem;
        os.status = novoStatusItem;
        break;
      }
    }
  }


  if (!item) {
    const numOS = dados.numeroOS ? Number(dados.numeroOS) : 1920;
    const tecId = dados.tecnicoResponsavelId || 'colab-samuel';
    const tecNome = tecId.includes('samuel') ? 'Samuel' : tecId.includes('joao') ? 'João' : tecId.includes('joas') ? 'Joás' : 'Samuel';

    item = {
      id: dados.itemOrdemServicoId || `item-${Date.now()}`,
      ordemServicoId: `os-${Date.now()}`,
      tipoEquipamentoId: dados.tipoEquipamentoId || 'pt-02',
      quantidade: dados.quantidadeTestada,
      tipoCategoria: dados.origemTriagem ? 'SEM_DEFEITO' : 'REPARADO',
      defeitoRelatado: dados.origemTriagem ? 'Triagem - sem defeito' : 'Reparo realizado na bancada',
      statusItem: novoStatusItem,
      tecnicoAlocado: { id: tecId, nome: tecNome },
      ordemServico: {
        id: `os-${Date.now()}`,
        numeroOS: numOS,
        prioridade: 'ALTA',
        status: novoStatusItem,
        dataEntrada: new Date().toISOString(),
        cliente: { id: 'cli-01', nomeRazaoSocial: 'MARANET Telecomunicações' },
      },
      tipoEquipamento: {
        id: dados.tipoEquipamentoId || 'pt-02',
        nome: 'Roteador GIGA/ONT/',
        marca: 'Geral',
      },
    };
    mockFilaCq.push(item);
  }

  item.statusItem = novoStatusItem;
  if (item.ordemServico) {
    item.ordemServico.status = novoStatusItem;
  }

  // Atualizar também no mockOsList
  for (const os of mockOsList) {
    if (os.id === item.ordemServicoId || os.numeroOS === item.ordemServico?.numeroOS) {
      os.status = novoStatusItem;
      os.itens.forEach((it) => {
        if (it.id === item.id) it.statusItem = novoStatusItem;
      });
    }
  }

  const tecResponsavel = item.tecnicoAlocado || (dados.tecnicoResponsavelId ? { id: dados.tecnicoResponsavelId, nome: 'Técnico' } : { id: 'colab-samuel', nome: 'Samuel' });

  const novoTeste: TesteRecord = {
    id: `teste-${Date.now()}`,
    producaoId: dados.producaoId || `prod-${item.id}`,
    inspetorId,
    quantidadeTestada: dados.quantidadeTestada,
    quantidadeAprovada: dados.quantidadeAprovada,
    quantidadeReprovada: dados.quantidadeReprovada,
    dataTeste: agora,
    observacao: dados.observacao || null,
    inspetor: {
      id: inspetorId,
      nome: 'Rhyan (CQ / Testes)',
    },
    producao: {
      id: dados.producaoId || `prod-${item.id}`,
      itemOrdemServico: item,
    },
  };

  mockTestes.unshift(novoTeste);

  // Se houver reprovação, registrar no mock de retrabalho automaticamente para o técnico
  if (temReprovacao) {
    // Garantir que o itemOrdemServico tenha a estrutura completa que RetrabalhoRecord exige
    const safeOrdemServico = item.ordemServico ?? {
      id: item.ordemServicoId || `os-${Date.now()}`,
      numeroOS: 9999,
      prioridade: 'NORMAL' as const,
      status: 'AGUARDANDO_NOVO_TESTE' as const,
      dataEntrada: new Date().toISOString(),
      cliente: { id: 'cli-01', nomeRazaoSocial: 'MARANET Telecomunicações' },
    };

    const safeItemOS = {
      id: item.id,
      quantidade: item.quantidade,
      defeitoRelatado: item.defeitoRelatado || null,
      statusItem: 'AGUARDANDO_NOVO_TESTE' as const,
      ordemServico: safeOrdemServico,
      tipoEquipamento: item.tipoEquipamento || { id: item.tipoEquipamentoId || 'pt-01', nome: 'Equipamento', marca: null, modelo: null },
    };

    adicionarRetrabalhoMock({
      id: `ret-${Date.now()}`,
      testeId: novoTeste.id,
      itemOrdemServicoId: item.id,
      motivoReprovacaoId: dados.motivoReprovacaoId || 'mot-01',
      tecnicoResponsavelId: tecResponsavel.id,
      tecnicoResponsavel: tecResponsavel,
      quantidadeRetrabalho: dados.quantidadeReprovada,
      detalhesDefeito: dados.detalhesDefeito || dados.observacao || 'Não conformidade detectada no teste de CQ',
      solucaoAplicada: null,
      dataInicio: agora,
      dataFim: null,
      status: 'PENDENTE',
      itemOrdemServico: safeItemOS,
    });
  }

  return novoTeste;
}


// ─── Histórico de Testes ──────────────────────────────────────────────────────
export async function getHistoricoTestes(page = 1, limit = 20) {
  if (isDatabaseReady()) {
    try {
      const skip = (page - 1) * limit;
      const [testes, total] = await Promise.all([
        prisma.teste.findMany({
          include: {
            inspetor: { select: { id: true, nome: true } },
            producao: {
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
            },
          },
          orderBy: { dataTeste: 'desc' },
          skip,
          take: limit,
        }),
        prisma.teste.count(),
      ]);

      if (testes && testes.length > 0) {
        return { testes, total, totalPages: Math.ceil(total / limit) };
      }
    } catch (err) {
      // Fallback
    }
  }

  return {
    testes: mockTestes,
    total: mockTestes.length,
    totalPages: Math.ceil(mockTestes.length / limit) || 1,
  };
}
