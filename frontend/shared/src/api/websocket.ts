import type { MarketplaceState } from '../types/marketplace';

const WS_URL = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000') + '/ws/state';

type StateListener = (state: MarketplaceState) => void;

class MarketplaceWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Set<StateListener> = new Set();
  private reconnectDelay = 1000;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('[WS] Connected to marketplace state stream');
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (event) => {
      try {
        const state: MarketplaceState = JSON.parse(event.data);
        this.listeners.forEach((cb) => cb(state));
      } catch (err) {
        console.error('[WS] Failed to parse state:', err);
      }
    };

    this.ws.onclose = () => {
      console.warn(`[WS] Disconnected. Reconnecting in ${this.reconnectDelay}ms...`);
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(payload: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn('[WS] Cannot send — not connected');
    }
  }
}

export const marketplaceWs = new MarketplaceWebSocket();
