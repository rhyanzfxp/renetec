import { prisma, isDatabaseReady } from '../../database/prisma.js';
import { ensureDatabaseSeeded } from '../../database/seed-auto.js';

export interface UserRecord {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  perfil: 'ADMIN' | 'TECNICO' | 'QUALIDADE';
  ativo: boolean;
}

export class AuthRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const emailNorm = email.toLowerCase().trim();

    if (isDatabaseReady()) {
      try {
        let user = await prisma.usuario.findUnique({
          where: { email: emailNorm },
        });

        if (!user) {
          // Se não encontrou, pode ser que o seed ainda não rodou
          await ensureDatabaseSeeded();
          user = await prisma.usuario.findUnique({
            where: { email: emailNorm },
          });
        }

        if (user) {
          return {
            id: user.id,
            nome: user.nome,
            email: user.email,
            senhaHash: user.senhaHash,
            perfil: user.perfil as 'ADMIN' | 'TECNICO' | 'QUALIDADE',
            ativo: user.ativo,
          };
        }
      } catch (err) {
        console.error('[AuthRepository.findByEmail] Erro ao consultar Supabase:', err);
      }
    }

    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (isDatabaseReady()) {
      try {
        const user = await prisma.usuario.findUnique({
          where: { id },
        });
        if (user) {
          return {
            id: user.id,
            nome: user.nome,
            email: user.email,
            senhaHash: user.senhaHash,
            perfil: user.perfil as 'ADMIN' | 'TECNICO' | 'QUALIDADE',
            ativo: user.ativo,
          };
        }
      } catch (err) {
        console.error('[AuthRepository.findById] Erro ao consultar Supabase:', err);
      }
    }

    return null;
  }
}

export const authRepository = new AuthRepository();
