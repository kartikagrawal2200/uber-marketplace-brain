import { useCallback, useEffect, useRef, useState } from 'react';
import { createSim } from './sim.js';

let sharedSim = null;
export function getSharedSim() {
  if (!sharedSim) {
    sharedSim = createSim();
  }
  return sharedSim;
}

export function useWorld() {
  // Initialize with snapshot immediately so UI never blocks
  const [world, setWorld] = useState(() => {
    try {
      return getSharedSim().snapshot();
    } catch {
      return null;
    }
  });
  const [conn, setConn] = useState('live');
  const ws = useRef(null);
  const listeners = useRef(new Set());
  const isFallback = useRef(true);

  const send = useCallback((msg) => {
    const s = ws.current;
    // If real backend WebSocket is connected, send through it
    if (s && s.readyState === 1) {
      try {
        s.send(JSON.stringify(msg));
        return true;
      } catch (e) {
        console.warn('WS send failed, routing to sim:', e);
      }
    }
    // Always fallback to sharedSim so button actions NEVER drop or fail
    try {
      getSharedSim().send(msg, (reply) => {
        listeners.current.forEach((fn) => {
          try {
            fn(reply);
          } catch (err) {
            console.error(err);
          }
        });
      });
      return true;
    } catch (e) {
      console.error('Simulator send error:', e);
      return false;
    }
  }, []);

  const on = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  useEffect(() => {
    let closed = false, retry = 0, timer = null, simUnsub = null;

    // Start with simulator subscription so state updates every second
    const sim = getSharedSim();
    simUnsub = sim.subscribe((data) => {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        setWorld(parsed);
      } catch { /* ignore */ }
    });

    const open = () => {
      if (closed) return;
      const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/state`;
      try {
        const s = new WebSocket(url);
        ws.current = s;

        s.onopen = () => {
          if (closed) { s.close(); return; }
          retry = 0;
          isFallback.current = false;
          // Unsubscribe from local sim if real backend takes over
          if (simUnsub) {
            simUnsub();
            simUnsub = null;
          }
          setConn('live');
        };

        s.onmessage = (e) => {
          let m;
          try { m = JSON.parse(e.data); } catch { return; }
          if (m.type === 'state') setWorld(m);
          else {
            listeners.current.forEach((fn) => {
              try { fn(m); } catch (err) { console.error(err); }
            });
          }
        };

        s.onclose = () => {
          if (closed) return;
          // If backend disconnected or not running, ensure sim is subscribed
          if (!simUnsub) {
            simUnsub = sim.subscribe((data) => {
              try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                setWorld(parsed);
              } catch { /* ignore */ }
            });
          }
          isFallback.current = true;
          retry++;
          // Backoff retry: wait 3s, 6s, 12s, max 15s to prevent socket hammering
          timer = setTimeout(open, Math.min(15000, 3000 * retry));
        };

        s.onerror = () => {
          s.close();
        };
      } catch {
        isFallback.current = true;
        timer = setTimeout(open, 5000);
      }
    };

    open();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      if (simUnsub) simUnsub();
      ws.current?.close();
    };
  }, []);

  return { world, conn, send, on };
}
