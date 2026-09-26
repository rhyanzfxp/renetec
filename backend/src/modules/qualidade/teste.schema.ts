import { z } from 'zod';

export const RealizarTesteSchema = z
  .object({
    producaoId: z.string().optional().default('prod-direto'),
    itemOrdemServicoId: z.string().optional().default('item-direto'),
    numeroOS: z.coerce.number().int().positive().optional(),
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
    quantidadeSucata: z
      .number()
      .int()
      .min(0, 'Quantidade de sucata não pode ser negativa')
      .optional()
      .default(0),
    quantidadeSemDefeito: z
      .number()
      .int()
      .min(0, 'Quantidade sem defeito não pode ser negativa')
      .optional()
      .default(0),
    motivoReprovacaoId: z.string().optional(),
    detalhesDefeito: z.string().max(1000).optional(),
    observacao: z.string().max(1000).optional(),
  })
  .refine(
    (data) =>
      data.quantidadeAprovada +
      (data.quantidadeSemDefeito || 0) +
      data.quantidadeReprovada +
      (data.quantidadeSucata || 0) ===
      data.quantidadeTestada,
    {
      message:
        'A soma de APROVADOS + SEM DEFEITO + REPROVADOS (RETRABALHO) + SUCATA deve ser exatamente igual à QUANTIDADE TESTADA.',
      path: ['quantidadeTestada'],
    }
  )
  .superRefine((data, ctx) => {
    // O lançamento direto do CQ também precisa apontar para uma OS existente.
    // Inspeções vindas da fila já possuem item/OS vinculados e não precisam
    // repetir o número no payload.
    const isLancamentoDireto = !data.itemOrdemServicoId || data.itemOrdemServicoId === 'item-direto';
    if (isLancamentoDireto && !data.numeroOS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numeroOS'],
        message: 'Informe o número da OS para registrar um teste direto.',
      });
    }
  });

export type RealizarTesteInput = z.infer<typeof RealizarTesteSchema>;
