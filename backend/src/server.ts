import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { osRoutes } from './modules/os/os.routes.js';
import { producaoRoutes } from './modules/producao/producao.routes.js';
import { qualidadeRoutes } from './modules/qualidade/teste.routes.js';
import { retrabalhoRoutes } from './modules/retrabalho/retrabalho.routes.js';
import { metaRoutes } from './modules/meta/meta.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { realtimeRoutes } from './modules/realtime/realtime.routes.js';
import { auditoriaRoutes } from './modules/auditoria/auditoria.routes.js';
import { relatorioRoutes } from './modules/relatorios/relatorio.routes.js';

const app = fastify({
  logger: {
    transport: env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      }
    } : undefined
  },
  disableRequestLogging: false,
});

// ─── 1. Blindagem de Segurança (Helmet & Headers HTTP) ────────────────────────
await app.register(helmet, {
  contentSecurityPolicy: env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
    },
  } : false, // Desabilitado em desenvolvimento para flexibilidade de live-reload
  hidePoweredBy: true,
  frameguard: { action: 'sameorigin' },
  hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
});

// ─── 2. Proteção Anti-DDoS e Força Bruta (Rate Limit) ─────────────────────────
// Em desenvolvimento o rate limit é desabilitado para não atrapalhar o uso.
// Em produção usa o valor da variável de ambiente (padrão: 1000 req/min por IP).
await app.register(rateLimit, {
  max: env.NODE_ENV === 'development' ? 9999 : env.RATE_LIMIT_MAX,
  timeWindow: '1 minute',
  allowList: env.NODE_ENV === 'development' ? ['127.0.0.1', '::1', '::ffff:127.0.0.1'] : [],
  errorResponseBuilder: () => ({
    success: false,
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Taxa limite de requisições excedida. Aguarde um minuto e tente novamente.',
  }),
});

// ─── 3. Política de CORS Segura ───────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGIN === '*' 
  ? true 
  : env.CORS_ORIGIN.split(',').map((o) => o.trim());

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

// ─── 4. Cookies e JWT Seguro ──────────────────────────────────────────────────
await app.register(cookie, {
  secret: env.JWT_SECRET,
});

await app.register(jwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: 'token',
    signed: false,
  },
});

// ─── 5. WebSockets de Baixa Latência ──────────────────────────────────────────
await app.register(websocket);

// ─── 6. Sanitização Global de Erros (Prevenção de Vazamento de Dados) ─────────
app.setErrorHandler((error, request, reply) => {
  // Logar erro interno completo no servidor para observabilidade
  request.log.error(error);

  // Erros com status definidos (ex: validações Zod, regras de negócio 400, 401, 403, 404, 409)
  const statusCode = (error as any).statusCode || (error as any).status || 500;

  if (statusCode < 500) {
    return reply.status(statusCode).send({
      success: false,
      message: error.message || 'Requisição inválida',
      details: (error as any).details || (error as any).issues || undefined,
    });
  }

  // Em caso de erro 500 interno: NUNCA expor stack trace, queries SQL ou caminhos de arquivos em produção
  if (env.NODE_ENV === 'production') {
    return reply.status(500).send({
      success: false,
      message: 'Ocorreu um erro interno no processamento. O evento foi registrado para análise.',
    });
  }

  // Em desenvolvimento: exibir mensagem para depuração
  return reply.status(500).send({
    success: false,
    message: error.message || 'Erro interno do servidor',
    stack: error.stack,
  });
});

// ─── 7. Registro dos Módulos da API ───────────────────────────────────────────
await app.register(authRoutes, { prefix: '/api/v1/auth' });
await app.register(osRoutes, { prefix: '/api/v1/os' });
await app.register(producaoRoutes, { prefix: '/api/v1' });
await app.register(qualidadeRoutes, { prefix: '/api/v1' });
await app.register(retrabalhoRoutes, { prefix: '/api/v1' });
await app.register(metaRoutes, { prefix: '/api/v1' });
await app.register(dashboardRoutes, { prefix: '/api/v1' });
await app.register(realtimeRoutes, { prefix: '/api/v1' });
await app.register(auditoriaRoutes, { prefix: '/api/v1' });
await app.register(relatorioRoutes, { prefix: '/api/v1' });

// ─── 8. Rota de Health Check Segura ───────────────────────────────────────────
app.get('/api/v1/health', async () => {
  return {
    status: 'ok',
    system: 'RENETEC Gestão de Produção',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  };
});

// ─── 9. Inicialização do Servidor ─────────────────────────────────────────────
async function start() {
  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(`🚀 Servidor Renetec Backend rodando em http://${env.HOST}:${env.PORT}`);
    app.log.info(`🩺 Health Check disponível em http://${env.HOST}:${env.PORT}/api/v1/health`);
    app.log.info(`🔐 Módulo de Autenticação em http://${env.HOST}:${env.PORT}/api/v1/auth`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
