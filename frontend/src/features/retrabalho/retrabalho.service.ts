import { api } from '../../services/api';
import type {
  RetrabalhoItemData,
  ConcluirRetrabalhoPayload,
  HistoricoRetrabalhoItem,
} from './retrabalho.types';

export const retrabalhoApiService = {
  // Lista fila de retrabalhos pendentes e em execução
  async getFila(): Promise<RetrabalhoItemData[]> {
    const response = await api.get<{ success: boolean; data: RetrabalhoItemData[] }>('/retrabalho/fila');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Inicia o reparo do retrabalho
  async iniciar(id: string): Promise<RetrabalhoItemData> {
    const response = await api.post<{ success: boolean; data: RetrabalhoItemData; message: string }>(
      `/retrabalho/${id}/iniciar`
    );
    return response.data.data;
  },

  // Conclui o retrabalho e encaminha para Re-teste (AGUARDANDO_NOVO_TESTE)
  async concluir(id: string, payload: ConcluirRetrabalhoPayload) {
    const response = await api.post<{ success: boolean; data: RetrabalhoItemData; message: string }>(
      `/retrabalho/${id}/concluir`,
      payload
    );
    return response.data;
  },

  // Histórico de retrabalhos
  async getHistorico(page = 1, limit = 10): Promise<{ data: HistoricoRetrabalhoItem[]; total: number }> {
    const response = await api.get<{
      success: boolean;
      data: HistoricoRetrabalhoItem[];
      meta?: { total?: number };
    }>('/retrabalho/historico', { params: { page, limit } });
    return {
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      total: response.data?.meta?.total || 0,
    };
  },
};
