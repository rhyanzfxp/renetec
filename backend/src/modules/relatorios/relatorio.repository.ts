import { prisma } from '../../database/prisma.js';
import { getPontosUnitarios } from '../meta/meta.repository.js';

export interface FiltrosRelatorio {
  dataInicio?: string;
  dataFim?: string;
  tecnicoId?: string;
  inspetorId?: string;
  clienteId?: string;
  tipoEquipamentoId?: string;
  numeroOS?: number;
}

export const relatorioRepository = {
  /**
   * Relatório de Produção dos Técnicos:
   * Detalha cada apontamento de bancada com OS, Empresa, Técnico, Equipamento,
   * Reparadas, Sem Defeito (Triagem), Sucata/Morta, Total na Caixa, Data e Pontos.
   */
  async getRelatorioProducao(filtros: FiltrosRelatorio) {
    const where: any = {};

    if (filtros.dataInicio || filtros.dataFim) {
      where.dataFim = {};
      if (filtros.dataInicio) {
        where.dataFim.gte = new Date(filtros.dataInicio);
      }
      if (filtros.dataFim) {
        // Se a data de fim for apenas YYYY-MM-DD, ajusta para o fim do dia
        const fim = new Date(filtros.dataFim);
        if (filtros.dataFim.length <= 10) {
          fim.setHours(23, 59, 59, 999);
        }
        where.dataFim.lte = fim;
      }
    }

    if (filtros.tecnicoId) {
      where.tecnicoId = filtros.tecnicoId;
    }

    if (filtros.tipoEquipamentoId) {
      where.itemOrdemServico = {
        ...(where.itemOrdemServico || {}),
        tipoEquipamentoId: filtros.tipoEquipamentoId,
      };
    }

    if (filtros.clienteId) {
      where.itemOrdemServico = {
        ...(where.itemOrdemServico || {}),
        ordemServico: {
          ...(where.itemOrdemServico?.ordemServico || {}),
          clienteId: filtros.clienteId,
        },
      };
    }

    if (filtros.numeroOS) {
      where.itemOrdemServico = {
        ...(where.itemOrdemServico || {}),
        ordemServico: {
          ...(where.itemOrdemServico?.ordemServico || {}),
          numeroOS: filtros.numeroOS,
        },
      };
    }

    const producoes = await prisma.producao.findMany({
      where,
      orderBy: { dataFim: 'desc' },
      include: {
        tecnico: {
          select: { id: true, nome: true, email: true, perfil: true },
        },
        itemOrdemServico: {
          include: {
            ordemServico: {
              include: {
                cliente: true,
              },
            },
            tipoEquipamento: true,
          },
        },
      },
    });

    return producoes.map((p) => {
      const item = p.itemOrdemServico;
      const os = item?.ordemServico;
      const equip = item?.tipoEquipamento;
      const ptsUnit = getPontosUnitarios(equip?.nome);

      // Parsing de detalhes a partir do histórico/defeito relatado
      const textoDefeito = item?.defeitoRelatado || '';
      const textoServico = p.servicoRealizado || '';

      // Tenta extrair sem defeito e sucata gravados no formato padrão
      let semDefeito = 0;
      let sucata = 0;
      let reparadas = p.quantidadeProduzida;

      const matchSemDef = (textoDefeito + ' ' + textoServico).match(/(\d+)\s*(?:sem def|sem defeito)/i);
      if (matchSemDef) semDefeito = parseInt(matchSemDef[1]);

      const matchSuc = (textoDefeito + ' ' + textoServico).match(/(\d+)\s*sucata/i);
      if (matchSuc) sucata = parseInt(matchSuc[1]);

      const matchRep = (textoDefeito + ' ' + textoServico).match(/(\d+)\s*rep/i);
      if (matchRep) reparadas = parseInt(matchRep[1]);

      const matchCaixa = (textoDefeito + ' ' + textoServico).match(/Caixa(?: Total)?:\s*(\d+)/i);
      const totalCaixa = matchCaixa ? parseInt(matchCaixa[1]) : (reparadas + semDefeito + sucata || p.quantidadeProduzida);

      const categoria = (textoDefeito.includes('Sem defeito') || (semDefeito > 0 && reparadas === 0))
        ? 'SEM_DEFEITO'
        : (textoDefeito.includes('Retrabalho') ? 'RETRABALHO' : 'REPARADO');

      // REGRA OFICIAL: "Sem defeito" NÃO CONTA PONTO! Apenas peças reparadas contam pontos.
      const pontosEstimados = categoria === 'SEM_DEFEITO' ? 0 : Number((reparadas * ptsUnit).toFixed(1));

      return {
        id: p.id,
        numeroOS: os?.numeroOS || null,
        ordemServicoId: os?.id,
        clienteNome: os?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações',
        tecnicoNome: p.tecnico?.nome || 'Operador',
        tecnicoId: p.tecnico?.id,
        tipoEquipamentoNome: equip?.nome || 'Equipamento',
        tipoEquipamentoId: equip?.id,
        dataRegistro: p.dataFim || p.createdAt,
        quantidadeProduzida: p.quantidadeProduzida,
        quantidadeReparada: reparadas,
        quantidadeSemDefeito: semDefeito,
        quantidadeSucata: sucata,
        totalCaixa,
        pontosUnitario: ptsUnit,
        pontosTotal: pontosEstimados,
        categoria,
        servicoRealizado: p.servicoRealizado || 'Manutenção efetuada',
        statusOS: os?.status || 'EM_PRODUCAO',
      };
    });
  },

  /**
   * Relatório de Testes e Controle de Qualidade (CQ):
   * Detalha cada laudo de CQ com OS, Empresa, Inspetor (ex: Rhyan), Técnico que reparou,
   * Técnico de destino do retrabalho, Qtd Testadas, Qtd Aprovadas, Qtd Retrabalho, Motivo e Data.
   */
  async getRelatorioQualidade(filtros: FiltrosRelatorio) {
    const where: any = {};

    if (filtros.dataInicio || filtros.dataFim) {
      where.dataTeste = {};
      if (filtros.dataInicio) {
        where.dataTeste.gte = new Date(filtros.dataInicio);
      }
      if (filtros.dataFim) {
        const fim = new Date(filtros.dataFim);
        if (filtros.dataFim.length <= 10) {
          fim.setHours(23, 59, 59, 999);
        }
        where.dataTeste.lte = fim;
      }
    }

    if (filtros.inspetorId) {
      where.inspetorId = filtros.inspetorId;
    }

    if (filtros.tipoEquipamentoId) {
      where.producao = {
        ...(where.producao || {}),
        itemOrdemServico: {
          ...(where.producao?.itemOrdemServico || {}),
          tipoEquipamentoId: filtros.tipoEquipamentoId,
        },
      };
    }

    if (filtros.clienteId) {
      where.producao = {
        ...(where.producao || {}),
        itemOrdemServico: {
          ...(where.producao?.itemOrdemServico || {}),
          ordemServico: {
            ...(where.producao?.itemOrdemServico?.ordemServico || {}),
            clienteId: filtros.clienteId,
          },
        },
      };
    }

    if (filtros.numeroOS) {
      where.producao = {
        ...(where.producao || {}),
        itemOrdemServico: {
          ...(where.producao?.itemOrdemServico || {}),
          ordemServico: {
            ...(where.producao?.itemOrdemServico?.ordemServico || {}),
            numeroOS: filtros.numeroOS,
          },
        },
      };
    }

    const testes = await prisma.teste.findMany({
      where,
      orderBy: { dataTeste: 'desc' },
      include: {
        inspetor: {
          select: { id: true, nome: true, email: true, perfil: true },
        },
        retrabalhos: {
          include: {
            tecnicoResponsavel: { select: { id: true, nome: true } },
            motivoReprovacao: true,
          },
        },
        producao: {
          include: {
            tecnico: { select: { id: true, nome: true } },
            itemOrdemServico: {
              include: {
                ordemServico: {
                  include: {
                    cliente: true,
                  },
                },
                tipoEquipamento: true,
                tecnicoAlocado: { select: { id: true, nome: true } },
              },
            },
          },
        },
      },
    });

    return testes.map((t) => {
      const item = t.producao?.itemOrdemServico;
      const os = item?.ordemServico;
      const equip = item?.tipoEquipamento;
      const tecReparo = t.producao?.tecnico?.nome || item?.tecnicoAlocado?.nome || 'Técnico';
      const retrabalho = t.retrabalhos?.[0];
      const tecDestino = retrabalho?.tecnicoResponsavel?.nome || tecReparo;
      const motivo = retrabalho?.motivoReprovacao?.descricao || (t.quantidadeReprovada > 0 ? 'Não-conformidade' : null);

      const ptsUnit = getPontosUnitarios(equip?.nome);

      // REGRA: Sem defeito NÃO gera pontos de CQ. Apenas peças reparadas aprovadas geram pontos.
      const textoDef = (item?.defeitoRelatado || '').toLowerCase();
      const textoServ = (t.producao?.servicoRealizado || '').toLowerCase();
      const textoCompleto = `${textoDef} ${textoServ}`;
      const isSemDef = textoCompleto.includes('categoria: sem_defeito') || textoCompleto.includes('sem defeito aparente');
      const matchRep = textoCompleto.match(/(\d+)\s*rep/i);
      const repQtd = isSemDef ? 0 : (matchRep ? parseInt(matchRep[1]) : (t.producao?.quantidadeProduzida || t.quantidadeAprovada));
      const qtdAprovadaReparada = Math.min(t.quantidadeAprovada, repQtd);
      const pontosGanhos = Number((qtdAprovadaReparada * ptsUnit).toFixed(1));

      return {
        id: t.id,
        numeroOS: os?.numeroOS || null,
        ordemServicoId: os?.id,
        clienteNome: os?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações',
        inspetorNome: t.inspetor?.nome || 'Inspetor CQ',
        inspetorId: t.inspetor?.id,
        tecnicoReparoNome: tecReparo,
        tecnicoDestinoRetrabalho: t.quantidadeReprovada > 0 ? tecDestino : null,
        tipoEquipamentoNome: equip?.nome || 'Equipamento',
        tipoEquipamentoId: equip?.id,
        dataTeste: t.dataTeste,
        quantidadeTestada: t.quantidadeTestada,
        quantidadeAprovada: t.quantidadeAprovada,
        quantidadeReprovada: t.quantidadeReprovada,
        motivoReprovacao: motivo,
        categoriaReprovacao: retrabalho?.motivoReprovacao?.categoria || null,
        detalhesDefeito: retrabalho?.detalhesDefeito || null,
        observacao: t.observacao,
        pontosUnitario: ptsUnit,
        pontosTotal: pontosGanhos,
        statusAprovacao: t.quantidadeReprovada === 0 ? 'APROVADO_TOTAL' : (t.quantidadeAprovada > 0 ? 'APROVADO_PARCIAL' : 'REPROVADO_TOTAL'),
      };
    });
  },

  /**
   * Relatório de Retrabalhos:
   * Detalha os retrabalhos gerados no CQ, quem reparou, para qual técnico voltou e status de correção.
   */
  async getRelatorioRetrabalhos(filtros: FiltrosRelatorio) {
    const where: any = {};

    if (filtros.dataInicio || filtros.dataFim) {
      where.createdAt = {};
      if (filtros.dataInicio) {
        where.createdAt.gte = new Date(filtros.dataInicio);
      }
      if (filtros.dataFim) {
        const fim = new Date(filtros.dataFim);
        if (filtros.dataFim.length <= 10) {
          fim.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = fim;
      }
    }

    if (filtros.tecnicoId) {
      where.tecnicoResponsavelId = filtros.tecnicoId;
    }

    const retrabalhos = await prisma.retrabalho.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tecnicoResponsavel: { select: { id: true, nome: true } },
        motivoReprovacao: true,
        teste: {
          include: {
            inspetor: { select: { id: true, nome: true } },
            producao: {
              include: {
                tecnico: { select: { id: true, nome: true } },
                itemOrdemServico: {
                  include: {
                    ordemServico: { include: { cliente: true } },
                    tipoEquipamento: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return retrabalhos.map((r) => {
      const item = r.teste?.producao?.itemOrdemServico;
      const os = item?.ordemServico;
      const equip = item?.tipoEquipamento;

      return {
        id: r.id,
        numeroOS: os?.numeroOS || null,
        clienteNome: os?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações',
        tipoEquipamentoNome: equip?.nome || 'Equipamento',
        quantidadeRetrabalho: r.quantidadeRetrabalho,
        status: r.status,
        motivoDescricao: r.motivoReprovacao?.descricao || 'Falha técnica',
        motivoCategoria: r.motivoReprovacao?.categoria || 'OUTRO',
        detalhesDefeito: r.detalhesDefeito || 'Reparo necessário',
        tecnicoOrigem: r.teste?.producao?.tecnico?.nome || 'Técnico',
        tecnicoDestino: r.tecnicoResponsavel?.nome || 'Técnico de Retrabalho',
        inspetorNome: r.teste?.inspetor?.nome || 'Inspetor CQ',
        dataCriacao: r.createdAt,
        dataInicio: r.dataInicio,
        dataFim: r.dataFim,
      };
    });
  },

  /**
   * Relatório Consolidado de Produtividade Diária por Técnico e Inspetor:
   */
  async getRelatorioConsolidado(filtros: FiltrosRelatorio) {
    const [producoes, testes] = await Promise.all([
      this.getRelatorioProducao(filtros),
      this.getRelatorioQualidade(filtros),
    ]);

    // Agrupamento por Técnico
    const tecnicosMap = new Map<string, {
      nome: string;
      totalReparadas: number;
      totalSemDefeito: number;
      totalSucata: number;
      totalLotes: number;
      pontosTotal: number;
      retrabalhosRecebidos: number;
    }>();

    for (const p of producoes) {
      const key = p.tecnicoNome;
      const current = tecnicosMap.get(key) || {
        nome: key,
        totalReparadas: 0,
        totalSemDefeito: 0,
        totalSucata: 0,
        totalLotes: 0,
        pontosTotal: 0,
        retrabalhosRecebidos: 0,
      };

      current.totalReparadas += p.quantidadeReparada;
      current.totalSemDefeito += p.quantidadeSemDefeito;
      current.totalSucata += p.quantidadeSucata;
      current.totalLotes += 1;
      current.pontosTotal += p.pontosTotal;
      tecnicosMap.set(key, current);
    }

    // Contabiliza retrabalhos voltados para cada técnico
    for (const t of testes) {
      if (t.tecnicoDestinoRetrabalho && t.quantidadeReprovada > 0) {
        const current = tecnicosMap.get(t.tecnicoDestinoRetrabalho);
        if (current) {
          current.retrabalhosRecebidos += t.quantidadeReprovada;
        }
      }
    }

    // Agrupamento por Inspetor de CQ
    const inspetoresMap = new Map<string, {
      nome: string;
      totalTestadas: number;
      totalAprovadas: number;
      totalReprovadas: number;
      totalLaudos: number;
      fpy: number;
      pontosTotal: number;
    }>();

    for (const t of testes) {
      const key = t.inspetorNome;
      const current = inspetoresMap.get(key) || {
        nome: key,
        totalTestadas: 0,
        totalAprovadas: 0,
        totalReprovadas: 0,
        totalLaudos: 0,
        fpy: 100,
        pontosTotal: 0,
      };

      current.totalTestadas += t.quantidadeTestada;
      current.totalAprovadas += t.quantidadeAprovada;
      current.totalReprovadas += t.quantidadeReprovada;
      current.totalLaudos += 1;
      current.pontosTotal += t.pontosTotal;
      inspetoresMap.set(key, current);
    }

    for (const [, v] of inspetoresMap) {
      v.fpy = v.totalTestadas > 0 ? (v.totalAprovadas / v.totalTestadas) * 100 : 100;
    }

    return {
      tecnicos: Array.from(tecnicosMap.values()),
      inspetores: Array.from(inspetoresMap.values()),
      totaisGerais: {
        totalReparadas: producoes.reduce((acc, p) => acc + p.quantidadeReparada, 0),
        totalSemDefeito: producoes.reduce((acc, p) => acc + p.quantidadeSemDefeito, 0),
        totalSucata: producoes.reduce((acc, p) => acc + p.quantidadeSucata, 0),
        totalTestadas: testes.reduce((acc, t) => acc + t.quantidadeTestada, 0),
        totalAprovadasCQ: testes.reduce((acc, t) => acc + t.quantidadeAprovada, 0),
        totalRetrabalhoCQ: testes.reduce((acc, t) => acc + t.quantidadeReprovada, 0),
        fpyGeral: testes.reduce((acc, t) => acc + t.quantidadeTestada, 0) > 0
          ? (testes.reduce((acc, t) => acc + t.quantidadeAprovada, 0) / testes.reduce((acc, t) => acc + t.quantidadeTestada, 0)) * 100
          : 100,
      },
    };
  },

  /**
   * Relatório de Resumo por Cliente / Empresa:
   */
  async getRelatorioClientes(filtros: FiltrosRelatorio) {
    const producoes = await this.getRelatorioProducao(filtros);

    const clientesMap = new Map<string, {
      clienteNome: string;
      totalReparadas: number;
      totalSemDefeito: number;
      totalSucata: number;
      totalVolumeCaixas: number;
      totalApontamentos: number;
    }>();

    for (const p of producoes) {
      const key = p.clienteNome;
      const current = clientesMap.get(key) || {
        clienteNome: key,
        totalReparadas: 0,
        totalSemDefeito: 0,
        totalSucata: 0,
        totalVolumeCaixas: 0,
        totalApontamentos: 0,
      };

      current.totalReparadas += p.quantidadeReparada;
      current.totalSemDefeito += p.quantidadeSemDefeito;
      current.totalSucata += p.quantidadeSucata;
      current.totalVolumeCaixas += p.totalCaixa;
      current.totalApontamentos += 1;
      clientesMap.set(key, current);
    }

    return Array.from(clientesMap.values());
  },
};
