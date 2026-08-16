import { FastifyInstance } from 'fastify';
import { loginBodySchema } from './auth.schema.js';
import { authService } from './auth.service.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

export async function authRoutes(app: FastifyInstance) {
  // Login de Usuário (Admin, Técnico ou CQ)
  app.post('/login', async (request, reply) => {
    const parseResult = loginBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'DADOS_INVALIDOS',
          message: 'Parâmetros de login inválidos.',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const { user } = await authService.authenticateUser(parseResult.data);

      // Assina o JWT com os dados do usuário
      const token = app.jwt.sign(
        {
          sub: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil,
        },
        { expiresIn: '7d' } // Token seguro
      );

      // Define Cookie seguro HttpOnly
      reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 dias
      });

      return reply.status(200).send({
        success: true,
        data: {
          user,
          accessToken: token,
        },
      });
    } catch (err: any) {
      if (err.message === 'CREDENCIAIS_INVALIDAS') {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'CREDENCIAIS_INVALIDAS',
            message: 'E-mail ou senha incorretos.',
          },
        });
      }

      if (err.message === 'USUARIO_INATIVO') {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'USUARIO_INATIVO',
            message: 'Este usuário está inativado no sistema. Contate o administrador.',
          },
        });
      }

      app.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ERRO_INTERNO',
          message: 'Erro interno ao realizar autenticação.',
        },
      });
    }
  });

  // Logout (Limpa sessão e cookies)
  app.post('/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return reply.status(200).send({
      success: true,
      message: 'Sessão encerrada com sucesso.',
    });
  });

  // Retorna dados do usuário autenticado (/me)
  app.get(
    '/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userPayload = request.user as { sub: string };
      try {
        const profile = await authService.getProfile(userPayload.sub);
        return reply.status(200).send({
          success: true,
          data: {
            user: profile,
          },
        });
      } catch (err) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'USUARIO_NAO_ENCONTRADO',
            message: 'Perfil de usuário não localizado.',
          },
        });
      }
    }
  );

  // Rota de Teste de Permissão Exclusiva de Administrador (RBAC)
  app.get(
    '/admin-check',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      return reply.status(200).send({
        success: true,
        message: 'Acesso autorizado: você possui privilégios de Administrador.',
        user: request.user,
      });
    }
  );
}
