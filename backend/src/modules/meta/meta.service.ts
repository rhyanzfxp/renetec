import * as repo from './meta.repository.js';
import type { UpdateMetaConfigInput, UpdateBonusSimulationInput } from './meta.schema.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { log } from '../auditoria/auditoria.service.js';

// Função utilitária para calcular dias úteis (Segunda a Sexta)
function getDiasUteisInfo(dataRef: Date = new Date()) {
  const ano = dataRef.getFullYear();
  const mes = dataRef.getMonth();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const diaHoje = dataRef.getDate();

  let diasUteisTotais = 0;
  let diasUteisDecorridos = 0;

  for (let dia = 1; dia <= totalDias; dia++) {
    const d = new Date(ano, mes, dia);
    const dayOfWeek = d.getDay();
    const isDiaUtil = dayOfWeek !== 0 && dayOfWeek !== 6;

    if (isDiaUtil) {
      diasUteisTotais++;
      if (dia <= diaHoje) {
        diasUteisDecorridos++;
      }
    }
  }

  diasUteisDecorridos = Math.max(1, diasUteisDecorridos);
  const diasUteisRestantes = Math.max(0, diasUteisTotais - diasUteisDecorridos);

  return { diasUteisTotais, diasUteisDecorridos, diasUteisRestantes };
}

export async function getMetasAtual() {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  const [config, producaoData] = await Promise.all([
    repo.getMetaConfig(mes, ano),
    repo.getProducaoPontosMes(mes, ano),
  ]);

  const { diasUteisTotais, diasUteisDecorridos, diasUteisRestantes } = getDiasUteisInfo(agora);

  // Faixas ativas (considerando Período Piloto se ativado)
  const metaBaseAtiva = config.isPeriodoPiloto ? config.metaPilotoMinima : config.metaBase;
  const metaAlvoAtiva = config.isPeriodoPiloto ? config.metaPilotoAlvo : config.metaAlvo;
  const metaExcelenciaAtiva = config.isPeriodoPiloto ? config.metaPilotoExcelencia : config.metaExcelencia;

  const pontosRealizados = producaoData.pontosTotais;

  // Status Oficial da Meta (Planilha: Dashboard R11)
  let statusMeta: 'META_EXCELENCIA' | 'META_ALVO' | 'META_BASE' | 'ABAIXO_DA_META' = 'ABAIXO_DA_META';
  let statusMetaLabel = '🔴 ABAIXO DA META';
  if (pontosRealizados >= metaExcelenciaAtiva) {
    statusMeta = 'META_EXCELENCIA';
    statusMetaLabel = '🏆 META EXCELÊNCIA';
  } else if (pontosRealizados >= metaAlvoAtiva) {
    statusMeta = 'META_ALVO';
    statusMetaLabel = '🟢 META ALVO';
  } else if (pontosRealizados >= metaBaseAtiva) {
    statusMeta = 'META_BASE';
    statusMetaLabel = '🟡 META BASE';
  }

  // Qualidade e Retrabalho (Planilha: Dashboard R07 e R08)
  const taxaRetrabalho = producaoData.taxaRetrabalho;
  const limiteRetrabalhoPct = Number((config.retrabalhoMaximo * 100).toFixed(1));
  let statusQualidade: 'SEM_DADOS' | 'DENTRO_DA_META' | 'ACIMA_DO_LIMITE' = 'SEM_DADOS';
  let statusQualidadeLabel = 'Sem dados';

  if (producaoData.totalLancamentos > 0) {
    if (taxaRetrabalho <= limiteRetrabalhoPct) {
      statusQualidade = 'DENTRO_DA_META';
      statusQualidadeLabel = 'Dentro da meta';
    } else {
      statusQualidade = 'ACIMA_DO_LIMITE';
      statusQualidadeLabel = 'Acima do limite';
    }
  }

  // Ritmos diários em PONTOS
  const ritmoAtual = Number((pontosRealizados / diasUteisDecorridos).toFixed(1));
  const projecaoFechamento = Math.round(pontosRealizados + ritmoAtual * diasUteisRestantes);

  const faltamParaBase = Math.max(0, Number((metaBaseAtiva - pontosRealizados).toFixed(1)));
  const faltamParaAlvo = Math.max(0, Number((metaAlvoAtiva - pontosRealizados).toFixed(1)));
  const faltamParaExcelencia = Math.max(0, Number((metaExcelenciaAtiva - pontosRealizados).toFixed(1)));

  const ritmoNecessarioBase =
    diasUteisRestantes > 0 ? Number((faltamParaBase / diasUteisRestantes).toFixed(1)) : 0;
  const ritmoNecessarioAlvo =
    diasUteisRestantes > 0 ? Number((faltamParaAlvo / diasUteisRestantes).toFixed(1)) : 0;
  const ritmoNecessarioExcelencia =
    diasUteisRestantes > 0 ? Number((faltamParaExcelencia / diasUteisRestantes).toFixed(1)) : 0;

  // Percentuais de progresso
  const percentualBase = Number(Math.min(100, (pontosRealizados / metaBaseAtiva) * 100).toFixed(1));
  const percentualAlvo = Number(((pontosRealizados / metaAlvoAtiva) * 100).toFixed(1));
  const percentualExcelencia = Number(((pontosRealizados / metaExcelenciaAtiva) * 100).toFixed(1));

  // ─── CÁLCULO E SIMULAÇÃO DE BÔNUS (Planilha: Aba 'Bônus') ────────────────────
  const faturamentoBase = config.faturamentoRecebido > 0 ? config.faturamentoRecebido : producaoData.faturamentoLancado;
  const fundoPotencial = Number((faturamentoBase * config.percentualFundoBonus).toFixed(2));
  const razaoAtingimento = metaAlvoAtiva > 0 ? pontosRealizados / metaAlvoAtiva : 0;

  // Regra Multiplicador de Bônus: <0.90 -> 0x; <1.00 -> 0.5x; <1.10 -> 1.0x; >=1.10 -> 1.25x
  let multiplicadorBonus = 0;
  if (razaoAtingimento < 0.9) {
    multiplicadorBonus = 0;
  } else if (razaoAtingimento < 1.0) {
    multiplicadorBonus = 0.5;
  } else if (razaoAtingimento < 1.1) {
    multiplicadorBonus = 1.0;
  } else {
    multiplicadorBonus = 1.25;
  }

  const bonusFinal = Number((fundoPotencial * multiplicadorBonus).toFixed(2));
  const parteColetivaTotal = Number((bonusFinal * config.percentualColetivo).toFixed(2));
  const parteIndividualTotal = Number((bonusFinal * config.percentualIndividual).toFixed(2));

  // Rateio detalhado por colaborador
  const equipeDetalhada = producaoData.colaboradores.map((c) => {
    const bonusColetivo = Number((parteColetivaTotal * c.pesoBonus).toFixed(2));
    const bonusIndividual = c.metaIndividualCumprida ? Number((parteIndividualTotal * c.pesoBonus).toFixed(2)) : 0;
    const bonusTotal = Number((bonusColetivo + bonusIndividual).toFixed(2));

    return {
      id: c.id,
      nome: c.nome,
      funcao: c.funcao,
      pesoBonus: c.pesoBonus,
      pesoBonusPercentual: Number((c.pesoBonus * 100).toFixed(0)),
      pontosRealizados: c.pontosRealizados,
      percentualTotal: pontosRealizados > 0 ? Number(((c.pontosRealizados / pontosRealizados) * 100).toFixed(1)) : 0,
      metaIndividualCumprida: c.metaIndividualCumprida,
      bonusColetivo,
      bonusIndividual,
      bonusTotal,
    };
  });

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return {
    mesReferencia: mes,
    anoReferencia: ano,
    nomeMes: mesesNomes[mes - 1],
    // Pontuação
    pontosRealizados,
    metaBase: metaBaseAtiva,
    metaAlvo: metaAlvoAtiva,
    metaExcelencia: metaExcelenciaAtiva,
    isPeriodoPiloto: config.isPeriodoPiloto,
    // Status Semânticos
    statusMeta,
    statusMetaLabel,
    statusQualidade,
    statusQualidadeLabel,
    taxaRetrabalho,
    limiteRetrabalhoPct,
    totalRetrabalho: producaoData.totalRetrabalho,
    totalLancamentos: producaoData.totalLancamentos,
    // Ritmos e Projeção
    diasUteisTotais,
    diasUteisDecorridos,
    diasUteisRestantes,
    ritmoAtual,
    projecaoFechamento,
    faltamParaBase,
    faltamParaAlvo,
    faltamParaExcelencia,
    ritmoNecessarioBase,
    ritmoNecessarioAlvo,
    ritmoNecessarioExcelencia,
    percentualBase,
    percentualAlvo,
    percentualExcelencia,
    // Bônus e Faturamento
    faturamentoLancado: producaoData.faturamentoLancado,
    faturamentoRecebido: config.faturamentoRecebido,
    faturamentoBaseCalculo: faturamentoBase,
    percentualFundoBonus: config.percentualFundoBonus,
    fundoPotencial,
    multiplicadorBonus,
    bonusFinal,
    parteColetivaTotal,
    parteIndividualTotal,
    // Equipe
    equipe: equipeDetalhada,
    // Configurações raw
    configRaw: config,
  };
}

export async function updateMetaConfig(dados: UpdateMetaConfigInput) {
  const config = await repo.updateMetaConfig(dados);
  realtimeService.broadcast('meta:atualizada', { config });
  log({
    acao: 'META_ATUALIZADA',
    entidade: 'MetaConfig',
    descricao: `Metas redefinidas → Base: ${config.metaBase}, Alvo: ${config.metaAlvo}, Excelência: ${config.metaExcelencia}.`,
    detalhes: config,
  }).catch(() => {});
  return config;
}

export async function updateBonusSimulation(dados: UpdateBonusSimulationInput) {
  if (dados.faturamentoRecebido !== undefined) {
    await repo.updateMetaConfig({ faturamentoRecebido: dados.faturamentoRecebido });
  }
  if (dados.metaIndividualStatus) {
    await repo.updateMetaIndividualColaboradores(dados.metaIndividualStatus);
  }
  realtimeService.broadcast('meta:atualizada', { dados });
  return getMetasAtual();
}

export async function getHistoricoMetas(ano?: number) {
  const anoRef = ano || new Date().getFullYear();
  return repo.getHistoricoMetas(anoRef);
}

export async function getTabelaPontuacao() {
  return repo.getTabelaPontuacao();
}

export async function getGuiaComoUsar() {
  return repo.getGuiaComoUsar();
}

export async function resetarMetas(mes?: number, ano?: number, resetarTudo?: boolean, usuarioId?: string) {
  const res = await repo.resetarMetasProducao(mes, ano, resetarTudo);
  realtimeService.broadcast('meta:atualizada', { resetado: true });
  realtimeService.broadcast('producao:finalizada', { resetado: true });
  realtimeService.broadcast('qualidade:aprovado', { resetado: true });

  log({
    usuarioId,
    acao: 'META_ATUALIZADA',
    entidade: 'MetaConfig',
    descricao: `Metas e registros de produção resetados pelo Administrador (Mês ${mes || 'Atual'}/${ano || 'Atual'}).`,
    detalhes: { mes, ano, resetarTudo },
  }).catch(() => {});

  return res;
}
