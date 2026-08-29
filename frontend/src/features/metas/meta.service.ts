import { api } from '../../services/api';
import type {
  MetaAtualData,
  HistoricoMetaItem,
  TabelaPontuacaoItem,
  GuiaComoUsarItem,
  UpdateMetaPayload,
  UpdateBonusSimulationPayload,
} from './meta.types';

export const metaApiService = {
  // Retorna os dados completos do mês atual
  async getMetaAtual(): Promise<MetaAtualData> {
    const response = await api.get<{ success: boolean; data: MetaAtualData }>('/metas/atual');
    return response.data?.data;
  },

  // Retorna a tabela oficial de pontuação de equipamentos
  async getTabelaPontuacao(): Promise<TabelaPontuacaoItem[]> {
    const response = await api.get<{ success: boolean; data: TabelaPontuacaoItem[] }>('/metas/pontuacao');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Retorna o guia operacional "Como usar"
  async getGuiaComoUsar(): Promise<GuiaComoUsarItem[]> {
    const response = await api.get<{ success: boolean; data: GuiaComoUsarItem[] }>('/metas/guia');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Retorna o histórico de metas
  async getHistorico(ano?: number): Promise<HistoricoMetaItem[]> {
    const response = await api.get<{ success: boolean; data: HistoricoMetaItem[] }>('/metas/historico', {
      params: { ano },
    });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Atualiza configuração de metas (somente ADMIN)
  async updateConfig(payload: UpdateMetaPayload) {
    const response = await api.put<{ success: boolean; message: string; data: unknown }>(
      '/metas/config',
      payload
    );
    return response.data;
  },

  // Atualiza simulação de bônus e status de metas individuais
  async updateBonusSimulation(payload: UpdateBonusSimulationPayload) {
    const response = await api.put<{ success: boolean; message: string; data: MetaAtualData }>(
      '/metas/bonus-simulacao',
      payload
    );
    return response.data?.data;
  },

  // Reset administrativo de metas e produções do mês (somente ADMIN)
  async resetarMetas(mesReferencia?: number, anoReferencia?: number, resetarTudo = false) {
    const response = await api.post<{ success: boolean; message: string; data: unknown }>(
      '/metas/resetar',
      { mesReferencia, anoReferencia, resetarTudo }
    );
    return response.data;
  },
};
