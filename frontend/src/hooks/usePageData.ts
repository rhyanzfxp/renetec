import { useCallback, useEffect, useRef } from 'react';
import { useRealtime } from '../features/realtime/RealtimeContext';
import type { RealtimeEventType } from '../features/realtime/realtime.types';

interface UsePageDataOptions {
  /** Função de carga de dados da página */
  loadData: () => Promise<void>;
  /** Tipos de eventos do WebSocket que devem disparar re-carga. Use [] para desabilitar. */
  realtimeEvents?: (RealtimeEventType | '*')[];
  /** Intervalo de polling em ms. 0 = sem polling. */
  pollIntervalMs?: number;
  /** Delay de debounce para evitar múltiplas cargas em sequência (ms). Default: 400 */
  debounceMs?: number;
}

/**
 * Hook utilitário de performance para páginas com dados em tempo real.
 *
 * Benefícios:
 * - Debounce: múltiplos eventos WebSocket em sequência resultam em apenas 1 fetch
 * - Lock de concorrência: não inicia novo fetch se já houver um em andamento
 * - Cleanup automático de timers e subscriptions ao desmontar
 * - Polling configurável separado do WebSocket
 */
export function usePageData({
  loadData,
  realtimeEvents = ['*'],
  pollIntervalMs = 0,
  debounceMs = 400,
}: UsePageDataOptions) {
  const { subscribe } = useRealtime();
  const debounceTimerRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);

  const debouncedLoad = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(async () => {
      // Se já está carregando, ignora — evita requisições concorrentes
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      try {
        await loadData();
      } finally {
        isLoadingRef.current = false;
      }
    }, debounceMs);
  }, [loadData, debounceMs]);

  useEffect(() => {
    // Carga inicial imediata (sem debounce)
    loadData();

    // Subscriptions WebSocket para eventos relevantes
    const unsubscribers = realtimeEvents.map((eventType) =>
      subscribe(eventType, () => debouncedLoad())
    );

    // Polling opcional para garantir consistência mesmo sem eventos
    let pollInterval: number | null = null;
    if (pollIntervalMs > 0) {
      pollInterval = window.setInterval(debouncedLoad, pollIntervalMs);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (pollInterval) clearInterval(pollInterval);
      unsubscribers.forEach((unsub) => unsub());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
