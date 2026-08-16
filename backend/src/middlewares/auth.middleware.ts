import { FastifyReply, FastifyRequest } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'NAO_AUTENTICADO',
        message: 'Token de autenticação ausente, inválido ou expirado.',
      },
    });
  }
}

export function authorize(allowedRoles: ('ADMIN' | 'TECNICO' | 'QUALIDADE')[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { perfil?: 'ADMIN' | 'TECNICO' | 'QUALIDADE' };

    if (!user || !user.perfil) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'NAO_AUTENTICADO',
          message: 'Sessão de usuário não identificada.',
        },
      });
    }

    if (!allowedRoles.includes(user.perfil)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'ACESSO_NEGADO',
          message: `O perfil ${user.perfil} não possui permissão para executar esta ação.`,
          requiredRoles: allowedRoles,
        },
      });
    }
  };
}
