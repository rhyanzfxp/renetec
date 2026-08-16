import type { FastifyPluginAsync } from 'fastify';
import { realtimeService } from './realtime.service.js';
import crypto from 'crypto';

export const realtimeRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /realtime (WebSocket Upgrade) ────────────────────────────────────
  fastify.get('/realtime', { websocket: true }, (socket, req) => {
    const clientId = crypto.randomUUID();
    const ip = req.ip || '127.0.0.1';

    realtimeService.addClient(clientId, socket, ip);

    // Listener para mensagens recebidas do cliente (ex: ping/pong)
    socket.on('message', (message: Buffer) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'ping') {
          socket.send(
            JSON.stringify({
              type: 'sistema:ping',
              timestamp: new Date().toISOString(),
              data: { pong: true },
            })
          );
        }
      } catch {
        // Ignora mensagens mal formatadas
      }
    });
  });

  // ─── GET /realtime/status ─────────────────────────────────────────────────
  fastify.get('/realtime/status', async (req, reply) => {
    return reply.send({
      success: true,
      activeClients: realtimeService.getClientCount(),
      timestamp: new Date().toISOString(),
    });
  });
};
