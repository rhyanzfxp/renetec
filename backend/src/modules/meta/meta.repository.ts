import { prisma, isDatabaseReady } from '../../database/prisma.js';
import type { UpdateMetaConfigInput } from './meta.schema.js';

export interface MetaConfigRecord {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  metaBase: number;
  metaAlvo: number;
  metaExcelencia: number;
  isPeriodoPiloto: boolean;
  metaPilotoMinima: number;
  metaPilotoAlvo: number;
  metaPilotoExcelencia: number;
  retrabalhoMaximo: number;
  percentualFundoBonus: number;
  percentualColetivo: number;
  percentualIndividual: number;
  faturamentoRecebido: number;
  diasUteis: number;
  ativo: boolean;
}

export interface ColaboradorMeta {
  id: string;
  nome: string;
  funcao: string;
  pesoBonus: number;
  pontosRealizados: number;
  percentualTotal: number;
  metaIndividualCumprida: boolean;
}

export interface TabelaPontuacaoItem {
  id: string;
  equipamentoServico: string;
  tempoEstimadoMinutos: number;
  pontos: number;
  categoria: string;
  observacoes: string;
}

export interface GuiaComoUsarItem {
  etapa: number;
  quando: string;
  oQueFazer: string;
}

export interface HistoricoMetaRecord {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  metaBase: number;
  metaAlvo: number;
  metaExcelencia: number;
  pontosRealizados: number;
  taxaRetrabalho: number;
  statusMeta: string;
  bonusDistribuido: number;
}

// ─── Tabela Oficial de Pontuação Renetec ──────────────────────────────────────
export const TABELA_PONTUACAO_OFICIAL: TabelaPontuacaoItem[] = [
  { id: 'pt-01', equipamentoServico: 'ONU / Reparo Básico', tempoEstimadoMinutos: 25, pontos: 1.0, categoria: 'Básico', observacoes: 'Troca de conector, limpeza óptica, regravação de firmware básica.' },
  { id: 'pt-02', equipamentoServico: 'ONT Wi-Fi / Roteador Giga', tempoEstimadoMinutos: 40, pontos: 1.5, categoria: 'Padrão', observacoes: 'Troca de chipset Wi-Fi, reparo em portas GbE, substituição de capacitores.' },
  { id: 'pt-03', equipamentoServico: 'Rádio 5GHz (SXT, Nano, LiteBeam)', tempoEstimadoMinutos: 40, pontos: 1.5, categoria: 'Padrão', observacoes: 'Reparo de RF, proteção ESD, troca de PoE interno.' },
  { id: 'pt-04', equipamentoServico: 'RouterBoard / BaseBox / Placa', tempoEstimadoMinutos: 55, pontos: 2.0, categoria: 'Intermediário', observacoes: 'Troca de reguladores de tensão, portas Ether com defeito.' },
  { id: 'pt-05', equipamentoServico: 'Fonte PACPON / Nobreak DC', tempoEstimadoMinutos: 55, pontos: 2.0, categoria: 'Intermediário', observacoes: 'Reparo de circuito primário/secundário, troca de MOSFETs e relés.' },
  { id: 'pt-06', equipamentoServico: 'CCR / Roteador de Borda (Básico)', tempoEstimadoMinutos: 75, pontos: 2.5, categoria: 'Avançado', observacoes: 'Reparo de fonte redundante, cooler, slots SFP.' },
  { id: 'pt-07', equipamentoServico: 'Rádio PTP Alto Desempenho (Mimosa/AC)', tempoEstimadoMinutos: 75, pontos: 2.5, categoria: 'Avançado', observacoes: 'Reparo complexo de RF MIMO, substituição de amplificadores de potência.' },
  { id: 'pt-08', equipamentoServico: 'OLT / Switch Core / Especial', tempoEstimadoMinutos: 90, pontos: 3.0, categoria: 'Especial', observacoes: 'Placas de controle OLT, fontes industriais, reparo multilayer.' },
];

export const GUIA_COMO_USAR: GuiaComoUsarItem[] = [
  { etapa: 1, quando: 'Início do Mês', oQueFazer: 'Ajuste os dias úteis, as faixas de meta (Base, Alvo, Excelência) e os percentuais de bônus.' },
  { etapa: 2, quando: 'Diariamente', oQueFazer: 'Os técnicos apontam os reparos diretamente pela fila do chão de fábrica.' },
  { etapa: 3, quando: 'Ao Finalizar', oQueFazer: 'O controle de qualidade (CQ) inspeciona o lote. As peças aprovadas pontuam para a meta; as reprovadas vão para retrabalho.' },
  { etapa: 4, quando: 'Retrabalho', oQueFazer: 'Peças em retrabalho não geram pontuação na primeira passagem e impactam o indicador de qualidade.' },
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

let inMemoryFaturamentoRecebido: number = 0;
let inMemoryMetaIndividualStatus: Record<string, boolean> = {
  'colab-samuel': true,
  'colab-joao': true,
  'colab-joas': true,
  'colab-rhyan': true,
  'colab-luana': true,
};

let inMemoryMetaParamOverrides: {
  isPeriodoPiloto?: boolean;
  metaPilotoMinima?: number;
  metaPilotoAlvo?: number;
  metaPilotoExcelencia?: number;
  retrabalhoMaximo?: number;
  percentualFundoBonus?: number;
  percentualColetivo?: number;
  percentualIndividual?: number;
  diasUteis?: number;
} = {};

function getPontosUnitarios(nome?: string): number {
  if (!nome) return 1.5;
  const n = nome.toLowerCase();
  if (n.includes('ccr') || n.includes('mimosa') || n.includes('ac')) return 2.5;
  if (n.includes('olt') || n.includes('switch') || n.includes('especial')) return 3.0;
  if (n.includes('rb') || n.includes('basebox') || n.includes('placa') || n.includes('pacpon')) return 2.0;
  if (n.includes('ont') || n.includes('giga') || n.includes('radio') || n.includes('sxt') || n.includes('nano') || n.includes('litebeam')) return 1.5;
  if (n.includes('onu')) return 1.0;
  return 1.5;
}

// ─── Busca a agregação de pontos realizados no mês corrente (APENAS APROVADOS NO CQ) ──
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

      const [testes, retrabalhos, producoes] = await Promise.all([
        prisma.teste.findMany({
          where: { dataTeste: { gte: inicioMes, lte: fimMes } },
          include: {
            inspetor: { select: { id: true, nome: true } },
            producao: {
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
            },
          },
        }),
        prisma.retrabalho.count({
          where: { dataInicio: { gte: inicioMes, lte: fimMes } },
        }),
        prisma.producao.findMany({
          where: {
            OR: [
              { dataInicio: { gte: inicioMes, lte: fimMes } },
              { dataFim: { gte: inicioMes, lte: fimMes } },
            ],
            status: 'FINALIZADO',
          },
        }),
      ]);

      totalRetrabalho = retrabalhos;
      totalLancamentos = producoes.length;

      if (testes.length > 0) {
        let ptsProducaoAprovada = 0;
        let fat = 0;
        const colaboradoresMapPorNome: Record<string, number> = {};

        for (const t of testes) {
          const eqNome = t.producao?.itemOrdemServico?.tipoEquipamento?.nome || '';
          const ptsUnit = getPontosUnitarios(eqNome);
          const qtdAprovada = t.quantidadeAprovada || 0;

          // 1. O técnico que executou a produção só pontua se as peças foram APROVADAS no CQ
          if (qtdAprovada > 0) {
            const pontosTecnico = qtdAprovada * ptsUnit;
            ptsProducaoAprovada += pontosTecnico;

            const tecNome = t.producao?.tecnico?.nome || (t.producao?.itemOrdemServico as any)?.tecnicoAlocado?.nome || 'desconhecido';
            colaboradoresMapPorNome[tecNome] = (colaboradoresMapPorNome[tecNome] || 0) + pontosTecnico;

            const valorOS = Number((t.producao?.itemOrdemServico?.ordemServico as any)?.valorOrcamento || 0);
            fat += valorOS;
          }

          // 2. Pontos de Inspeção do Testador (Rhyan / Qualidade)
          const pontosInspetor = (t.quantidadeAprovada || t.quantidadeTestada || 1) * ptsUnit;
          const inspNome = t.inspetor?.nome || 'Rhyan';
          colaboradoresMapPorNome[inspNome] = (colaboradoresMapPorNome[inspNome] || 0) + pontosInspetor;
        }

        pontosTotais = Number(ptsProducaoAprovada.toFixed(1));
        faturamentoLancado = fat;

        colaboradores = COLABORADORES_BASE.map((c) => {
          const primNome = c.nome.split(' ')[0].toLowerCase();
          const pontos = Object.entries(colaboradoresMapPorNome).find(
            ([n]) => n.toLowerCase().startsWith(primNome)
          )?.[1] || 0;

          return {
            ...c,
            pontosRealizados: Number(pontos.toFixed(1)),
            percentualTotal: ptsProducaoAprovada > 0 ? Number(((pontos / ptsProducaoAprovada) * 100).toFixed(1)) : 0,
            metaIndividualCumprida: inMemoryMetaIndividualStatus[c.id] !== undefined
              ? inMemoryMetaIndividualStatus[c.id]
              : true,
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

// ─── Reset Administrativo de Metas e Dados de Produção ────────────────────────
export async function resetarMetasProducao(mes?: number, ano?: number, resetarTudo: boolean = false) {
  const m = mes || new Date().getMonth() + 1;
  const a = ano || new Date().getFullYear();
  const inicioMes = new Date(a, m - 1, 1);
  const fimMes = new Date(a, m, 0, 23, 59, 59, 999);

  inMemoryFaturamentoRecebido = 0;
  inMemoryMetaIndividualStatus = {
    'colab-samuel': true,
    'colab-joao': true,
    'colab-joas': true,
    'colab-rhyan': true,
    'colab-luana': true,
  };

  if (isDatabaseReady()) {
    try {
      if (resetarTudo) {
        await prisma.retrabalho.deleteMany({});
        await prisma.teste.deleteMany({});
        await prisma.producao.deleteMany({});
        await prisma.historicoStatus.deleteMany({});
        await prisma.itemOrdemServico.deleteMany({});
        await prisma.ordemServico.deleteMany({});
      } else {
        await prisma.retrabalho.deleteMany({
          where: { dataInicio: { gte: inicioMes, lte: fimMes } },
        });
        await prisma.teste.deleteMany({
          where: { dataTeste: { gte: inicioMes, lte: fimMes } },
        });
        await prisma.producao.deleteMany({
          where: {
            OR: [
              { dataInicio: { gte: inicioMes, lte: fimMes } },
              { dataFim: { gte: inicioMes, lte: fimMes } },
            ],
          },
        });
      }
      return { success: true, message: 'Metas e dados de produção do período resetados com sucesso.' };
    } catch (err) {
      console.error('[resetarMetasProducao] Erro ao resetar dados:', err);
      throw err;
    }
  }

  return { success: true, message: 'Estado em memória resetado com sucesso.' };
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
    isPeriodoPiloto: inMemoryMetaParamOverrides.isPeriodoPiloto ?? false,
    metaPilotoMinima: inMemoryMetaParamOverrides.metaPilotoMinima ?? 160,
    metaPilotoAlvo: inMemoryMetaParamOverrides.metaPilotoAlvo ?? 190,
    metaPilotoExcelencia: inMemoryMetaParamOverrides.metaPilotoExcelencia ?? 220,
    retrabalhoMaximo: inMemoryMetaParamOverrides.retrabalhoMaximo ?? 0.05,
    percentualFundoBonus: inMemoryMetaParamOverrides.percentualFundoBonus ?? 0.015,
    percentualColetivo: inMemoryMetaParamOverrides.percentualColetivo ?? 0.70,
    percentualIndividual: inMemoryMetaParamOverrides.percentualIndividual ?? 0.30,
    faturamentoRecebido: inMemoryFaturamentoRecebido,
    diasUteis: inMemoryMetaParamOverrides.diasUteis ?? 22,
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
          faturamentoRecebido: inMemoryFaturamentoRecebido,
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

  if (dados.faturamentoRecebido !== undefined) {
    inMemoryFaturamentoRecebido = dados.faturamentoRecebido;
  }
  if (dados.isPeriodoPiloto !== undefined) inMemoryMetaParamOverrides.isPeriodoPiloto = dados.isPeriodoPiloto;
  if (dados.metaPilotoMinima !== undefined) inMemoryMetaParamOverrides.metaPilotoMinima = dados.metaPilotoMinima;
  if (dados.metaPilotoAlvo !== undefined) inMemoryMetaParamOverrides.metaPilotoAlvo = dados.metaPilotoAlvo;
  if (dados.metaPilotoExcelencia !== undefined) inMemoryMetaParamOverrides.metaPilotoExcelencia = dados.metaPilotoExcelencia;
  if (dados.retrabalhoMaximo !== undefined) inMemoryMetaParamOverrides.retrabalhoMaximo = dados.retrabalhoMaximo;
  if (dados.percentualFundoBonus !== undefined) inMemoryMetaParamOverrides.percentualFundoBonus = dados.percentualFundoBonus;
  if (dados.percentualColetivo !== undefined) inMemoryMetaParamOverrides.percentualColetivo = dados.percentualColetivo;
  if (dados.percentualIndividual !== undefined) inMemoryMetaParamOverrides.percentualIndividual = dados.percentualIndividual;
  if (dados.diasUteis !== undefined) inMemoryMetaParamOverrides.diasUteis = dados.diasUteis;

  if (isDatabaseReady()) {
    try {
      const existing = await prisma.metaConfig.findUnique({
        where: { mesReferencia_anoReferencia: { mesReferencia: mes, anoReferencia: ano } },
      });

      const metaBase = dados.metaBase !== undefined ? dados.metaBase : (existing?.metaBronze ?? 250);
      const metaAlvo = dados.metaAlvo !== undefined ? dados.metaAlvo : (existing?.metaPrata ?? 300);
      const metaExcelencia = dados.metaExcelencia !== undefined ? dados.metaExcelencia : (existing?.metaOuro ?? 350);

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
        isPeriodoPiloto: inMemoryMetaParamOverrides.isPeriodoPiloto ?? false,
        metaPilotoMinima: inMemoryMetaParamOverrides.metaPilotoMinima ?? 160,
        metaPilotoAlvo: inMemoryMetaParamOverrides.metaPilotoAlvo ?? 190,
        metaPilotoExcelencia: inMemoryMetaParamOverrides.metaPilotoExcelencia ?? 220,
        retrabalhoMaximo: inMemoryMetaParamOverrides.retrabalhoMaximo ?? 0.05,
        percentualFundoBonus: inMemoryMetaParamOverrides.percentualFundoBonus ?? 0.015,
        percentualColetivo: inMemoryMetaParamOverrides.percentualColetivo ?? 0.70,
        percentualIndividual: inMemoryMetaParamOverrides.percentualIndividual ?? 0.30,
        faturamentoRecebido: inMemoryFaturamentoRecebido,
        diasUteis: inMemoryMetaParamOverrides.diasUteis ?? 22,
        ativo: cfg.ativo,
      };
    } catch (err) {
      console.error('[updateMetaConfig] Erro ao salvar metaConfig no Supabase:', err);
    }
  }

  const metaBase = dados.metaBase ?? 250;
  const metaAlvo = dados.metaAlvo ?? 300;
  const metaExcelencia = dados.metaExcelencia ?? 350;

  return {
    id: `meta-${mes}-${ano}`,
    mesReferencia: mes,
    anoReferencia: ano,
    metaBase,
    metaAlvo,
    metaExcelencia,
    isPeriodoPiloto: inMemoryMetaParamOverrides.isPeriodoPiloto ?? false,
    metaPilotoMinima: inMemoryMetaParamOverrides.metaPilotoMinima ?? 160,
    metaPilotoAlvo: inMemoryMetaParamOverrides.metaPilotoAlvo ?? 190,
    metaPilotoExcelencia: inMemoryMetaParamOverrides.metaPilotoExcelencia ?? 220,
    retrabalhoMaximo: inMemoryMetaParamOverrides.retrabalhoMaximo ?? 0.05,
    percentualFundoBonus: inMemoryMetaParamOverrides.percentualFundoBonus ?? 0.015,
    percentualColetivo: inMemoryMetaParamOverrides.percentualColetivo ?? 0.70,
    percentualIndividual: inMemoryMetaParamOverrides.percentualIndividual ?? 0.30,
    faturamentoRecebido: inMemoryFaturamentoRecebido,
    diasUteis: inMemoryMetaParamOverrides.diasUteis ?? 22,
    ativo: true,
  };
}

// ─── Atualiza o status de cumprimento individual de cada colaborador ──────────
export async function updateMetaIndividualColaboradores(statusMap: Record<string, boolean>) {
  inMemoryMetaIndividualStatus = { ...inMemoryMetaIndividualStatus, ...statusMap };
  return COLABORADORES_BASE.map((c) => ({
    ...c,
    metaIndividualCumprida: inMemoryMetaIndividualStatus[c.id] !== undefined ? inMemoryMetaIndividualStatus[c.id] : true,
  }));
}

// ─── Histórico de metas dos meses anteriores ──────────────────────────────────
export async function getHistoricoMetas(ano: number): Promise<HistoricoMetaRecord[]> {
  return [];
}

export function getTabelaPontuacao(): TabelaPontuacaoItem[] {
  return TABELA_PONTUACAO_OFICIAL;
}

export function getGuiaComoUsar(): GuiaComoUsarItem[] {
  return GUIA_COMO_USAR;
}
