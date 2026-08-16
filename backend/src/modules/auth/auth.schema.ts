import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    nome: z.string(),
    email: z.string(),
    perfil: z.enum(['ADMIN', 'TECNICO', 'QUALIDADE']),
  }),
  accessToken: z.string(),
});
