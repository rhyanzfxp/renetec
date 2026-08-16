import { z } from 'zod';

export const createItemOsSchema = z.object({
  tipoEquipamentoId: z.string().min(1, 'Tipo de equipamento é obrigatório'),
  quantidade: z.coerce.number().int().min(1, 'Quantidade mínima é 1'),
  defeitoRelatado: z.string().min(3, 'Descreva o defeito relatado'),
  numeroSerie: z.string().optional(),
  tecnicoAlocadoId: z.string().optional(),
});

export const createOsSchema = z.object({
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
  valorOrcamento: z.coerce.number().optional(),
  observacoes: z.string().optional(),
  itens: z.array(createItemOsSchema).min(1, 'A OS deve conter ao menos 1 item'),
});

export type CreateOsInput = z.infer<typeof createOsSchema>;

export const updateOsStatusSchema = z.object({
  status: z.enum([
    'RECEBIDO',
    'AGUARDANDO_PRODUCAO',
    'EM_PRODUCAO',
    'AGUARDANDO_TESTE',
    'APROVADO',
    'REPROVADO',
    'RETRABALHO',
    'AGUARDANDO_NOVO_TESTE',
    'CONCLUIDO',
    'AGUARDANDO_PECA',
    'AGUARDANDO_CLIENTE',
    'SEM_REPARO',
    'CANCELADO',
  ]),
  observacao: z.string().optional(),
});

export const queryOsSchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  search: z.string().optional(),
  status: z.string().optional(),
  tecnicoId: z.string().optional(),
  clienteId: z.string().optional(),
});
