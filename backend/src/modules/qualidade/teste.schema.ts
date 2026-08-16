import { z } from 'zod';

export const RealizarTesteSchema = z
  .object({
    producaoId: z.string().min(1, { message: 'ID da produção é obrigatório' }),
    itemOrdemServicoId: z.string().min(1, { message: 'ID do item é obrigatório' }),
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
  )
  .refine(
    (data) => {
      if (data.quantidadeReprovada > 0 && !data.motivoReprovacaoId) {
        return false;
      }
      return true;
    },
    {
      message: 'Informe o motivo da não-conformidade para itens reprovados.',
      path: ['motivoReprovacaoId'],
    }
  );

export type RealizarTesteInput = z.infer<typeof RealizarTesteSchema>;
