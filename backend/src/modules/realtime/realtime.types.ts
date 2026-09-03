export type RealtimeEventType =
  | 'os:criada'
  | 'cliente:criado'
  | 'producao:iniciada'
  | 'producao:pausada'
  | 'producao:salva'
  | 'producao:finalizada'
  | 'producao:lote_enviado_teste'
  | 'qualidade:novo_lote'
  | 'qualidade:aprovado'
  | 'qualidade:reprovado'
  | 'retrabalho:criado'
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

