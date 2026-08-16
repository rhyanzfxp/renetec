import { z } from 'zod';

export const UpdateMetaConfigSchema = z.object({
  mesReferencia: z.number().int().min(1).max(12).optional(),
  anoReferencia: z.number().int().min(2020).max(2050).optional(),
  // Metas Oficiais em Pontos
  metaBase: z.number().min(1).default(250),
  metaAlvo: z.number().min(1).default(300),
  metaExcelencia: z.number().min(1).default(350),
  // Suporte a Período Piloto
  isPeriodoPiloto: z.boolean().default(false),
  metaPilotoMinima: z.number().min(1).default(160),
  metaPilotoAlvo: z.number().min(1).default(190),
  metaPilotoExcelencia: z.number().min(1).default(220),
  // Parâmetros de Qualidade e Bônus
  retrabalhoMaximo: z.number().min(0).max(1).default(0.05), // 5%
  percentualFundoBonus: z.number().min(0).max(1).default(0.015), // 1.5%
  percentualColetivo: z.number().min(0).max(1).default(0.70), // 70%
  percentualIndividual: z.number().min(0).max(1).default(0.30), // 30%
  faturamentoRecebido: z.number().min(0).default(0),
  diasUteis: z.number().int().min(1).max(31).optional(),
  // Compatibilidade legada
  metaBronze: z.number().optional(),
  metaPrata: z.number().optional(),
  metaOuro: z.number().optional(),
});

export type UpdateMetaConfigInput = z.infer<typeof UpdateMetaConfigSchema>;

export const UpdateBonusSimulationSchema = z.object({
  faturamentoRecebido: z.number().min(0),
  metaIndividualStatus: z.record(z.string(), z.boolean()).optional(), // { "usr-samuel": true, "usr-joao": true, ... }
});

export type UpdateBonusSimulationInput = z.infer<typeof UpdateBonusSimulationSchema>;
