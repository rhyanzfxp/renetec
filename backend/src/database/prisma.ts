import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? [] : ['error'],
});

export let isDbAvailable = false;

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Timeout rápido de 800ms para não bloquear a inicialização ou chamadas
    const connectPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 800)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    isDbAvailable = true;
    console.log('✅ Conexão com banco PostgreSQL/Supabase ativa.');
    return true;
  } catch {
    isDbAvailable = false;
    console.log('⚡ Modo Ultrarrápido em Memória ativo (Zero latência - sem delay de timeout de rede).');
    return false;
  }
}

export function isDatabaseReady(): boolean {
  return isDbAvailable;
}

// Inicializa a checagem não-bloqueante
checkDatabaseConnection();
