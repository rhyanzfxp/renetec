import { api } from '../../services/api';
import type { 
  OrdemServicoData, 
  CreateOsPayload, 
  ClienteOption, 
  TipoEquipamentoOption, 
  TecnicoOption 
} from './os.types';
import type { StatusOS } from '../../types/auth';

export const osApiService = {
  async list(params?: { search?: string; status?: string; tecnicoId?: string; page?: number; limit?: number }) {
    const response = await api.get<{ success: boolean; data: OrdemServicoData[]; meta: { total: number; totalPages: number } }>('/os', { params });
    return {
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      meta: response.data?.meta || { total: 0, totalPages: 1 },
    };
  },

  async getById(id: string) {
    const response = await api.get<{ success: boolean; data: OrdemServicoData }>(`/os/${id}`);
    return response.data?.data;
  },

  async create(data: CreateOsPayload) {
    const response = await api.post<{ success: boolean; data: OrdemServicoData; message: string }>('/os', data);
    return response.data;
  },

  async updateStatus(id: string, status: StatusOS, observacao?: string) {
    const response = await api.patch<{ success: boolean; data: OrdemServicoData; message: string }>(`/os/${id}/status`, {
      status,
      observacao,
    });
    return response.data;
  },

  async getClientes(): Promise<ClienteOption[]> {
    const response = await api.get<{ success: boolean; data: ClienteOption[] }>('/os/clientes');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  async getTiposEquipamento(): Promise<TipoEquipamentoOption[]> {
    const response = await api.get<{ success: boolean; data: TipoEquipamentoOption[] }>('/os/tipos-equipamento');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  async getTecnicos(): Promise<TecnicoOption[]> {
    const response = await api.get<{ success: boolean; data: TecnicoOption[] }>('/os/tecnicos');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },
};
