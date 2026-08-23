import { api } from '../../services/api';
import type {
  FilaTesteItem,
  MotivoReprovacaoData,
  RealizarTestePayload,
  HistoricoTesteItem,
} from './teste.types';

export const qualidadeApiService = {
  // Lista itens aguardando teste
  async getFila(): Promise<FilaTesteItem[]> {
    const response = await api.get<{ success: boolean; data: FilaTesteItem[] }>('/qualidade/fila');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Lista motivos de reprovação
  async getMotivos(): Promise<MotivoReprovacaoData[]> {
    const response = await api.get<{ success: boolean; data: MotivoReprovacaoData[] }>('/qualidade/motivos');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Envia resultado da inspeção (Aprovados + Reprovados = Testados)
  async realizarTeste(payload: RealizarTestePayload) {
    const response = await api.post<{ success: boolean; data: unknown; message: string }>(
      '/qualidade/testar',
      payload
    );
    return response.data;
  },

  // Histórico de testes
  async getHistorico(page = 1, limit = 10): Promise<{ data: HistoricoTesteItem[]; total: number }> {
    const response = await api.get<{
      success: boolean;
      data: HistoricoTesteItem[];
      meta?: { total?: number };
    }>('/qualidade/historico', { params: { page, limit } });
    return {
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      total: response.data?.meta?.total || 0,
    };
  },
};
