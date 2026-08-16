import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/renetec_db?schema=public'),
  DIRECT_URL: z.string().optional(),
  // Em produção, JWT_SECRET deve ter pelo menos 32 caracteres para segurança criptográfica
  JWT_SECRET: z.string().min(32, {
    message: '[RENETEC SECURITY] JWT_SECRET deve ter pelo menos 32 caracteres em produção!',
  }).default('renetec-super-secret-key-change-in-production-2026!!'),
  CORS_ORIGIN: z.string().default('*'),
  // Limite de rate em requisições por minuto (padrão: 1000 em produção, ilimitado em development)
  RATE_LIMIT_MAX: z.coerce.number().default(1000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[RENETEC] ❌ Erro de configuração de ambiente:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// Aviso de segurança em produção com valores padrão inseguros
if (parsed.data.NODE_ENV === 'production') {
  if (parsed.data.JWT_SECRET === 'renetec-super-secret-key-change-in-production-2026!!') {
    console.error('[RENETEC SECURITY] ❌ CRÍTICO: JWT_SECRET está com o valor padrão! Defina uma chave segura no .env');
    process.exit(1);
  }
  if (parsed.data.CORS_ORIGIN === '*') {
    console.warn('[RENETEC SECURITY] ⚠️  AVISO: CORS_ORIGIN está aberto (*) em produção! Defina origens específicas.');
  }
}

export const env = parsed.data;

