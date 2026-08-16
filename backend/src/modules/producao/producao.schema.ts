import { z } from 'zod';

// Schema para iniciar uma produção
export const IniciarProducaoSchema = z.object({
  itemOrdemServicoId: z.string().min(1, { message: 'ID do item inválido' }),
});

// Schema para finalizar uma produção
export const FinalizarProducaoSchema = z.object({
  quantidadeProduzida: z
    .number({ required_error: 'Quantidade produzida é obrigatória' })
    .int()
    .min(1, 'Quantidade deve ser ao menos 1'),
  servicoRealizado: z
    .string({ required_error: 'Descreva o serviço realizado' })
    .min(5, 'Descreva o serviço com ao menos 5 caracteres')
    .max(2000),
  observacao: z.string().max(1000).optional(),
});

export type IniciarProducaoInput = z.infer<typeof IniciarProducaoSchema>;
export type FinalizarProducaoInput = z.infer<typeof FinalizarProducaoSchema>;
