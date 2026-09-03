import { relatorioRepository, type FiltrosRelatorio } from './relatorio.repository.js';

export const relatorioService = {
  async getRelatorioProducao(filtros: FiltrosRelatorio) {
    const itens = await relatorioRepository.getRelatorioProducao(filtros);
    const totalReparadas = itens.reduce((acc, i) => acc + i.quantidadeReparada, 0);
    const totalSemDefeito = itens.reduce((acc, i) => acc + i.quantidadeSemDefeito, 0);
    const totalSucata = itens.reduce((acc, i) => acc + i.quantidadeSucata, 0);
    const totalPontos = itens.reduce((acc, i) => acc + i.pontosTotal, 0);

    return {
      totais: {
        totalItens: itens.length,
        totalReparadas,
        totalSemDefeito,
        totalSucata,
        totalProcessadoHoje: totalReparadas + totalSemDefeito + totalSucata,
        totalPontos: parseFloat(totalPontos.toFixed(1)),
      },
      dados: itens,
    };
  },

  async getRelatorioQualidade(filtros: FiltrosRelatorio) {
    const itens = await relatorioRepository.getRelatorioQualidade(filtros);
    const totalTestadas = itens.reduce((acc, i) => acc + i.quantidadeTestada, 0);
    const totalAprovadas = itens.reduce((acc, i) => acc + i.quantidadeAprovada, 0);
    const totalReprovadas = itens.reduce((acc, i) => acc + i.quantidadeReprovada, 0);
    const fpy = totalTestadas > 0 ? (totalAprovadas / totalTestadas) * 100 : 100;
    const totalPontos = itens.reduce((acc, i) => acc + i.pontosTotal, 0);

    return {
      totais: {
        totalLaudos: itens.length,
        totalTestadas,
        totalAprovadas,
        totalReprovadas,
        fpy: parseFloat(fpy.toFixed(1)),
        totalPontos: parseFloat(totalPontos.toFixed(1)),
      },
      dados: itens,
    };
  },

  async getRelatorioRetrabalhos(filtros: FiltrosRelatorio) {
    const itens = await relatorioRepository.getRelatorioRetrabalhos(filtros);
    const totalUnidades = itens.reduce((acc, i) => acc + i.quantidadeRetrabalho, 0);
    const pendentes = itens.filter((i) => i.status === 'PENDENTE').reduce((acc, i) => acc + i.quantidadeRetrabalho, 0);
    const concluidos = itens.filter((i) => i.status === 'CONCLUIDO').reduce((acc, i) => acc + i.quantidadeRetrabalho, 0);

    return {
      totais: {
        totalOcorrencias: itens.length,
        totalUnidades,
        pendentes,
        concluidos,
      },
      dados: itens,
    };
  },

  async getRelatorioConsolidado(filtros: FiltrosRelatorio) {
    return relatorioRepository.getRelatorioConsolidado(filtros);
  },

  async getRelatorioClientes(filtros: FiltrosRelatorio) {
    const clientes = await relatorioRepository.getRelatorioClientes(filtros);
    return {
      totais: {
        totalClientes: clientes.length,
        totalReparadas: clientes.reduce((acc, c) => acc + c.totalReparadas, 0),
        totalSemDefeito: clientes.reduce((acc, c) => acc + c.totalSemDefeito, 0),
        totalSucata: clientes.reduce((acc, c) => acc + c.totalSucata, 0),
      },
      dados: clientes,
    };
  },
};
