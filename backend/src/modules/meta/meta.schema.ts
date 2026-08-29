import { z } from 'zod';

export const UpdateMetaConfigSchema = z.object({
  mesReferencia: z.number().int().min(1).max(12).optional(),
  anoReferencia: z.number().int().min(2020).max(2050).optional(),
  // Metas Oficiais em Pontos (sem default para não sobrescrever em updates parciais)
  metaBase: z.number().min(1).optional(),
  metaAlvo: z.number().min(1).optional(),
  metaExcelencia: z.number().min(1).optional(),
  // Suporte a Período Piloto
  isPeriodoPiloto: z.boolean().optional(),
  metaPilotoMinima: z.number().min(1).optional(),
  metaPilotoAlvo: z.number().min(1).optional(),
  metaPilotoExcelencia: z.number().min(1).optional(),
  // Parâmetros de Qualidade e Bônus
  retrabalhoMaximo: z.number().min(0).max(1).optional(),
  percentualFundoBonus: z.number().min(0).max(1).optional(),
  percentualColetivo: z.number().min(0).max(1).optional(),
  percentualIndividual: z.number().min(0).max(1).optional(),
  faturamentoRecebido: z.number().min(0).optional(),
  diasUteis: z.number().int().min(1).max(31).optional(),
  // Compatibilidade legada
  metaBronze: z.number().optional(),
  metaPrata: z.number().optional(),
  metaOuro: z.number().optional(),
});

export type UpdateMetaConfigInput = z.infer<typeof UpdateMetaConfigSchema>;

export const UpdateBonusSimulationSchema = z.object({
  faturamentoRecebido: z.number().min(0),
  metaIndividualStatus: z.record(z.string(), z.boolean()).optional(),
});

export type UpdateBonusSimulationInput = z.infer<typeof UpdateBonusSimulationSchema>;

export const ResetMetasSchema = z.object({
  mesReferencia: z.number().int().min(1).max(12).optional(),
  anoReferencia: z.number().int().min(2020).max(2050).optional(),
  resetarTudo: z.boolean().optional(),
});

export type ResetMetasInput = z.infer<typeof ResetMetasSchema>;
