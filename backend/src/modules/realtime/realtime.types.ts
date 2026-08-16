export type RealtimeEventType =
  | 'producao:iniciada'
  | 'producao:finalizada'
  | 'qualidade:aprovado'
  | 'qualidade:reprovado'
  | 'retrabalho:iniciado'
  | 'retrabalho:concluido'
  | 'meta:atualizada'
  | 'sistema:ping';

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  timestamp: string;
  data: T;
}
