import { api } from '../../services/api';
import type { TvFabricaResponse, GerencialResponse } from './dashboard.types';

export const dashboardApiService = {
  // Retorna os dados em tempo real para a TV do chão de fábrica
  async getTvFabrica(): Promise<TvFabricaResponse> {
    const response = await api.get<{ success: boolean; data: TvFabricaResponse }>('/dashboard/tv-fabrica');
    return response.data.data;
  },

  // Retorna os dados executivos do Dashboard Gerencial
  async getGerencial(periodo: string = 'mes_atual'): Promise<GerencialResponse> {
    const response = await api.get<{ success: boolean; data: GerencialResponse }>('/dashboard/gerencial', {
      params: { periodo },
    });
    return response.data.data;
  },
};
