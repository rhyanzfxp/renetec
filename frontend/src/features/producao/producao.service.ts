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
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Busca todas as caixas/OSs recentes do técnico (bancada, fila, teste)
  async getMinhasCaixas(): Promise<FilaItemData[]> {
    const response = await api.get<{ success: boolean; data: FilaItemData[] }>('/producao/minhas-caixas');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Busca a produção que está atualmente em andamento
  async getProducaoAtiva(): Promise<ProducaoAtivaData | null> {
    const response = await api.get<{ success: boolean; data: ProducaoAtivaData | null }>('/producao/ativa');
    return response.data?.data || null;
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

  // Pausa a produção ativa e mantém a OS na bancada do técnico para continuar depois
  async pausarProducao(producaoId?: string, observacao?: string) {
    const response = await api.post<{ success: boolean; data: any; message: string }>(
      '/producao/pausar',
      { producaoId, observacao }
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
      meta?: { total?: number };
    }>('/producao/historico', { params: { page, limit } });
    return {
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      total: response.data?.meta?.total || 0,
    };
  },

  // Despacha um item de bancada (EM_PRODUCAO) para o CQ
  async despacharItemParaCQ(itemOrdemServicoId: string) {
    const response = await api.post<{ success: boolean; data: any; message: string }>(
      `/producao/item/${itemOrdemServicoId}/despachar-cq`
    );
    return response.data;
  },

  // Busca todas as OSs em andamento do técnico com histórico e detalhamento
  async getMinhasOsEmAndamento() {
    const response = await api.get<{ success: boolean; data: import('./producao.types').OsEmAndamentoData[] }>(
      '/producao/em-andamento'
    );
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Busca o resumo da produção de hoje do técnico logado
  async getProducaoHoje() {
    const response = await api.get<{ success: boolean; data: import('./producao.types').ProducaoHojeResumo }>(
      '/producao/resumo-hoje'
    );
    return response.data?.data || null;
  },

  // Conclui uma Ordem de Serviço definitivamente
  async concluirOs(osIdOrNumero: string | number, observacao?: string) {
    const response = await api.post<{ success: boolean; data: any; message: string }>(
      `/producao/os/${osIdOrNumero}/concluir`,
      { observacao }
    );
    return response.data;
  },

  // Despacha a OS inteira e seus itens para a fila de testes do CQ
  async despacharOsParaCQ(osIdOrNumero: string | number, observacao?: string) {
    const response = await api.post<{ success: boolean; data: any; message: string }>(
      `/producao/os/${osIdOrNumero}/despachar-cq`,
      { observacao }
    );
    return response.data;
  },

  // Exclui uma Ordem de Serviço incorreta / lançada por engano
  async excluirOs(osIdOrNumero: string | number) {
    const response = await api.delete<{ success: boolean; data: any; message: string }>(
      `/producao/os/${osIdOrNumero}`
    );
    return response.data;
  },
};



