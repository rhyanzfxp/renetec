import { z } from 'zod';

export const IniciarRetrabalhoSchema = z.object({
  tecnicoResponsavelId: z.string().optional(),
});

export const ConcluirRetrabalhoSchema = z.object({
  solucaoAplicada: z
    .string({ required_error: 'Descreva a solução técnica aplicada no reparo' })
    .min(5, 'Descreva a solução com ao menos 5 caracteres')
    .max(2000),
  observacao: z.string().max(1000).optional(),
});

export type IniciarRetrabalhoInput = z.infer<typeof IniciarRetrabalhoSchema>;
export type ConcluirRetrabalhoInput = z.infer<typeof ConcluirRetrabalhoSchema>;
