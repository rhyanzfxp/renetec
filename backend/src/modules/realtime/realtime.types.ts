export type RealtimeEventType =
  | 'os:criada'
  | 'producao:iniciada'
  | 'producao:finalizada'
  | 'producao:lote_enviado_teste'
  | 'qualidade:novo_lote'
  | 'qualidade:aprovado'
  | 'qualidade:reprovado'
  | 'retrabalho:criado'
  | 'retrabalho:iniciado'
  | 'retrabalho:concluido'
  | 'meta:atualizada'
  | 'sistema:ping';

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  timestamp: string;
  data: T;
}

