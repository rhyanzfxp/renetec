import { z } from 'zod';

export const RealizarTesteSchema = z
  .object({
    producaoId: z.string().optional().default('prod-direto'),
    itemOrdemServicoId: z.string().optional().default('item-direto'),
    numeroOS: z.coerce.number().optional(),
    tipoEquipamentoId: z.string().optional(),
    origemTriagem: z.boolean().optional().default(false),
    tecnicoResponsavelId: z.string().optional(),
    tecnicoDestinoId: z.string().optional(),
    dataTeste: z.string().optional(),
    quantidadeTestada: z
      .number({ required_error: 'Quantidade testada é obrigatória' })
      .int()
      .min(1, 'Quantidade testada deve ser ao menos 1'),
    quantidadeAprovada: z
      .number({ required_error: 'Quantidade aprovada é obrigatória' })
      .int()
      .min(0, 'Quantidade aprovada não pode ser negativa'),
    quantidadeReprovada: z
      .number({ required_error: 'Quantidade reprovada é obrigatória' })
      .int()
      .min(0, 'Quantidade reprovada não pode ser negativa'),
    motivoReprovacaoId: z.string().optional(),
    detalhesDefeito: z.string().max(1000).optional(),
    observacao: z.string().max(1000).optional(),
  })
  .refine(
    (data) => data.quantidadeAprovada + data.quantidadeReprovada === data.quantidadeTestada,
    {
      message: 'A soma de APROVADOS + REPROVADOS deve ser exatamente igual à QUANTIDADE TESTADA.',
      path: ['quantidadeTestada'],
    }
  );

export type RealizarTesteInput = z.infer<typeof RealizarTesteSchema>;

