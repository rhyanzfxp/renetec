import argon2 from 'argon2';
import { authRepository, UserRecord } from './auth.repository.js';
import { LoginBody } from './auth.schema.js';
import { log } from '../auditoria/auditoria.service.js';

export interface UserPayload {
  sub: string;
  nome: string;
  email: string;
  perfil: 'ADMIN' | 'TECNICO' | 'QUALIDADE';
}

export class AuthService {
  async authenticateUser(data: LoginBody): Promise<{ user: Omit<UserRecord, 'senhaHash'> }> {
    const user = await authRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('CREDENCIAIS_INVALIDAS');
    }

    if (!user.ativo) {
      throw new Error('USUARIO_INATIVO');
    }

    const passwordMatches = await argon2.verify(user.senhaHash, data.senha);
    if (!passwordMatches) {
      throw new Error('CREDENCIAIS_INVALIDAS');
    }

    const { senhaHash, ...userWithoutPassword } = user;

    // Auditoria de acesso ao sistema (não-bloqueante)
    log({
      acao: 'USUARIO_LOGIN',
      usuarioId: user.id,
      usuarioNome: user.nome,
      usuarioPerfil: user.perfil,
      entidade: 'Usuario',
      entidadeId: user.id,
      descricao: `${user.nome} (${user.perfil}) acessou o sistema.`,
    }).catch(() => {});

    return {
      user: userWithoutPassword,
    };
  }

  async getProfile(userId: string): Promise<Omit<UserRecord, 'senhaHash'>> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error('USUARIO_NAO_ENCONTRADO');
    }

    if (!user.ativo) {
      throw new Error('USUARIO_INATIVO');
    }

    const { senhaHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export const authService = new AuthService();
