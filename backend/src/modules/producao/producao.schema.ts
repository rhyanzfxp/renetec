import { z } from 'zod';

// Schema para iniciar uma produção individual na bancada
export const IniciarProducaoSchema = z.object({
  itemOrdemServicoId: z.string().min(1, { message: 'ID do item inválido' }),
});

// Schema para finalizar uma produção individual
export const FinalizarProducaoSchema = z.object({
  quantidadeProduzida: z
    .number({ required_error: 'Quantidade produzida é obrigatória' })
    .int()
    .min(1, 'Quantidade deve ser ao menos 1'),
  servicoRealizado: z
    .string({ required_error: 'Descreva o serviço realizado' })
    .min(3, 'Descreva o serviço realizado')
    .max(2000),
  observacao: z.string().max(1000).optional(),
  enviarAoCQ: z.boolean().default(true),
});

// Schema para pausar uma produção individual na bancada
export const PausarProducaoSchema = z.object({
  producaoId: z.string().optional(),
  observacao: z.string().max(1000).optional(),
});

// Schema para Apontamento de Lote do Técnico (Ex: Caixa com 50 unidades, 12 reparadas hoje, 2 sucata, 36 restantes)
export const ApontamentoLoteItemSchema = z.object({
  tipoEquipamentoId: z.string().min(1, 'Tipo de equipamento é obrigatório'),
  quantidade: z.coerce.number().int().min(1, 'Quantidade mínima é 1'),
  quantidadeTotalCaixa: z.coerce.number().int().min(1).optional(),
  quantidadeReparada: z.coerce.number().int().min(0).optional(),
  quantidadeSucata: z.coerce.number().int().min(0).optional(),
  quantidadeRestante: z.coerce.number().int().min(0).optional(),
  tipoCategoria: z.enum(['REPARADO', 'SEM_DEFEITO', 'RETRABALHO']).default('REPARADO'),
  defeitoRelatado: z.string().optional(),
  servicoRealizado: z.string().optional(),
  numeroSerie: z.string().optional(),
});

export const ApontamentoLoteSchema = z.object({
  numeroOS: z.coerce.number().int().positive().optional(),
  clienteId: z.string().optional().default('cli-01'),
  dataEntrada: z.string().optional(),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
  observacoes: z.string().optional(),
  enviarDiretoTeste: z.boolean().default(true),
  iniciarProducaoAoVivo: z.boolean().optional().default(false),
  modoOperacao: z.enum(['DESPACHAR_CQ', 'INICIAR_PRODUCAO', 'SALVAR_BANCADA']).optional(),
  itens: z.array(ApontamentoLoteItemSchema).min(1, 'Adicione ao menos 1 equipamento no lote'),
});

export type IniciarProducaoInput = z.infer<typeof IniciarProducaoSchema>;
export type FinalizarProducaoInput = z.infer<typeof FinalizarProducaoSchema>;
export type PausarProducaoInput = z.infer<typeof PausarProducaoSchema>;
export type ApontamentoLoteItemInput = z.infer<typeof ApontamentoLoteItemSchema>;
export type ApontamentoLoteInput = z.infer<typeof ApontamentoLoteSchema>;


