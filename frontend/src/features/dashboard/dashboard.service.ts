import { api } from '../../services/api';
import type { TvFabricaResponse, GerencialResponse } from './dashboard.types';

export const dashboardApiService = {
  // Retorna os dados em tempo real para a TV do chão de fábrica
  async getTvFabrica(): Promise<TvFabricaResponse> {
    const response = await api.get<{ success: boolean; data: TvFabricaResponse }>('/dashboard/tv-fabrica');
    return response.data.data;
  },

  // Retorna os dados executivos do Dashboard Gerencial
  async getGerencial(
    periodo: string = 'mes_atual',
    mes?: number,
    ano?: number
  ): Promise<GerencialResponse> {
    const response = await api.get<{ success: boolean; data: GerencialResponse }>('/dashboard/gerencial', {
      params: { periodo, mes, ano },
    });
    return response.data.data;
  },

  // Retorna o fechamento mensal consolidado (exclusivo para ADMIN)
  async getFechamentoMensal(mes?: number, ano?: number): Promise<GerencialResponse> {
    const response = await api.get<{ success: boolean; data: GerencialResponse }>('/dashboard/fechamento-mensal', {
      params: { mes, ano },
    });
    return response.data.data;
  },
};
