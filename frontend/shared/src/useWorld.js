import { useCallback, useEffect, useRef, useState } from 'react';

// One WebSocket to /ws/state. `world` is the latest broadcast state; replies to our own messages
// (booking, chat_reply, login_ok ...) go to listeners registered with on().
export function useWorld() {
  const [world, setWorld] = useState(null);
  const [conn, setConn] = useState('connecting');
  const ws = useRef(null);
  const listeners = useRef(new Set());

  const send = useCallback((msg) => {
    const s = ws.current;
    if (s && s.readyState === 1) { s.send(JSON.stringify(msg)); return true; }
    return false;
  }, []);

  const on = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  useEffect(() => {
    let closed = false, retry = 0, timer;
    const open = () => {
      const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/state`;
      const s = new WebSocket(url);
      ws.current = s;
      s.onopen = () => { retry = 0; setConn('live'); };
      s.onmessage = (e) => {
        let m;
        try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === 'state') setWorld(m);
        else listeners.current.forEach((fn) => fn(m));
      };
      s.onclose = () => {
        if (closed) return;
        setConn('reconnecting');
        retry++;
        timer = setTimeout(open, Math.min(5000, 400 * 2 ** retry));
      };
      s.onerror = () => s.close();
    };
    open();
    return () => { closed = true; clearTimeout(timer); ws.current?.close(); };
  }, []);

  return { world, conn, send, on };
}
