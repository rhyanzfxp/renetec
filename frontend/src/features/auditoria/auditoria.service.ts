import { api } from '../../services/api';
import type { AuditAcao, GetAuditLogsResponse } from './auditoria.types';

export interface GetAuditLogsParams {
  acao?: AuditAcao;
  usuarioId?: string;
  entidade?: string;
  page?: number;
  limit?: number;
}

export const auditoriaApiService = {
  async getLogs(params?: GetAuditLogsParams): Promise<GetAuditLogsResponse> {
    const response = await api.get<GetAuditLogsResponse>('/auditoria', {
      params,
    });
    return response.data;
  },
};
