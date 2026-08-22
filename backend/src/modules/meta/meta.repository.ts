import { prisma, isDatabaseReady } from '../../database/prisma.js';
import type { UpdateMetaConfigInput } from './meta.schema.js';

export interface TabelaPontuacaoItem {
  id: string;
  equipamentoServico: string;
  pontos: number;
  observacao: string;
}

export interface ColaboradorMeta {
  id: string;
  nome: string;
  funcao: string;
  pesoBonus: number; // ex: 0.22 ou 0.17
  pontosRealizados: number;
  percentualTotal: number;
  metaIndividualCumprida: boolean;
}

export interface MetaConfigRecord {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  // Faixas Oficiais em Pontos
  metaBase: number;
  metaAlvo: number;
  metaExcelencia: number;
  // Período Piloto
  isPeriodoPiloto: boolean;
  metaPilotoMinima: number;
  metaPilotoAlvo: number;
  metaPilotoExcelencia: number;
  // Parâmetros de Qualidade e Bônus
  retrabalhoMaximo: number; // 0.05 (5%)
  percentualFundoBonus: number; // 0.015 (1.5%)
  percentualColetivo: number; // 0.70 (70%)
  percentualIndividual: number; // 0.30 (30%)
  faturamentoRecebido: number;
  diasUteis: number;
  ativo: boolean;
}

export interface HistoricoMetaRecord {
  mes: number;
  ano: number;
  metaBase: number;
  metaAlvo: number;
  metaExcelencia: number;
  pontosRealizados: number;
  atingido: 'ABAIXO_DA_META' | 'META_BASE' | 'META_ALVO' | 'META_EXCELENCIA';
  percentualAlvo: number;
  faturamento: number;
  bonusDistribuido: number;
}

export interface GuiaComoUsarItem {
  etapa: number;
  quando: string;
  oQueFazer: string;
}

// ─── TABELA OFICIAL DE PONTUAÇÃO (Planilha: Aba 'Pontuação') ─────────────────
export const TABELA_PONTUACAO_OFICIAL: TabelaPontuacaoItem[] = [
  {
    id: 'pt-01',
    equipamentoServico: 'ONU simples',
    pontos: 1.0,
    observacao: 'Reparo padrão',
  },
  {
    id: 'pt-02',
    equipamentoServico: 'Roteador GIGA/ONT/',
    pontos: 1.5,
    observacao: 'Reparo/manutenção',
  },
  {
    id: 'pt-03',
    equipamentoServico: 'Rádio / SXT / Nano / Airgrid / LiteBeam',
    pontos: 1.5,
    observacao: 'Reparo/manutenção',
  },
  {
    id: 'pt-04',
    equipamentoServico: 'RB/BASEBOX/',
    pontos: 2.0,
    observacao: 'Conforme avaliação',
  },
  {
    id: 'pt-05',
    equipamentoServico: 'Placa / PACPON',
    pontos: 2.0,
    observacao: 'Reparo/manutenção',
  },
  {
    id: 'pt-06',
    equipamentoServico: 'CCR/MIMOSAS/RADIOS AC',
    pontos: 2.5,
    observacao: 'Equipamento de maior complexidade',
  },
  {
    id: 'pt-07',
    equipamentoServico: 'OLT/SWITCH/NE E OUTROS',
    pontos: 3.0,
    observacao: 'Equipamento complexo',
  },
  {
    id: 'pt-08',
    equipamentoServico: 'Reparo eletrônico / diagnóstico complexo',
    pontos: 3.0,
    observacao: 'Serviço especial',
  },
];

// ─── GUIA OPERACIONAL "COMO USAR" (Planilha: Aba 'Como usar') ────────────────
export const GUIA_COMO_USAR_OFICIAL: GuiaComoUsarItem[] = [
  {
    etapa: 1,
    quando: 'Todos os dias',
    oQueFazer: "Abra 'Lançamentos' e registre cada serviço concluído pelos técnicos.",
  },
  {
    etapa: 2,
    quando: 'Equipamento',
    oQueFazer: "Use exatamente um dos nomes cadastrados na aba 'Pontuação' para a pontuação automática funcionar.",
  },
  {
    etapa: 3,
    quando: 'Rhyan',
    oQueFazer: 'Registre se o equipamento foi testado e o resultado do teste. O objetivo é garantir qualidade, não aprovar tudo.',
  },
  {
    etapa: 4,
    quando: 'Retrabalho',
    oQueFazer: "Marque 'Sim' quando o equipamento retornar por problema relacionado ao reparo.",
  },
  {
    etapa: 5,
    quando: 'Luana',
    oQueFazer: "A produção comercial pode ser acompanhada inicialmente em 'Bônus'; depois podemos criar indicadores comerciais detalhados.",
  },
  {
    etapa: 6,
    quando: 'Dashboard',
    oQueFazer: 'Acompanhe pontos, meta, retrabalho e faturamento. Os cálculos e termômetros são gerados em tempo real.',
  },
  {
    etapa: 7,
    quando: 'Bônus',
    oQueFazer: "Informe o faturamento recebido no mês na célula de faturamento. O fundo potencial e a partilha 70/30 são calculados automaticamente.",
  },
  {
    etapa: 8,
    quando: 'Revisão',
    oQueFazer: 'No final do período piloto, use os dados reais para ajustar a pontuação e a meta dos meses subsequentes.',
  },
];

// ─── MOCK CONFIGURAÇÃO DA META (Planilha: Aba 'Metas') ───────────────────────
let mockMetaConfig: MetaConfigRecord = {
  id: 'meta-config-renetec-2026',
  mesReferencia: new Date().getMonth() + 1,
  anoReferencia: new Date().getFullYear(),
  metaBase: 250,
  metaAlvo: 300,
  metaExcelencia: 350,
  isPeriodoPiloto: false,
  metaPilotoMinima: 160,
  metaPilotoAlvo: 190,
  metaPilotoExcelencia: 220,
  retrabalhoMaximo: 0.05,
  percentualFundoBonus: 0.015,
  percentualColetivo: 0.70,
  percentualIndividual: 0.30,
  faturamentoRecebido: 0,
  diasUteis: 22,
  ativo: true,
};

// ─── EQUIPE OFICIAL RENETEC COM PESOS (Planilha: Aba 'Bônus') ────────────────
let mockColaboradores: ColaboradorMeta[] = [
  {
    id: 'colab-samuel',
    nome: 'Samuel',
    funcao: 'Produção',
    pesoBonus: 0.22,
    pontosRealizados: 0,
    percentualTotal: 0,
    metaIndividualCumprida: true,
  },
  {
    id: 'colab-joao',
    nome: 'João',
    funcao: 'Produção',
    pesoBonus: 0.22,
    pontosRealizados: 0,
    percentualTotal: 0,
    metaIndividualCumprida: true,
  },
  {
    id: 'colab-joas',
    nome: 'Joás',
    funcao: 'Produção',
    pesoBonus: 0.22,
    pontosRealizados: 0,
    percentualTotal: 0,
    metaIndividualCumprida: true,
  },
  {
    id: 'colab-rhyan',
    nome: 'Rhyan',
    funcao: 'Qualidade/Testes',
    pesoBonus: 0.17,
    pontosRealizados: 0,
    percentualTotal: 0,
    metaIndividualCumprida: true,
  },
  {
    id: 'colab-luana',
    nome: 'Luana',
    funcao: 'Atendimento/Comercial',
    pesoBonus: 0.17,
    pontosRealizados: 0,
    percentualTotal: 0,
    metaIndividualCumprida: true,
  },
];

let mockHistorico: HistoricoMetaRecord[] = [];

// ─── Busca a agregação de pontos realizados no mês corrente ──────────────────
export async function getProducaoPontosMes(mes: number, ano: number) {
  let pontosTotais = 0;
  let faturamentoLancado = 0;
  let totalLancamentos = 0;
  let totalRetrabalho = 0;

  if (isDatabaseReady()) {
    try {
      const inicioMes = new Date(ano, mes - 1, 1);
      const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);

      const producoes = await prisma.producao.findMany({
        where: {
          dataInicio: { gte: inicioMes, lte: fimMes },
          status: 'FINALIZADO',
        },
        include: {
          itemOrdemServico: {
            include: {
              tipoEquipamento: true,
              ordemServico: true,
            },
          },
        },
      });

      if (producoes.length > 0) {
        let pts = 0;
        let fat = 0;
        const colaboradoresMap: Record<string, number> = {};

        for (const p of producoes) {
          const eqNome = p.itemOrdemServico.tipoEquipamento.nome;
          const matched = TABELA_PONTUACAO_OFICIAL.find((t) =>
            eqNome.toLowerCase().includes(t.equipamentoServico.toLowerCase().split('/')[0].trim())
          );
          const ptsUnit = matched ? matched.pontos : 1.0;
          pts += p.quantidadeProduzida * ptsUnit;
          fat += Number((p.itemOrdemServico.ordemServico as any).valorOrcamento || 0);

          const tecId = p.itemOrdemServico.tecnicoAlocadoId || 'desconhecido';
          colaboradoresMap[tecId] = (colaboradoresMap[tecId] || 0) + p.quantidadeProduzida * ptsUnit;
        }

        pontosTotais = pts;
        faturamentoLancado = fat;
        totalLancamentos = producoes.length;

        if (pts > 0) {
          mockColaboradores = mockColaboradores.map((c) => ({
            ...c,
            pontosRealizados: colaboradoresMap[c.id] || 0,
            percentualTotal: Number(((colaboradoresMap[c.id] || 0) / pts * 100).toFixed(1)),
          }));
        }

        const taxaRetrabalho = totalLancamentos > 0 ? Number(((totalRetrabalho / totalLancamentos) * 100).toFixed(1)) : 0;
        return { pontosTotais, faturamentoLancado, totalLancamentos, totalRetrabalho, taxaRetrabalho, colaboradores: mockColaboradores };
      }
    } catch {
      // fallback para mock
    }
  }

  // ─── Fallback em Memória: calcula pontos das produções aprovadas nos mocks ────
  try {
    const { mockProducoes } = await import('../producao/producao.repository.js');
    const inicioMes = new Date(ano, mes - 1, 1).getTime();
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999).getTime();
    const colaboradoresMap: Record<string, number> = {};

    for (const p of mockProducoes) {
      if (p.status !== 'FINALIZADO') continue;
      const dataP = new Date(p.dataInicio instanceof Date ? p.dataInicio : p.dataInicio).getTime();
      if (dataP < inicioMes || dataP > fimMes) continue;

      const itemOS = p.itemOrdemServico as any;
      if (!itemOS) continue;

      const eqNome = itemOS.tipoEquipamento?.nome || '';
      const matched = TABELA_PONTUACAO_OFICIAL.find((t) =>
        eqNome.toLowerCase().includes(t.equipamentoServico.toLowerCase().split('/')[0].trim())
      ) || TABELA_PONTUACAO_OFICIAL.find((t) => itemOS.tipoEquipamentoId === t.id);
      const ptsUnit = matched ? matched.pontos : 1.0;
      const qtd = p.quantidadeProduzida || itemOS.quantidade || 1;

      pontosTotais += qtd * ptsUnit;
      totalLancamentos++;

      const tecId = p.tecnicoId || itemOS.tecnicoAlocadoId || itemOS.tecnicoAlocado?.id || 'desconhecido';
      colaboradoresMap[tecId] = (colaboradoresMap[tecId] || 0) + qtd * ptsUnit;
    }

    if (pontosTotais > 0) {
      mockColaboradores = mockColaboradores.map((c) => ({
        ...c,
        pontosRealizados: Number((colaboradoresMap[c.id] || 0).toFixed(1)),
        percentualTotal: Number(((colaboradoresMap[c.id] || 0) / pontosTotais * 100).toFixed(1)),
      }));
    }
  } catch {
    // sem produções em memória ainda
  }

  const taxaRetrabalho = totalLancamentos > 0 ? Number(((totalRetrabalho / totalLancamentos) * 100).toFixed(1)) : 0;

  return {
    pontosTotais,
    faturamentoLancado,
    totalLancamentos,
    totalRetrabalho,
    taxaRetrabalho,
    colaboradores: mockColaboradores,
  };
}


// ─── Busca ou cria a configuração de metas do mês ─────────────────────────────
export async function getMetaConfig(mes: number, ano: number): Promise<MetaConfigRecord> {
  return {
    ...mockMetaConfig,
    mesReferencia: mes,
    anoReferencia: ano,
  };
}

// ─── Atualiza ou insere a configuração de metas ───────────────────────────────
export async function updateMetaConfig(dados: UpdateMetaConfigInput): Promise<MetaConfigRecord> {
  const mes = dados.mesReferencia || new Date().getMonth() + 1;
  const ano = dados.anoReferencia || new Date().getFullYear();

  mockMetaConfig = {
    ...mockMetaConfig,
    mesReferencia: mes,
    anoReferencia: ano,
    metaBase: dados.metaBase ?? mockMetaConfig.metaBase,
    metaAlvo: dados.metaAlvo ?? mockMetaConfig.metaAlvo,
    metaExcelencia: dados.metaExcelencia ?? mockMetaConfig.metaExcelencia,
    isPeriodoPiloto: dados.isPeriodoPiloto ?? mockMetaConfig.isPeriodoPiloto,
    metaPilotoMinima: dados.metaPilotoMinima ?? mockMetaConfig.metaPilotoMinima,
    metaPilotoAlvo: dados.metaPilotoAlvo ?? mockMetaConfig.metaPilotoAlvo,
    metaPilotoExcelencia: dados.metaPilotoExcelencia ?? mockMetaConfig.metaPilotoExcelencia,
    retrabalhoMaximo: dados.retrabalhoMaximo ?? mockMetaConfig.retrabalhoMaximo,
    percentualFundoBonus: dados.percentualFundoBonus ?? mockMetaConfig.percentualFundoBonus,
    percentualColetivo: dados.percentualColetivo ?? mockMetaConfig.percentualColetivo,
    percentualIndividual: dados.percentualIndividual ?? mockMetaConfig.percentualIndividual,
    faturamentoRecebido: dados.faturamentoRecebido ?? mockMetaConfig.faturamentoRecebido,
    diasUteis: dados.diasUteis ?? mockMetaConfig.diasUteis,
    ativo: true,
  };

  return mockMetaConfig;
}

// ─── Atualiza o status de cumprimento individual de cada colaborador ──────────
export async function updateMetaIndividualColaboradores(statusMap: Record<string, boolean>) {
  mockColaboradores = mockColaboradores.map((c) => {
    if (statusMap[c.id] !== undefined) {
      return { ...c, metaIndividualCumprida: statusMap[c.id] };
    }
    return c;
  });
  return mockColaboradores;
}

// ─── Histórico de metas dos meses anteriores ──────────────────────────────────
export async function getHistoricoMetas(ano: number): Promise<HistoricoMetaRecord[]> {
  return mockHistorico.filter((h) => h.ano === ano);
}

// ─── Tabela de Pontuação Oficial ──────────────────────────────────────────────
export async function getTabelaPontuacao(): Promise<TabelaPontuacaoItem[]> {
  return TABELA_PONTUACAO_OFICIAL;
}

// ─── Guia Como Usar ───────────────────────────────────────────────────────────
export async function getGuiaComoUsar(): Promise<GuiaComoUsarItem[]> {
  return GUIA_COMO_USAR_OFICIAL;
}
