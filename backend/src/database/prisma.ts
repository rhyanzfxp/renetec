import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? [] : ['error'],
});

export let isDbAvailable = false;
let isChecking = false;

export async function checkDatabaseConnection(): Promise<boolean> {
  if (isChecking) return isDbAvailable;
  isChecking = true;
  try {
    // Timeout de 6s para dar tempo ao Supabase de responder
    const connectPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 6000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    if (!isDbAvailable) {
      console.log('✅ Conexão com banco PostgreSQL/Supabase ativa e persistência habilitada.');
    }
    isDbAvailable = true;
    return true;
  } catch (err) {
    if (isDbAvailable) {
      console.warn('⚠️ Conexão com Supabase oscilou, usando cache temporário:', err);
    }
    isDbAvailable = false;
    return false;
  } finally {
    isChecking = false;
  }
}

export function isDatabaseReady(): boolean {
  if (!isDbAvailable && !isChecking) {
    // Dispara rechecagem assíncrona em background
    checkDatabaseConnection().catch(() => {});
  }
  return isDbAvailable;
}

// Inicializa a checagem na inicialização e roda a cada 30 segundos
checkDatabaseConnection();
setInterval(() => {
  checkDatabaseConnection().catch(() => {});
}, 30000);
