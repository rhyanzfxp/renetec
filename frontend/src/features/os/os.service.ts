import { api } from '../../services/api';
import type { 
  OrdemServicoData, 
  CreateOsPayload, 
  ClienteOption, 
  CreateClientePayload,
  TipoEquipamentoOption, 
  TecnicoOption 
} from './os.types';
import type { StatusOS } from '../../types/auth';

const STORAGE_CUSTOM_CLIENTES = '@renetec:custom_clientes';

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
    let apiClientes: ClienteOption[] = [];
    try {
      const response = await api.get<{ success: boolean; data: ClienteOption[] }>('/os/clientes');
      apiClientes = Array.isArray(response.data?.data) ? response.data.data : [];
    } catch {
      apiClientes = [];
    }

    // Carrega clientes salvos localmente e mescla sem duplicar
    try {
      const localStr = localStorage.getItem(STORAGE_CUSTOM_CLIENTES);
      if (localStr) {
        const localList: ClienteOption[] = JSON.parse(localStr);
        const existingNames = new Set(apiClientes.map((c) => c.nomeRazaoSocial.toLowerCase().trim()));
        for (const loc of localList) {
          if (!existingNames.has(loc.nomeRazaoSocial.toLowerCase().trim())) {
            apiClientes.push(loc);
            existingNames.add(loc.nomeRazaoSocial.toLowerCase().trim());
          }
        }
      }
    } catch {
      // Ignora erro de storage
    }

    return apiClientes;
  },

  async createCliente(data: CreateClientePayload): Promise<ClienteOption> {
    let novoCliente: ClienteOption;
    try {
      const response = await api.post<{ success: boolean; data: ClienteOption; message: string }>('/os/clientes', data);
      novoCliente = response.data?.data || {
        id: `cli-${Date.now()}`,
        nomeRazaoSocial: data.nomeRazaoSocial,
        documento: data.documento,
        contatoTelefone: data.contatoTelefone,
        email: data.email,
      };
    } catch {
      novoCliente = {
        id: `cli-${Date.now()}`,
        nomeRazaoSocial: data.nomeRazaoSocial,
        documento: data.documento,
        contatoTelefone: data.contatoTelefone,
        email: data.email,
      };
    }

    // Salva no localStorage para persistência garantida
    try {
      const localStr = localStorage.getItem(STORAGE_CUSTOM_CLIENTES);
      const list: ClienteOption[] = localStr ? JSON.parse(localStr) : [];
      if (!list.some((c) => c.nomeRazaoSocial.toLowerCase().trim() === novoCliente.nomeRazaoSocial.toLowerCase().trim())) {
        list.push(novoCliente);
        localStorage.setItem(STORAGE_CUSTOM_CLIENTES, JSON.stringify(list));
      }
    } catch {
      // Ignora
    }

    return novoCliente;
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

