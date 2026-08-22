import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { RealtimeEvent, RealtimeEventType, ConnectionStatus, RealtimeToast } from './realtime.types';

interface RealtimeContextType {
  connectionStatus: ConnectionStatus;
  lastEvent: RealtimeEvent | null;
  toasts: RealtimeToast[];
  removeToast: (id: string) => void;
  subscribe: (type: RealtimeEventType | '*', callback: (event: RealtimeEvent) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [toasts, setToasts] = useState<RealtimeToast[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(event: RealtimeEvent) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // ─── FIX: usar ref para evitar re-criação de connect no useEffect ──────────
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<RealtimeToast, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: RealtimeToast = { ...toast, id, timestamp: new Date() };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  // ─── Dispatch de eventos para listeners ─────────────────────────────────────
  // Usar ref para evitar que dispatchEvent apareça como dependência de connect
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const dispatchEvent = useCallback((event: RealtimeEvent) => {
    setLastEvent(event);

    if (event.type === 'os:criada') {
      addToastRef.current({ title: 'Nova OS Registrada', message: `OS #${(event.data as any)?.os?.numeroOS || ''} registrada no sistema.`, type: 'info' });
    } else if (event.type === 'qualidade:novo_lote') {
      addToastRef.current({ title: 'Novo Lote na Mesa de CQ', message: `Equipamentos liberados para teste por ${(event.data as any)?.tecnicoNome || 'técnico'}.`, type: 'info' });
    } else if (event.type === 'retrabalho:criado') {
      addToastRef.current({ title: 'Retrabalho Encaminhado ⚠️', message: 'Item reprovado no CQ enviado para a bancada do técnico responsável.', type: 'warning' });
    } else if (event.type === 'producao:iniciada') {
      addToastRef.current({ title: 'Bancada Iniciada', message: 'Novo lote em produção na bancada técnica.', type: 'info' });
    } else if (event.type === 'producao:finalizada') {
      addToastRef.current({ title: 'Lote Finalizado', message: 'Montagem concluída! Encaminhado para Controle de Qualidade.', type: 'success' });
    } else if (event.type === 'qualidade:aprovado') {
      addToastRef.current({ title: 'Lote Aprovado no CQ! 🎉', message: 'Unidades conformes somadas à meta coletiva da fábrica.', type: 'success' });
    } else if (event.type === 'qualidade:reprovado') {
      addToastRef.current({ title: 'Não-Conformidade Detectada', message: 'Peças reprovadas enviadas para a fila de Retrabalho.', type: 'warning' });
    } else if (event.type === 'retrabalho:concluido') {
      addToastRef.current({ title: 'Retrabalho Concluído', message: 'Reparo finalizado e enviado para Re-teste no CQ.', type: 'info' });
    } else if (event.type === 'meta:atualizada') {
      addToastRef.current({ title: 'Metas Atualizadas', message: 'Novos pontos registrados no termômetro de produção.', type: 'info' });
    }


    const typeListeners = listenersRef.current.get(event.type);
    if (typeListeners) typeListeners.forEach((cb) => cb(event));

    const globalListeners = listenersRef.current.get('*');
    if (globalListeners) globalListeners.forEach((cb) => cb(event));
  }, []);

  // Manter ref atualizada para usar dentro dos handlers sem ser dependência
  const dispatchEventRef = useRef(dispatchEvent);
  dispatchEventRef.current = dispatchEvent;

  // ─── Lógica de conexão estável via ref — NÃO é dependência do useEffect ────
  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;

    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    // Backoff exponencial: 1s, 2s, 3s, 4.5s, ... máx 15s
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 15000);
    reconnectAttemptsRef.current++;

    console.log(`⏳ [WebSocket] Reconectando em ${(delay / 1000).toFixed(1)}s (tentativa ${reconnectAttemptsRef.current})...`);

    reconnectTimeoutRef.current = window.setTimeout(() => {
      if (isMountedRef.current) connectWs();
    }, delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connectWs = useCallback(() => {
    if (!isMountedRef.current || isConnectingRef.current) return;

    // Fechar conexão anterior de forma limpa sem disparar onclose novamente
    if (socketRef.current) {
      const old = socketRef.current;
      old.onopen = null;
      old.onmessage = null;
      old.onclose = null;
      old.onerror = null;
      if (old.readyState === WebSocket.OPEN || old.readyState === WebSocket.CONNECTING) {
        old.close(1000, 'reconnect');
      }
      socketRef.current = null;
    }

    isConnectingRef.current = true;
    setConnectionStatus('CONNECTING');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const defaultWsUrl = `${protocol}//${host}:3333/api/v1/realtime`;
    const wsBase = import.meta.env.VITE_WS_URL;
    const wsUrl = wsBase ? `${wsBase}/api/v1/realtime` : defaultWsUrl;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      isConnectingRef.current = false;
      setConnectionStatus('DISCONNECTED');
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      if (!isMountedRef.current) { ws.close(1000, 'unmounted'); return; }
      isConnectingRef.current = false;
      setConnectionStatus('CONNECTED');
      reconnectAttemptsRef.current = 0;
      console.log('⚡ [WebSocket] Conexão em tempo real estabelecida com sucesso.');
    };

    ws.onmessage = (event) => {
      try {
        const parsed: RealtimeEvent = JSON.parse(event.data);
        if (parsed.type !== 'sistema:ping') {
          dispatchEventRef.current(parsed);
        }
      } catch {
        // Ignora mensagens malformadas
      }
    };

    ws.onclose = (ev) => {
      // Não reconectar se foi fechamento limpo (1000) por desmontagem
      if (!isMountedRef.current) return;
      isConnectingRef.current = false;
      setConnectionStatus('DISCONNECTED');
      if (ev.code !== 1000) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // FIX: apenas logar — o onclose cuidará da reconexão.
      // Não fechar aqui: isso causava duplo disparo de onclose + onerror.
      isConnectingRef.current = false;
      console.warn('⚠️ [WebSocket] Erro de conexão — aguardando onclose para reconectar.');
    };

    socketRef.current = ws;
  }, [scheduleReconnect]);

  useEffect(() => {
    isMountedRef.current = true;
    connectWs();

    // Ping periódico a cada 25s para manter a conexão ativa (evita timeout)
    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      isMountedRef.current = false;
      isConnectingRef.current = false;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

      // Fechar conexão de forma limpa sem disparar reconexão
      if (socketRef.current) {
        const ws = socketRef.current;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close(1000, 'component-unmount');
        socketRef.current = null;
      }
    };
  }, []); // ← dependência vazia intencional: só executa na montagem/desmontagem

  const subscribe = useCallback(
    (type: RealtimeEventType | '*', callback: (event: RealtimeEvent) => void) => {
      if (!listenersRef.current.has(type)) {
        listenersRef.current.set(type, new Set());
      }
      listenersRef.current.get(type)!.add(callback);

      return () => {
        const set = listenersRef.current.get(type);
        if (set) {
          set.delete(callback);
          if (set.size === 0) listenersRef.current.delete(type);
        }
      };
    },
    []
  );

  return (
    <RealtimeContext.Provider value={{ connectionStatus, lastEvent, toasts, removeToast, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime deve ser usado dentro de um RealtimeProvider');
  }
  return context;
};
