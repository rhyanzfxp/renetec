import { z } from 'zod';

export const createItemOsSchema = z.object({
  tipoEquipamentoId: z.string().min(1, 'Tipo de equipamento é obrigatório'),
  quantidade: z.coerce.number().int().min(1, 'Quantidade mínima é 1'),
  tipoCategoria: z.enum(['REPARADO', 'SEM_DEFEITO', 'RETRABALHO']).default('REPARADO').optional(),
  defeitoRelatado: z.string().optional().default('Manutenção e reparo técnico'),
  servicoRealizado: z.string().optional(),
  numeroSerie: z.string().optional(),
  tecnicoAlocadoId: z.string().optional(),
});

export const createOsSchema = z.object({
  numeroOS: z.coerce.number().int().positive().optional(),
  clienteId: z.string().optional().default('cli-01'),
  dataEntrada: z.string().optional(),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
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
  ]).optional(),
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

export const createClienteSchema = z.object({
  nomeRazaoSocial: z.string().min(2, 'Nome da empresa/cliente é obrigatório'),
  documento: z.string().optional(),
  contatoTelefone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  endereco: z.string().optional(),
});

export type CreateClienteInput = z.infer<typeof createClienteSchema>;


