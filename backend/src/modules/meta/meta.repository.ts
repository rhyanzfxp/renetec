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
  { id: 'pt-01', equipamentoServico: 'ONU simples', pontos: 1.0, observacao: 'Reparo padrão' },
  { id: 'pt-02', equipamentoServico: 'Roteador GIGA/ONT/', pontos: 1.5, observacao: 'Reparo/manutenção' },
  { id: 'pt-03', equipamentoServico: 'Rádio / SXT / Nano / Airgrid / LiteBeam', pontos: 1.5, observacao: 'Reparo/manutenção' },
  { id: 'pt-04', equipamentoServico: 'RB/BASEBOX/', pontos: 2.0, observacao: 'Conforme avaliação' },
  { id: 'pt-05', equipamentoServico: 'Placa / PACPON', pontos: 2.0, observacao: 'Reparo/manutenção' },
  { id: 'pt-06', equipamentoServico: 'CCR/MIMOSAS/RADIOS AC', pontos: 2.5, observacao: 'Equipamento de maior complexidade' },
  { id: 'pt-07', equipamentoServico: 'OLT/SWITCH/NE E OUTROS', pontos: 3.0, observacao: 'Equipamento complexo' },
  { id: 'pt-08', equipamentoServico: 'Reparo eletrônico / diagnóstico complexo', pontos: 3.0, observacao: 'Serviço especial' },
];

export const GUIA_COMO_USAR_OFICIAL: GuiaComoUsarItem[] = [
  { etapa: 1, quando: 'Todos os dias', oQueFazer: "Abra 'Lançamentos' e registre cada serviço concluído pelos técnicos." },
  { etapa: 2, quando: 'Equipamento', oQueFazer: "Use exatamente um dos nomes cadastrados na aba 'Pontuação' para a pontuação automática funcionar." },
  { etapa: 3, quando: 'Rhyan', oQueFazer: 'Registre se o equipamento foi testado e o resultado do teste. O objetivo é garantir qualidade, não aprovar tudo.' },
  { etapa: 4, quando: 'Retrabalho', oQueFazer: "Marque 'Sim' quando o equipamento retornar por problema relacionado ao reparo." },
  { etapa: 5, quando: 'Luana', oQueFazer: "A produção comercial pode ser acompanhada inicialmente em 'Bônus'; depois podemos criar indicadores comerciais detalhados." },
  { etapa: 6, quando: 'Dashboard', oQueFazer: 'Acompanhe pontos, meta, retrabalho e faturamento. Os cálculos e termômetros são gerados em tempo real.' },
  { etapa: 7, quando: 'Bônus', oQueFazer: "Informe o faturamento recebido no mês na célula de faturamento. O fundo potencial e a partilha 70/30 são calculados automaticamente." },
  { etapa: 8, quando: 'Revisão', oQueFazer: 'No final do período piloto, use os dados reais para ajustar a pontuação e a meta dos meses subsequentes.' },
];

export const COLABORADORES_BASE: ColaboradorMeta[] = [
  { id: 'colab-samuel', nome: 'Samuel', funcao: 'Produção', pesoBonus: 0.22, pontosRealizados: 0, percentualTotal: 0, metaIndividualCumprida: true },
  { id: 'colab-joao', nome: 'João', funcao: 'Produção', pesoBonus: 0.22, pontosRealizados: 0, percentualTotal: 0, metaIndividualCumprida: true },
  { id: 'colab-joas', nome: 'Joás', funcao: 'Produção', pesoBonus: 0.22, pontosRealizados: 0, percentualTotal: 0, metaIndividualCumprida: true },
  { id: 'colab-rhyan', nome: 'Rhyan', funcao: 'Qualidade/Testes', pesoBonus: 0.17, pontosRealizados: 0, percentualTotal: 0, metaIndividualCumprida: true },
  { id: 'colab-luana', nome: 'Luana', funcao: 'Atendimento/Comercial', pesoBonus: 0.17, pontosRealizados: 0, percentualTotal: 0, metaIndividualCumprida: true },
];

// ─── Busca a agregação de pontos realizados no mês corrente ──────────────────
export async function getProducaoPontosMes(mes: number, ano: number) {
  let pontosTotais = 0;
  let faturamentoLancado = 0;
  let totalLancamentos = 0;
  let totalRetrabalho = 0;
  let colaboradores = [...COLABORADORES_BASE];

  if (isDatabaseReady()) {
    try {
      const inicioMes = new Date(ano, mes - 1, 1);
      const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);

      const [producoes, retrabalhos] = await Promise.all([
        prisma.producao.findMany({
          where: {
            dataInicio: { gte: inicioMes, lte: fimMes },
            status: 'FINALIZADO',
          },
          include: {
            tecnico: { select: { id: true, nome: true } },
            itemOrdemServico: {
              include: {
                tipoEquipamento: true,
                ordemServico: true,
                tecnicoAlocado: { select: { id: true, nome: true } },
              },
            },
          },
        }),
        prisma.retrabalho.count({
          where: { dataInicio: { gte: inicioMes, lte: fimMes } },
        }),
      ]);

      totalRetrabalho = retrabalhos;

      if (producoes.length > 0) {
        let pts = 0;
        let fat = 0;
        const colaboradoresMapPorNome: Record<string, number> = {};

        for (const p of producoes) {
          const eqNome = p.itemOrdemServico?.tipoEquipamento?.nome || '';
          const matched = TABELA_PONTUACAO_OFICIAL.find((t) =>
            eqNome.toLowerCase().includes(t.equipamentoServico.toLowerCase().split('/')[0].trim())
          );
          const ptsUnit = matched ? matched.pontos : 1.0;
          const pontosProd = (p.quantidadeProduzida || 1) * ptsUnit;
          pts += pontosProd;
          fat += Number((p.itemOrdemServico?.ordemServico as any)?.valorOrcamento || 0);

          const tecNome = p.tecnico?.nome || (p.itemOrdemServico as any)?.tecnicoAlocado?.nome || 'desconhecido';
          colaboradoresMapPorNome[tecNome] = (colaboradoresMapPorNome[tecNome] || 0) + pontosProd;
        }

        pontosTotais = Number(pts.toFixed(1));
        faturamentoLancado = fat;
        totalLancamentos = producoes.length;

        colaboradores = COLABORADORES_BASE.map((c) => {
          const primNome = c.nome.split(' ')[0].toLowerCase();
          const pontos = Object.entries(colaboradoresMapPorNome).find(
            ([n]) => n.toLowerCase().startsWith(primNome)
          )?.[1] || 0;

          return {
            ...c,
            pontosRealizados: Number(pontos.toFixed(1)),
            percentualTotal: pts > 0 ? Number(((pontos / pts) * 100).toFixed(1)) : 0,
          };
        });
      }
    } catch (err) {
      console.error('[getProducaoPontosMes] Erro ao calcular pontos no Supabase:', err);
    }
  }

  const taxaRetrabalho = totalLancamentos > 0 ? Number(((totalRetrabalho / totalLancamentos) * 100).toFixed(1)) : 0;

  return {
    pontosTotais,
    faturamentoLancado,
    totalLancamentos,
    totalRetrabalho,
    taxaRetrabalho,
    colaboradores,
  };
}

// ─── Busca ou cria a configuração de metas do mês ─────────────────────────────
export async function getMetaConfig(mes: number, ano: number): Promise<MetaConfigRecord> {
  const padrao: MetaConfigRecord = {
    id: `meta-${mes}-${ano}`,
    mesReferencia: mes,
    anoReferencia: ano,
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

  if (isDatabaseReady()) {
    try {
      const cfg = await prisma.metaConfig.findUnique({
        where: { mesReferencia_anoReferencia: { mesReferencia: mes, anoReferencia: ano } },
      });
      if (cfg) {
        return {
          ...padrao,
          id: cfg.id,
          metaBase: cfg.metaBronze,
          metaAlvo: cfg.metaPrata,
          metaExcelencia: cfg.metaOuro,
          ativo: cfg.ativo,
        };
      }
    } catch (err) {
      console.error('[getMetaConfig] Erro ao buscar metaConfig no Supabase:', err);
    }
  }

  return padrao;
}

// ─── Atualiza ou insere a configuração de metas ───────────────────────────────
export async function updateMetaConfig(dados: UpdateMetaConfigInput): Promise<MetaConfigRecord> {
  const mes = dados.mesReferencia || new Date().getMonth() + 1;
  const ano = dados.anoReferencia || new Date().getFullYear();

  const metaBase = dados.metaBase ?? 250;
  const metaAlvo = dados.metaAlvo ?? 300;
  const metaExcelencia = dados.metaExcelencia ?? 350;

  if (isDatabaseReady()) {
    try {
      const cfg = await prisma.metaConfig.upsert({
        where: { mesReferencia_anoReferencia: { mesReferencia: mes, anoReferencia: ano } },
        update: {
          metaBronze: metaBase,
          metaPrata: metaAlvo,
          metaOuro: metaExcelencia,
        },
        create: {
          mesReferencia: mes,
          anoReferencia: ano,
          metaBronze: metaBase,
          metaPrata: metaAlvo,
          metaOuro: metaExcelencia,
          ativo: true,
        },
      });

      return {
        id: cfg.id,
        mesReferencia: cfg.mesReferencia,
        anoReferencia: cfg.anoReferencia,
        metaBase: cfg.metaBronze,
        metaAlvo: cfg.metaPrata,
        metaExcelencia: cfg.metaOuro,
        isPeriodoPiloto: dados.isPeriodoPiloto ?? false,
        metaPilotoMinima: dados.metaPilotoMinima ?? 160,
        metaPilotoAlvo: dados.metaPilotoAlvo ?? 190,
        metaPilotoExcelencia: dados.metaPilotoExcelencia ?? 220,
        retrabalhoMaximo: dados.retrabalhoMaximo ?? 0.05,
        percentualFundoBonus: dados.percentualFundoBonus ?? 0.015,
        percentualColetivo: dados.percentualColetivo ?? 0.70,
        percentualIndividual: dados.percentualIndividual ?? 0.30,
        faturamentoRecebido: dados.faturamentoRecebido ?? 0,
        diasUteis: dados.diasUteis ?? 22,
        ativo: cfg.ativo,
      };
    } catch (err) {
      console.error('[updateMetaConfig] Erro ao salvar metaConfig no Supabase:', err);
    }
  }

  return {
    id: `meta-${mes}-${ano}`,
    mesReferencia: mes,
    anoReferencia: ano,
    metaBase,
    metaAlvo,
    metaExcelencia,
    isPeriodoPiloto: dados.isPeriodoPiloto ?? false,
    metaPilotoMinima: dados.metaPilotoMinima ?? 160,
    metaPilotoAlvo: dados.metaPilotoAlvo ?? 190,
    metaPilotoExcelencia: dados.metaPilotoExcelencia ?? 220,
    retrabalhoMaximo: dados.retrabalhoMaximo ?? 0.05,
    percentualFundoBonus: dados.percentualFundoBonus ?? 0.015,
    percentualColetivo: dados.percentualColetivo ?? 0.70,
    percentualIndividual: dados.percentualIndividual ?? 0.30,
    faturamentoRecebido: dados.faturamentoRecebido ?? 0,
    diasUteis: dados.diasUteis ?? 22,
    ativo: true,
  };
}

// ─── Atualiza o status de cumprimento individual de cada colaborador ──────────
export async function updateMetaIndividualColaboradores(statusMap: Record<string, boolean>) {
  return COLABORADORES_BASE.map((c) => ({
    ...c,
    metaIndividualCumprida: statusMap[c.id] !== undefined ? statusMap[c.id] : true,
  }));
}

// ─── Histórico de metas dos meses anteriores ──────────────────────────────────
export async function getHistoricoMetas(ano: number): Promise<HistoricoMetaRecord[]> {
  return [];
}

// ─── Tabela de Pontuação Oficial ──────────────────────────────────────────────
export async function getTabelaPontuacao(): Promise<TabelaPontuacaoItem[]> {
  return TABELA_PONTUACAO_OFICIAL;
}

// ─── Guia Como Usar ───────────────────────────────────────────────────────────
export async function getGuiaComoUsar(): Promise<GuiaComoUsarItem[]> {
  return GUIA_COMO_USAR_OFICIAL;
}
