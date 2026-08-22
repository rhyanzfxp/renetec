import { api } from '../../services/api';
import type {
  FilaItemData,
  ProducaoAtivaData,
  FinalizarProducaoPayload,
  ProducaoHistoricoItem,
} from './producao.types';

export const producaoApiService = {
  // Busca a fila de itens disponíveis para o técnico
  async getMinhaFila(): Promise<FilaItemData[]> {
    const response = await api.get<{ success: boolean; data: FilaItemData[] }>('/producao/minha-fila');
    return response.data.data;
  },

  // Busca a produção que está atualmente em andamento
  async getProducaoAtiva(): Promise<ProducaoAtivaData | null> {
    const response = await api.get<{ success: boolean; data: ProducaoAtivaData | null }>('/producao/ativa');
    return response.data.data;
  },

  // Inicia um apontamento de produção
  async iniciarProducao(itemOrdemServicoId: string): Promise<ProducaoAtivaData> {
    const response = await api.post<{ success: boolean; data: ProducaoAtivaData; message: string }>(
      '/producao/iniciar',
      { itemOrdemServicoId }
    );
    return response.data.data;
  },

  // Finaliza o apontamento e avança para CQ
  async finalizarProducao(producaoId: string, payload: FinalizarProducaoPayload) {
    const response = await api.post<{ success: boolean; data: ProducaoAtivaData; message: string }>(
      `/producao/${producaoId}/finalizar`,
      payload
    );
    return response.data;
  },

  // Apontamento de Lote pelo próprio técnico (Auto-atendimento com OS e múltiplos equipamentos)
  async apontarLote(payload: any) {
    const response = await api.post<{ success: boolean; data: any; message: string }>(
      '/producao/apontamento-lote',
      payload
    );
    return response.data;
  },

  // Histórico de produções
  async getHistorico(page = 1, limit = 10): Promise<{ data: ProducaoHistoricoItem[]; total: number }> {
    const response = await api.get<{
      success: boolean;
      data: ProducaoHistoricoItem[];
      meta: { total: number };
    }>('/producao/historico', { params: { page, limit } });
    return { data: response.data.data, total: response.data.meta.total };
  },
};

