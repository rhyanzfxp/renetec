export type RealtimeEventType =
  | 'os:criada'
  | 'producao:lote_enviado_teste'
  | 'qualidade:novo_lote'
  | 'retrabalho:criado'
  | 'producao:iniciada'
  | 'producao:finalizada'
  | 'qualidade:aprovado'
  | 'qualidade:reprovado'
  | 'retrabalho:iniciado'
  | 'retrabalho:concluido'
  | 'meta:atualizada'
  | 'dashboard:atualizado'
  | 'sistema:ping';


export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  timestamp: string;
  data: T;
}

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

export interface RealtimeToast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  timestamp: Date;
}
