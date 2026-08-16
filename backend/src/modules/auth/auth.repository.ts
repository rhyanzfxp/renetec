import { prisma, isDatabaseReady } from '../../database/prisma.js';
import argon2 from 'argon2';

export interface UserRecord {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  perfil: 'ADMIN' | 'TECNICO' | 'QUALIDADE';
  ativo: boolean;
}

// Armazenamento em memória para dados de teste
let mockUsers: UserRecord[] = [];
let mockInitialized = false;

async function initMockUsers() {
  if (mockInitialized) return;
  mockInitialized = true;

  const senhaComum = await argon2.hash('renetec123');

  mockUsers = [
    {
      id: 'usr-admin-01',
      nome: 'Administrador Renetec',
      email: 'admin@renetec.com.br',
      senhaHash: senhaComum,
      perfil: 'ADMIN',
      ativo: true,
    },
    {
      id: 'usr-tecnico-01',
      nome: 'João Silva',
      email: 'joao@renetec.com.br',
      senhaHash: senhaComum,
      perfil: 'TECNICO',
      ativo: true,
    },
    {
      id: 'usr-tecnico-02',
      nome: 'Samuel Oliveira',
      email: 'samuel@renetec.com.br',
      senhaHash: senhaComum,
      perfil: 'TECNICO',
      ativo: true,
    },
    {
      id: 'usr-tecnico-03',
      nome: 'Joás Pereira',
      email: 'joas@renetec.com.br',
      senhaHash: senhaComum,
      perfil: 'TECNICO',
      ativo: true,
    },
    {
      id: 'usr-qualidade-01',
      nome: 'Rhyan',
      email: 'rhyan@renetec.com.br',
      senhaHash: senhaComum,
      perfil: 'QUALIDADE',
      ativo: true,
    },
    {
      id: 'usr-admin-02',
      nome: 'Luana',
      email: 'luana@renetec.com.br',
      senhaHash: senhaComum,
      perfil: 'ADMIN',
      ativo: true,
    },
    {
      id: 'usr-qualidade-02',
      nome: 'Controle de Qualidade',
      email: 'qualidade@renetec.com.br',
      senhaHash: senhaComum,
      perfil: 'QUALIDADE',
      ativo: true,
    },
  ];
}

export class AuthRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    await initMockUsers();

    if (isDatabaseReady()) {
      try {
        const user = await prisma.usuario.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (user) {
          return {
            id: user.id,
            nome: user.nome,
            email: user.email,
            senhaHash: user.senhaHash,
            perfil: user.perfil,
            ativo: user.ativo,
          };
        }
      } catch {
        // Fallback
      }
    }

    const mock = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return mock || null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    await initMockUsers();

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
            perfil: user.perfil,
            ativo: user.ativo,
          };
        }
      } catch {
        // Fallback
      }
    }

    const mock = mockUsers.find((u) => u.id === id);
    return mock || null;
  }
}

export const authRepository = new AuthRepository();
