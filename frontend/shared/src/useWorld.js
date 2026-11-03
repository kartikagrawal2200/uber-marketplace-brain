import { useCallback, useEffect, useRef, useState } from 'react';
import { createSim } from './sim.js';

let sharedSim = null;
function getSharedSim() {
  if (!sharedSim) {
    sharedSim = createSim();
  }
  return sharedSim;
}

export function useWorld() {
  const [world, setWorld] = useState(null);
  const [conn, setConn] = useState('connecting');
  const ws = useRef(null);
  const listeners = useRef(new Set());
  const isFallback = useRef(false);

  const send = useCallback((msg) => {
    const s = ws.current;
    if (s && s.readyState === 1) {
      s.send(JSON.stringify(msg));
      return true;
    }
    if (isFallback.current) {
      getSharedSim().send(msg, (reply) => {
        listeners.current.forEach((fn) => fn(reply));
      });
      return true;
    }
    return false;
  }, []);

  const on = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  useEffect(() => {
    let closed = false, retry = 0, timer, simUnsub = null;

    const activateFallback = () => {
      if (closed || isFallback.current) return;
      isFallback.current = true;
      setConn('live');
      const sim = getSharedSim();
      simUnsub = sim.subscribe((data) => {
        try {
          setWorld(typeof data === 'string' ? JSON.parse(data) : data);
        } catch { /* ignore */ }
      });
    };

    // If backend doesn't connect within 1.5s, seamlessly activate in-browser simulation mode
    const fallbackTimer = setTimeout(() => {
      if (ws.current?.readyState !== 1) {
        activateFallback();
      }
    }, 1500);

    const open = () => {
      const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/state`;
      try {
        const s = new WebSocket(url);
        ws.current = s;
        s.onopen = () => {
          retry = 0;
          isFallback.current = false;
          if (simUnsub) { simUnsub(); simUnsub = null; }
          setConn('live');
        };
        s.onmessage = (e) => {
          let m;
          try { m = JSON.parse(e.data); } catch { return; }
          if (m.type === 'state') setWorld(m);
          else listeners.current.forEach((fn) => fn(m));
        };
        s.onclose = () => {
          if (closed) return;
          if (!isFallback.current) activateFallback();
          retry++;
          timer = setTimeout(open, Math.min(5000, 500 * 2 ** retry));
        };
        s.onerror = () => {
          activateFallback();
          s.close();
        };
      } catch {
        activateFallback();
      }
    };

    open();
    return () => {
      closed = true;
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      if (simUnsub) simUnsub();
      ws.current?.close();
    };
  }, []);

  return { world, conn, send, on };
}
