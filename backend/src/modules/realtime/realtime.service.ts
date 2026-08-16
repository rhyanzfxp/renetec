import type { WebSocket } from 'ws';
import type { RealtimeEvent, RealtimeEventType } from './realtime.types.js';

interface WebSocketClient {
  id: string;
  socket: WebSocket;
  ip: string;
}

class RealtimeService {
  private clients: Map<string, WebSocketClient> = new Map();

  // Adiciona um novo cliente conectado
  addClient(id: string, socket: WebSocket, ip: string) {
    this.clients.set(id, { id, socket, ip });
    console.log(`📡 [WebSocket] Cliente conectado: ${id} (${ip}) | Total ativos: ${this.clients.size}`);

    // Enviar mensagem de boas-vindas
    this.sendToClient(id, {
      type: 'sistema:ping',
      timestamp: new Date().toISOString(),
      data: { message: 'Conectado ao servidor de eventos em tempo real da Renetec.' },
    });

    socket.on('close', () => {
      this.removeClient(id);
    });

    socket.on('error', () => {
      this.removeClient(id);
    });
  }

  // Remove um cliente desconectado
  removeClient(id: string) {
    if (this.clients.has(id)) {
      this.clients.delete(id);
      console.log(`🔌 [WebSocket] Cliente desconectado: ${id} | Restantes: ${this.clients.size}`);
    }
  }

  // Envia evento para um cliente específico
  sendToClient(id: string, event: RealtimeEvent) {
    const client = this.clients.get(id);
    if (client && client.socket.readyState === client.socket.OPEN) {
      try {
        client.socket.send(JSON.stringify(event));
      } catch (err) {
        this.removeClient(id);
      }
    }
  }

  // Dispara o evento para TODOS os clientes conectados (TVs, técnicos, gerentes)
  broadcast(type: RealtimeEventType, data: any) {
    const event: RealtimeEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    const payload = JSON.stringify(event);
    let enviados = 0;

    for (const [id, client] of this.clients.entries()) {
      if (client.socket.readyState === client.socket.OPEN) {
        try {
          client.socket.send(payload);
          enviados++;
        } catch {
          this.removeClient(id);
        }
      } else {
        this.removeClient(id);
      }
    }

    console.log(`📢 [Broadcast WS] Evento '${type}' disparado para ${enviados} cliente(s).`);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const realtimeService = new RealtimeService();
