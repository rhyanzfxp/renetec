import { prisma, isDatabaseReady } from '../../database/prisma.js';

export interface BancadaStatus {
  tecnicoId: string;
  tecnicoNome: string;
  id?: string;
  nome?: string;
  funcao: string;
  status: 'EM_PRODUCAO' | 'DISPONIVEL' | 'EM_PAUSA';
  producaoAtiva?: {
    id: string;
    numeroOS: number;
    clienteNome: string;
    equipamentoNome: string;
    quantidade: number;
    pontosTotais: number;
    dataInicio: string;
    tempoDecorridoMinutos: number;
  } | null;
  pontosHoje: number;
  taxaQualidadeHoje?: number;
  quantidadeAprovadaHoje?: number;
}

export interface TvFabricaData {
  timestamp: string;
  meta: {
    mesNome: string;
    ano: number;
    pontosRealizados: number;
    metaBase: number;
    metaAlvo: number;
    metaExcelencia: number;
    statusMeta: 'META_EXCELENCIA' | 'META_ALVO' | 'META_BASE' | 'ABAIXO_DA_META';
    statusMetaLabel: string;
    percentualAlvo: number;
    ritmoAtual: number;
    projecaoFechamento: number;
    diasUteisRestantes: number;
    faturamentoLancado: number;
    taxaRetrabalho: number;
    statusQualidadeLabel: string;
  };
  bancadas: BancadaStatus[];
  fpyHoje: {
    fpyPercentual: number;
    totalTestados: number;
    aprovadosPrimeiraVez: number;
    reprovados: number;
  };
  filaPrioritaria: {
    id: string;
    numeroOS: number;
    clienteNome: string;
    equipamentoNome: string;
    quantidade: number;
    pontosTotais: number;
    prioridade: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA';
    status: string;
  }[];
}

export interface DefeitoDistribuicao {
  categoria: string;
  codigo: string;
  motivo: string;
  quantidade: number;
  percentual: number;
}

export interface LeadTimeEquipamento {
  tipoEquipamentoNome: string;
  pontosUnitarios: number;
  quantidadeConcluida: number;
  tempoMedioMinutos: number;
}

export interface ProdutividadeTecnico {
  tecnicoId: string;
  tecnicoNome: string;
  funcao: string;
  pesoBonus: number;
  pontosRealizados: number;
  percentualTotal: number;
  taxaAprovacao: number;
  tempoMedioPorLoteMinutos: number;
}

export interface GerencialData {
  periodo: string;
  faturamentoEstimado: number;
  totalOsAtivas: number;
  pontosTotaisRealizados: number;
  metaAlvoPeriodo: number;
  fpyGeral: number;
  taxaRetrabalho: number;
  leadTimeMedioGeralMinutos: number;
  distribuicaoDefeitos: DefeitoDistribuicao[];
  leadTimePorEquipamento: LeadTimeEquipamento[];
  produtividadeTecnicos: ProdutividadeTecnico[];
  producaoHistoricoDias: {
    data: string;
    pontos: number;
    reprovados: number;
  }[];
}

// ─── Auxiliares de Pontuação e Correspondência ──────────────────────────────
function getPontosUnitarios(nome?: string): number {
  if (!nome) return 1.5;
  const n = nome.toLowerCase();
  if (n.includes('ccr') || n.includes('mimosa') || n.includes('ac')) return 2.5;
  if (n.includes('olt') || n.includes('switch') || n.includes('especial')) return 3.0;
  if (n.includes('rb') || n.includes('basebox') || n.includes('placa') || n.includes('pacpon')) return 2.0;
  if (n.includes('ont') || n.includes('giga') || n.includes('roteador') || n.includes('radio') || n.includes('sxt') || n.includes('nano') || n.includes('litebeam')) return 1.5;
  if (n.includes('onu')) return 1.0;
  return 1.5;
}

function isTecnicoMatch(tId1?: string | null, tNome1?: string | null, tId2?: string | null, tNome2?: string | null): boolean {
  if (!tId1 && !tNome1) return false;
  if (!tId2 && !tNome2) return false;

  // Match exato por ID
  if (tId1 && tId2 && tId1.toLowerCase() === tId2.toLowerCase()) return true;
  if (tId1 && tId2 && (tId1.includes(tId2) || tId2.includes(tId1))) return true;

  // Normalização de primeiro nome
  const getPrimeiroNome = (n?: string | null) => {
    if (!n) return '';
    return n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/)[0];
  };

  const p1 = getPrimeiroNome(tNome1);
  const p2 = getPrimeiroNome(tNome2);

  // Match exato por primeiro nome (ex: "joao" === "joao", "joas" === "joas")
  if (p1 && p2 && p1 === p2) return true;

  // Match por nome normalizado
  if (tNome1 && tNome2) {
    const n1 = tNome1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const n2 = tNome2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
  }

  // ID vs Nome normalizado (ex: colab-joao vs João, usr-tecnico-01 vs João)
  const normId1 = (tId1 || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normId2 = (tId2 || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (p2 && normId1.includes(p2)) return true;
  if (p1 && normId2.includes(p1)) return true;

  return false;
}

// ─── Agregação para a TV da Fábrica ──────────────────────────────────────────
export async function getTvFabricaData(): Promise<TvFabricaData> {
  const agora = new Date();

  // 1. Metas Atualizadas
  let metaInfo: any = {
    mesNome: agora.toLocaleString('pt-BR', { month: 'long' }),
    ano: agora.getFullYear(),
    pontosRealizados: 0,
    metaBase: 250,
    metaAlvo: 300,
    metaExcelencia: 350,
    statusMeta: 'ABAIXO_DA_META' as const,
    statusMetaLabel: '🔴 ABAIXO DA META',
    percentualAlvo: 0.0,
    ritmoAtual: 0.0,
    projecaoFechamento: 0,
    diasUteisRestantes: 22,
    faturamentoLancado: 0.0,
    taxaRetrabalho: 0.0,
    statusQualidadeLabel: 'Sem dados',
  };

  try {
    const { getMetasAtual } = await import('../meta/meta.service.js');
    const metasData = await getMetasAtual();
    metaInfo = {
      mesNome: metasData.nomeMes || agora.toLocaleString('pt-BR', { month: 'long' }),
      ano: metasData.anoReferencia || agora.getFullYear(),
      pontosRealizados: metasData.pontosRealizados || 0,
      metaBase: metasData.metaBase || 250,
      metaAlvo: metasData.metaAlvo || 300,
      metaExcelencia: metasData.metaExcelencia || 350,
      statusMeta: metasData.statusMeta || 'ABAIXO_DA_META',
      statusMetaLabel: metasData.statusMetaLabel || '🔴 ABAIXO DA META',
      percentualAlvo: metasData.percentualAlvo || 0.0,
      ritmoAtual: metasData.ritmoAtual || 0.0,
      projecaoFechamento: metasData.projecaoFechamento || 0,
      diasUteisRestantes: metasData.diasUteisRestantes || 22,
      faturamentoLancado: metasData.faturamentoLancado || 0.0,
      taxaRetrabalho: metasData.taxaRetrabalho || 0.0,
      statusQualidadeLabel: metasData.statusQualidadeLabel || 'Sem dados',
      colaboradores: metasData.equipe || [],
    };
  } catch (err) {
    console.error('[getTvFabricaData] Erro ao integrar metas:', err);
  }

  // 2. Colaboradores / Bancadas Oficiais da Fábrica
  const baseBancadas = [
    { id: 'usr-tecnico-01', tecId: 'colab-joao', nome: 'João', funcao: 'Produção' },
    { id: 'usr-tecnico-03', tecId: 'colab-joas', nome: 'Joás', funcao: 'Produção' },
    { id: 'usr-tecnico-02', tecId: 'colab-samuel', nome: 'Samuel', funcao: 'Produção' },
    { id: 'usr-qualidade-01', tecId: 'colab-rhyan', nome: 'Rhyan', funcao: 'Qualidade/Testes' },
  ];

  let producoesAtivasList: any[] = [];
  let producoesFinalizadasHoje: any[] = [];
  let filaPrioritariaList: any[] = [];
  let testesHojeList: any[] = [];

  if (isDatabaseReady()) {
    try {
      // Janela de 24 horas para o Painel Renetec (TV da Fábrica):
      // Garante ciclo de 24h contínuas para não zerar após 2 horas devido ao fuso horário UTC
      const limite24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [ativas, finalizadas, filaItens, testes] = await Promise.all([
        prisma.producao.findMany({
          where: { status: 'EM_ANDAMENTO' },
          include: {
            itemOrdemServico: {
              include: {
                ordemServico: { include: { cliente: true } },
                tipoEquipamento: true,
                tecnicoAlocado: true,
              },
            },
            tecnico: true,
          },
          orderBy: { dataInicio: 'desc' },
        }),
        prisma.producao.findMany({
          where: {
            status: 'FINALIZADO',
            dataFim: { gte: limite24Horas },
          },
          include: {
            itemOrdemServico: {
              include: { tipoEquipamento: true, tecnicoAlocado: true, ordemServico: { include: { cliente: true } } },
            },
            tecnico: true,
          },
        }),
        prisma.itemOrdemServico.findMany({
          where: { statusItem: { in: ['AGUARDANDO_PRODUCAO', 'RECEBIDO'] } },
          include: {
            ordemServico: { include: { cliente: true } },
            tipoEquipamento: true,
            tecnicoAlocado: true,
          },
          orderBy: [
            { ordemServico: { prioridade: 'desc' } },
            { ordemServico: { dataEntrada: 'asc' } },
          ],
          take: 5,
        }),
        prisma.teste.findMany({
          where: { dataTeste: { gte: limite24Horas } },
          include: {
            inspetor: true,
            producao: {
              include: {
                tecnico: true,
                itemOrdemServico: {
                  include: {
                    tipoEquipamento: true,
                    tecnicoAlocado: true,
                    retrabalhos: {
                      orderBy: { dataFim: 'desc' },
                      take: 1,
                      include: {
                        tecnicoResponsavel: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      producoesAtivasList = ativas;
      producoesFinalizadasHoje = finalizadas;
      testesHojeList = testes;
      filaPrioritariaList = filaItens.map((it) => {
        const ptsUnit = getPontosUnitarios(it.tipoEquipamento?.nome);
        return {
          id: it.id,
          numeroOS: it.ordemServico?.numeroOS || 0,
          clienteNome: it.ordemServico?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações',
          equipamentoNome: it.tipoEquipamento?.nome || 'Equipamento',
          quantidade: it.quantidade,
          pontosTotais: Number((it.quantidade * ptsUnit).toFixed(1)),
          prioridade: it.ordemServico?.prioridade || 'MEDIA',
          status: it.statusItem,
        };
      });
    } catch (err) {
      console.error('[getTvFabricaData] Erro ao consultar dados no Supabase:', err);
    }
  }

  // Bancadas técnicas oficiais (exclui contas de Admin e genéricas)
  const bancadas: BancadaStatus[] = baseBancadas.map((b) => {
    // 1. Procurar produção ativa para este técnico
    const ativa = producoesAtivasList.find((p) => {
      const tId = p.tecnicoId || p.tecnico?.id;
      const tNome = p.tecnico?.nome || p.itemOrdemServico?.tecnicoAlocado?.nome;
      const tecAlocId = p.itemOrdemServico?.tecnicoAlocadoId || p.itemOrdemServico?.tecnicoAlocado?.id;
      return (
        isTecnicoMatch(tId, tNome, b.id, b.nome) ||
        isTecnicoMatch(tId, tNome, b.tecId, b.nome) ||
        isTecnicoMatch(tecAlocId, tNome, b.id, b.nome) ||
        isTecnicoMatch(tecAlocId, tNome, b.tecId, b.nome)
      );
    });

    let producaoAtivaPayload: BancadaStatus['producaoAtiva'] = null;

    if (ativa) {
      const itemOS = ativa.itemOrdemServico;
      const eqNome = itemOS?.tipoEquipamento?.nome || 'Equipamento em Manutenção';
      const qtd = ativa.quantidadeProduzida || itemOS?.quantidade || 1;
      const ptsUnit = getPontosUnitarios(eqNome);
      const dInicio = ativa.dataInicio ? new Date(ativa.dataInicio) : agora;
      const diffMin = Math.max(1, Math.floor((agora.getTime() - dInicio.getTime()) / 60000));

      producaoAtivaPayload = {
        id: ativa.id,
        numeroOS: itemOS?.ordemServico?.numeroOS || 1001,
        clienteNome: itemOS?.ordemServico?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações',
        equipamentoNome: eqNome,
        quantidade: qtd,
        pontosTotais: Number((qtd * ptsUnit).toFixed(1)),
        dataInicio: dInicio.toISOString(),
        tempoDecorridoMinutos: diffMin,
      };
    }

    // 2. Calcular indicadores e pontos produzidos/testados hoje por este colaborador
    // REGRA: Pontuação SÓ É CONTABILIZADA QUANDO APROVADO NO TESTE (ou aprovado após retrabalho).
    // Testes reprovados (não conformes) geram 0 pontos.
    let ptsHoje = 0;
    let qtdTestadaHoje = 0;
    let qtdAprovadaHoje = 0;
    let retrabalhoHoje = 0;

    if (b.funcao.includes('Qualidade') || b.nome.toLowerCase().includes('rhyan')) {
      for (const t of testesHojeList) {
        const inspId = t.inspetorId || t.inspetor?.id;
        const inspNome = t.inspetor?.nome;
        if (
          isTecnicoMatch(inspId, inspNome, b.id, b.nome) ||
          isTecnicoMatch(inspId, inspNome, b.tecId, b.nome) ||
          !t.inspetor
        ) {
          const eqNome = (t as any).producao?.itemOrdemServico?.tipoEquipamento?.nome || '';
          const qtdAprov = t.quantidadeAprovada || 0;
          const qtdTest = t.quantidadeTestada || 1;
          const ptsUnit = getPontosUnitarios(eqNome);

          // REGRA: Sem defeito NÃO conta ponto! Apenas peças reparadas aprovadas
          const prodObj = (t as any).producao;
          const textoDef = (prodObj?.itemOrdemServico?.defeitoRelatado || '').toLowerCase();
          const textoServ = (prodObj?.servicoRealizado || '').toLowerCase();
          const textoCompleto = `${textoDef} ${textoServ}`;
          const isSemDef = textoCompleto.includes('categoria: sem_defeito') || textoCompleto.includes('sem defeito aparente');
          const matchRep = textoCompleto.match(/(\d+)\s*rep/i);
          
          const repQtd = (prodObj?.quantidadeReparada !== undefined && prodObj?.quantidadeReparada > 0)
            ? prodObj.quantidadeReparada
            : (isSemDef ? 0 : (matchRep ? parseInt(matchRep[1]) : (prodObj?.quantidadeProduzida || qtdAprov)));
          const qtdPontuavel = Math.min(qtdAprov, repQtd);

          if (qtdPontuavel > 0) {
            ptsHoje += qtdPontuavel * ptsUnit;
          }
          qtdTestadaHoje += qtdTest;
          qtdAprovadaHoje += qtdAprov;
          retrabalhoHoje += t.quantidadeReprovada || 0;
        }
      }
    } else {
      for (const t of testesHojeList) {
        const prod = (t as any).producao;
        const ret = prod?.itemOrdemServico?.retrabalhos?.[0];
        const retTecId = ret?.tecnicoResponsavelId || ret?.tecnicoResponsavel?.id;
        const retTecNome = ret?.tecnicoResponsavel?.nome;

        const tId = retTecId || prod?.tecnicoId || prod?.tecnico?.id;
        const tNome = retTecNome || prod?.tecnico?.nome || prod?.itemOrdemServico?.tecnicoAlocado?.nome;
        const tecAlocId = prod?.itemOrdemServico?.tecnicoAlocadoId || prod?.itemOrdemServico?.tecnicoAlocado?.id;

        if (
          isTecnicoMatch(tId, tNome, b.id, b.nome) ||
          isTecnicoMatch(tId, tNome, b.tecId, b.nome) ||
          isTecnicoMatch(tecAlocId, tNome, b.id, b.nome) ||
          isTecnicoMatch(tecAlocId, tNome, b.tecId, b.nome)
        ) {
          const eqNome = prod?.itemOrdemServico?.tipoEquipamento?.nome || '';
          const qtdAprov = t.quantidadeAprovada || 0;
          const ptsUnit = getPontosUnitarios(eqNome);

          // REGRA: Sem defeito NÃO conta ponto! Apenas peças reparadas aprovadas
          const textoDef = (prod?.itemOrdemServico?.defeitoRelatado || '').toLowerCase();
          const textoServ = (prod?.servicoRealizado || '').toLowerCase();
          const textoCompleto = `${textoDef} ${textoServ}`;
          const isSemDef = textoCompleto.includes('categoria: sem_defeito') || textoCompleto.includes('sem defeito aparente');
          const matchRep = textoCompleto.match(/(\d+)\s*rep/i);
          
          const repQtd = (prod?.quantidadeReparada !== undefined && prod?.quantidadeReparada > 0)
            ? prod.quantidadeReparada
            : (isSemDef ? 0 : (matchRep ? parseInt(matchRep[1]) : (prod?.quantidadeProduzida || qtdAprov)));
          const qtdPontuavel = Math.min(qtdAprov, repQtd);

          if (qtdPontuavel > 0) {
            ptsHoje += qtdPontuavel * ptsUnit;
          }
          qtdTestadaHoje += t.quantidadeTestada || 0;
          qtdAprovadaHoje += qtdAprov;
          retrabalhoHoje += t.quantidadeReprovada || 0;
        }
      }
    }

    const taxaQualidadeHoje = qtdTestadaHoje > 0 
      ? Number(((qtdAprovadaHoje / qtdTestadaHoje) * 100).toFixed(1)) 
      : 100.0;

    return {
      tecnicoId: b.tecId,
      tecnicoNome: b.nome,
      funcao: b.funcao,
      status: ativa ? 'EM_PRODUCAO' : 'DISPONIVEL',
      producaoAtiva: producaoAtivaPayload,
      pontosHoje: Number(ptsHoje.toFixed(1)),
      quantidadeTestadaHoje: qtdTestadaHoje,
      quantidadeAprovadaHoje: qtdAprovadaHoje,
      retrabalhoHoje,
      taxaQualidadeHoje,
    };
  });

  // 3. FPY Hoje
  let totalTestados = 0;
  let reprovados = 0;
  for (const t of testesHojeList) {
    totalTestados += t.quantidadeTestada || 0;
    reprovados += t.quantidadeReprovada || 0;
  }
  const aprovadosPrimeiraVez = Math.max(0, totalTestados - reprovados);
  const fpyPercentual =
    totalTestados > 0 ? Number(((aprovadosPrimeiraVez / totalTestados) * 100).toFixed(1)) : 100.0;

  return {
    timestamp: agora.toISOString(),
    meta: metaInfo,
    bancadas,
    fpyHoje: {
      fpyPercentual,
      totalTestados,
      aprovadosPrimeiraVez,
      reprovados,
    },
    filaPrioritaria: filaPrioritariaList,
  };
}

// ─── Agregação para o Dashboard Gerencial ─────────────────────────────────────
export async function getGerencialData(periodo: string = 'mes_atual'): Promise<GerencialData> {
  const tvData = await getTvFabricaData();

  let leadTimeMedioGeralMinutos = 0;
  let totalOsAtivas = tvData.filaPrioritaria.length + tvData.bancadas.filter((b) => b.status === 'EM_PRODUCAO').length;
  let distribuicaoDefeitos: DefeitoDistribuicao[] = [];
  let leadTimePorEquipamento: LeadTimeEquipamento[] = [];
  let producaoHistoricoDias: { data: string; pontos: number; reprovados: number }[] = [];

  if (isDatabaseReady()) {
    try {
      // 1. Total real de OSs ativas no sistema (não concluídas e não canceladas)
      const osAtivasCount = await prisma.ordemServico.count({
        where: { status: { notIn: ['CONCLUIDO', 'CANCELADO', 'SEM_REPARO'] } },
      });
      totalOsAtivas = osAtivasCount;

      // 2. Lead Time real calculado a partir das produções finalizadas
      const producoesFinalizadas = await prisma.producao.findMany({
        where: { status: 'FINALIZADO', dataFim: { not: null } },
        include: { itemOrdemServico: { include: { tipoEquipamento: true } } },
        orderBy: { dataFim: 'desc' },
        take: 100,
      });

      if (producoesFinalizadas.length > 0) {
        let somaMinutos = 0;
        const equipMap: Record<string, { somaMin: number; qtd: number }> = {};

        for (const p of producoesFinalizadas) {
          if (p.dataInicio && p.dataFim) {
            const diffMin = Math.max(1, Math.round((new Date(p.dataFim).getTime() - new Date(p.dataInicio).getTime()) / 60000));
            somaMinutos += diffMin;

            const eqNome = p.itemOrdemServico?.tipoEquipamento?.nome || 'Geral';
            if (!equipMap[eqNome]) equipMap[eqNome] = { somaMin: 0, qtd: 0 };
            equipMap[eqNome].somaMin += diffMin;
            equipMap[eqNome].qtd += (p.quantidadeProduzida || 1);
          }
        }
        leadTimeMedioGeralMinutos = Math.round(somaMinutos / producoesFinalizadas.length);

        leadTimePorEquipamento = Object.entries(equipMap).map(([equipamento, data]) => ({
          tipoEquipamentoNome: equipamento,
          pontosUnitarios: getPontosUnitarios(equipamento),
          quantidadeConcluida: data.qtd,
          tempoMedioMinutos: Math.round(data.somaMin / (data.qtd || 1)),
        }));
      }

      // 3. Distribuição real de defeitos (Retrabalhos)
      const retrabalhos = await prisma.retrabalho.findMany({
        include: { motivoReprovacao: true },
        orderBy: { dataInicio: 'desc' },
        take: 100,
      });

      if (retrabalhos.length > 0) {
        const defeitosMap: Record<string, { count: number; categoria: string; codigo: string }> = {};
        for (const r of retrabalhos) {
          const motivo = r.motivoReprovacao?.descricao || r.detalhesDefeito || 'Não conformidade';
          const categoria = r.motivoReprovacao?.categoria || 'OUTRO';
          const codigo = r.motivoReprovacao?.codigo || 'MOT-00';
          if (!defeitosMap[motivo]) {
            defeitosMap[motivo] = { count: 0, categoria, codigo };
          }
          defeitosMap[motivo].count += (r.quantidadeRetrabalho || 1);
        }
        const totalDefeitos = Object.values(defeitosMap).reduce((a, b) => a + b.count, 0) || 1;
        distribuicaoDefeitos = Object.entries(defeitosMap).map(([motivo, item]) => ({
          categoria: item.categoria,
          codigo: item.codigo,
          motivo,
          quantidade: item.count,
          percentual: Number(((item.count / totalDefeitos) * 100).toFixed(1)),
        }));
      }
    } catch (err) {
      console.error('[getGerencialData] Erro ao consultar agregados no DB:', err);
    }
  }

  // Produtividade da equipe: se o período for 'hoje', usa ptsHoje da bancada; se for 'mes_atual', usa os pontos reais acumulados no mês da meta!
  const isHoje = periodo === 'hoje';

  // Pontos reais de produção da equipe hoje (exclui inspeção do CQ para não duplicar pontos)
  const pontosProducaoEquipeHoje = Number(
    tvData.bancadas
      .filter((b) => !b.funcao.toLowerCase().includes('qualidade'))
      .reduce((a, b) => a + (b.pontosHoje || 0), 0)
      .toFixed(1)
  );

  const totalPts = isHoje
    ? (pontosProducaoEquipeHoje || 1)
    : (tvData.meta.pontosRealizados || 1);

  const colaboradoresLista =
    (tvData.meta as any)?.colaboradores && (tvData.meta as any).colaboradores.length > 0
      ? (tvData.meta as any).colaboradores
      : (tvData.meta as any)?.equipe && (tvData.meta as any).equipe.length > 0
      ? (tvData.meta as any).equipe
      : [
          { id: 'colab-samuel', nome: 'Samuel', funcao: 'Produção', pesoBonus: 0.22, pontosRealizados: 0 },
          { id: 'colab-joao', nome: 'João', funcao: 'Produção', pesoBonus: 0.22, pontosRealizados: 0 },
          { id: 'colab-joas', nome: 'Joás', funcao: 'Produção', pesoBonus: 0.22, pontosRealizados: 0 },
          { id: 'colab-rhyan', nome: 'Rhyan', funcao: 'Qualidade/Testes', pesoBonus: 0.17, pontosRealizados: 0 },
          { id: 'colab-luana', nome: 'Luana', funcao: 'Atendimento/Comercial', pesoBonus: 0.17, pontosRealizados: 0 },
        ];

  const produtividadeTecnicos: ProdutividadeTecnico[] = colaboradoresLista.map((c: any) => {
    const bancada = tvData.bancadas.find((b) => isTecnicoMatch(b.tecnicoId || b.id || '', b.tecnicoNome || b.nome || '', c.id, c.nome));
    const pts = isHoje ? (bancada?.pontosHoje || 0) : (c.pontosRealizados ?? 0);
    const taxaAprov = bancada ? (bancada.taxaQualidadeHoje ?? 100.0) : 100.0;

    return {
      tecnicoId: c.id,
      tecnicoNome: c.nome,
      funcao: c.funcao || 'Produção',
      pesoBonus: c.pesoBonus ?? 0.2,
      pontosRealizados: pts,
      percentualTotal: totalPts > 0 ? Number(((pts / totalPts) * 100).toFixed(1)) : 0,
      taxaAprovacao: taxaAprov,
      tempoMedioPorLoteMinutos: leadTimeMedioGeralMinutos || 35,
    };
  });

  return {
    periodo,
    faturamentoEstimado: tvData.meta.faturamentoLancado || 0.0,
    totalOsAtivas,
    pontosTotaisRealizados: isHoje ? pontosProducaoEquipeHoje : tvData.meta.pontosRealizados,
    metaAlvoPeriodo: tvData.meta.metaAlvo,
    fpyGeral: tvData.fpyHoje.fpyPercentual,
    taxaRetrabalho: tvData.meta.taxaRetrabalho,
    leadTimeMedioGeralMinutos: leadTimeMedioGeralMinutos || (tvData.filaPrioritaria.length > 0 ? 30 : 0),
    distribuicaoDefeitos,
    leadTimePorEquipamento,
    produtividadeTecnicos,
    producaoHistoricoDias,
  };
}
