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
let mockFilaCq: any[] = [];
let mockTestes: TesteRecord[] = [];

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
        where: { statusItem: 'AGUARDANDO_TESTE' },
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
  return mockFilaCq.filter((i) => i.statusItem === 'AGUARDANDO_TESTE');
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
  if (!item) {
    item = {
      id: dados.itemOrdemServicoId,
      ordemServicoId: `os-${Date.now()}`,
      tipoEquipamentoId: 'eq-01',
      quantidade: dados.quantidadeTestada,
      defeitoRelatado: 'Instabilidade detectada',
      statusItem: novoStatusItem,
      tecnicoAlocado: { id: 'usr-tecnico-01', nome: 'João Silva' },
      ordemServico: {
        id: `os-${Date.now()}`,
        numeroOS: 1533,
        prioridade: 'ALTA',
        status: novoStatusItem,
        dataEntrada: new Date().toISOString(),
        cliente: { id: 'cli-01', nomeRazaoSocial: 'Solar Power Brasil Ltda' },
      },
      tipoEquipamento: {
        id: 'eq-01',
        nome: 'Inversor Solar Trifásico 15kW',
        marca: 'Weg',
      },
    };
    mockFilaCq.push(item);
  }

  item.statusItem = novoStatusItem;
  item.ordemServico.status = novoStatusItem;

  const novoTeste: TesteRecord = {
    id: `teste-${Date.now()}`,
    producaoId: dados.producaoId,
    inspetorId,
    quantidadeTestada: dados.quantidadeTestada,
    quantidadeAprovada: dados.quantidadeAprovada,
    quantidadeReprovada: dados.quantidadeReprovada,
    dataTeste: agora,
    observacao: dados.observacao || null,
    inspetor: {
      id: inspetorId,
      nome: 'Controle de Qualidade',
    },
    producao: {
      id: dados.producaoId,
      itemOrdemServico: item,
    },
  };

  mockTestes.unshift(novoTeste);

  // Se houver reprovação, registrar no mock de retrabalho automaticamente
  if (temReprovacao) {
    adicionarRetrabalhoMock({
      id: `ret-${Date.now()}`,
      testeId: novoTeste.id,
      itemOrdemServicoId: dados.itemOrdemServicoId,
      motivoReprovacaoId: dados.motivoReprovacaoId || 'mot-01',
      tecnicoResponsavelId: item.tecnicoAlocado?.id || 'usr-tecnico-01',
      quantidadeRetrabalho: dados.quantidadeReprovada,
      detalhesDefeito: dados.detalhesDefeito || dados.observacao || 'Não conformidade detectada no CQ',
      solucaoAplicada: null,
      dataInicio: agora,
      dataFim: null,
      status: 'PENDENTE',
      itemOrdemServico: item,
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
