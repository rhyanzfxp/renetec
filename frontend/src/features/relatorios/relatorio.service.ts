import { api } from '../../services/api';
import type { FiltrosRelatorio } from './relatorio.types';
import type {
  ResponseRelatorioProducao,
  ResponseRelatorioQualidade,
  ResponseRelatorioRetrabalho,
  ResponseRelatorioConsolidado,
  ResponseRelatorioClientes,
} from './relatorio.types';

const buildQueryString = (filtros: FiltrosRelatorio): string => {
  const params = new URLSearchParams();
  if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
  if (filtros.tecnicoId) params.append('tecnicoId', filtros.tecnicoId);
  if (filtros.inspetorId) params.append('inspetorId', filtros.inspetorId);
  if (filtros.clienteId) params.append('clienteId', filtros.clienteId);
  if (filtros.tipoEquipamentoId) params.append('tipoEquipamentoId', filtros.tipoEquipamentoId);
  if (filtros.numeroOS) params.append('numeroOS', filtros.numeroOS);
  return params.toString() ? `?${params.toString()}` : '';
};

export const relatorioApiService = {
  async getProducao(filtros: FiltrosRelatorio = {}): Promise<ResponseRelatorioProducao> {
    const qs = buildQueryString(filtros);
    const res = await api.get<{ success: boolean; data: ResponseRelatorioProducao }>(`/relatorios/producao${qs}`);
    return res.data?.data;
  },

  async getQualidade(filtros: FiltrosRelatorio = {}): Promise<ResponseRelatorioQualidade> {
    const qs = buildQueryString(filtros);
    const res = await api.get<{ success: boolean; data: ResponseRelatorioQualidade }>(`/relatorios/qualidade${qs}`);
    return res.data?.data;
  },

  async getRetrabalho(filtros: FiltrosRelatorio = {}): Promise<ResponseRelatorioRetrabalho> {
    const qs = buildQueryString(filtros);
    const res = await api.get<{ success: boolean; data: ResponseRelatorioRetrabalho }>(`/relatorios/retrabalho${qs}`);
    return res.data?.data;
  },

  async getConsolidado(filtros: FiltrosRelatorio = {}): Promise<ResponseRelatorioConsolidado> {
    const qs = buildQueryString(filtros);
    const res = await api.get<{ success: boolean; data: ResponseRelatorioConsolidado }>(`/relatorios/consolidado${qs}`);
    return res.data?.data;
  },

  async getClientes(filtros: FiltrosRelatorio = {}): Promise<ResponseRelatorioClientes> {
    const qs = buildQueryString(filtros);
    const res = await api.get<{ success: boolean; data: ResponseRelatorioClientes }>(`/relatorios/clientes${qs}`);
    return res.data?.data;
  },
};
