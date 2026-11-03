import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../shared/useWorld.js';
import { Shell, Panel, ZoneMap, HeatLegend, SurgePlate, Waiting, Spinner, cx } from '../shared/ui.jsx';
import { inr } from '../shared/constants.js';

const KEY = 'zonal.driver';
const loadSession = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } };

export default function App() {
  const w = useWorld();
  const [session, setSession] = useState(loadSession);
  const login = (d) => { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private mode */ } setSession(d); };
  const logout = () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } setSession(null); };

  if (!session) return <Login {...w} onDone={login} />;
  return (
    <Shell
      app="Driver"
      conn={w.conn}
      actions={
        <>
          <span className="hidden text-sm font-bold sm:inline">{session.name}</span>
          <button type="button" onClick={logout} className="rounded-md border border-line px-3 py-1.5 text-sm font-bold hover:border-ink">Sign out</button>
        </>
      }
    >
      {!w.world ? <Waiting conn={w.conn} /> : <Dashboard {...w} />}
    </Shell>
  );
}

/* ------------------------------------------------------------------ login */
function Login({ conn, send, on, onDone }) {
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => on((m) => {
    if (m.type === 'login_ok') { setBusy(false); onDone(m.driver); }
    if (m.type === 'login_err') { setBusy(false); setErr(m.error); }
  }), [on, onDone]);

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (send({ type: 'login', id, pin })) setBusy(true);
    else setErr('Not connected yet. Wait a moment and try again.');
  };

  return (
    <Shell app="Driver" conn={conn}>
      <div className="mx-auto max-w-md pt-4">
        <Panel title="Sign in to start driving">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="font-bold">Driver ID</span>
              <input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" className="mt-1 w-full rounded-md border border-line bg-sunk px-3 py-3 text-lg" placeholder="driver-042" />
            </label>
            <label className="block">
              <span className="font-bold">PIN</span>
              <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" autoComplete="current-password" className="mt-1 w-full rounded-md border border-line bg-sunk px-3 py-3 text-lg" />
            </label>
            {err && <p role="alert" className="rounded-md bg-badbg px-3 py-2 font-bold text-bad">{err}</p>}
            <button type="submit" disabled={busy || conn !== 'live' || !id || !pin} className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-4 text-lg font-bold text-on-accent disabled:opacity-45">
              {busy ? <><Spinner /> Signing in</> : 'Sign in'}
            </button>
            <button type="button" onClick={() => { setId('driver-042'); setPin('1234'); }} className="w-full rounded-md border border-line px-4 py-2.5 font-bold hover:border-ink">
              Fill in the demo driver (driver-042, PIN 1234)
            </button>
          </form>
        </Panel>
      </div>
    </Shell>
  );
}

/* -------------------------------------------------------------- dashboard */
function Dashboard({ world, conn, send, on }) {
  const { driver, recommendation: rec, earnings } = world;
  const [sel, setSel] = useState(null);
  const zone = world.zones.find((z) => z.id === sel);
  const fresh = driver.last_event && Date.now() - driver.last_event.at < 8000;
  const live = conn === 'live';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel px-4 py-3">
        <div className="font-bold">
          {driver.status === 'enroute'
            ? `On your way to Zone ${driver.target}`
            : `Waiting in Zone ${driver.zone}, ${world.zones[driver.zone - 1].name}`}
        </div>
        {fresh && <div className="rounded-full bg-okbg px-3 py-0.5 font-bold text-ok">{driver.last_event.text}</div>}
        {world.scenarios.stale && <div className="rounded-full bg-warnbg px-3 py-0.5 font-bold text-warn">Forecast model is stale. Tips use a fallback.</div>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Recommendation world={world} send={send} live={live} />
          <Panel title="Demand against drivers" aside={<span className="text-sm text-muted">Updates every second</span>}>
            <ZoneMap zones={world.zones} mode="driver" selected={sel} onSelect={setSel} recZone={rec?.zone} youZone={driver.zone} />
            <HeatLegend />
          </Panel>
          {zone && <ZoneDetail z={zone} here={driver.zone} onClose={() => setSel(null)} />}
        </div>

        <div className="space-y-5">
          <Earnings e={earnings} />
          <Chat send={send} on={on} live={live} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ recommendation */
function Recommendation({ world, send, live }) {
  const { driver, recommendation: rec } = world;
  const enroute = driver.status === 'enroute';
  const target = enroute && world.zones.find((z) => z.id === driver.target);
  const total = Math.max(1, driver.total || 1);
  const left = Math.max(0, driver.arrive_in || 0);
  const pct = Math.min(100, Math.round(((total - left) / total) * 100));

  if (enroute && target) {
    return (
      <Panel title="Heading to reposition target" tone="signal">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="sign text-3xl sm:text-4xl">Zone {target.id}, {target.name}</div>
            <div className="mt-1 text-sm font-bold text-ink/80">Driving to meet expected pickup demand</div>
          </div>
          <div className="text-right">
            <div className="sign num text-4xl">{Math.max(1, Math.ceil(left / 3))}</div>
            <div className="text-xs font-bold text-ink/75">min remaining</div>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-ink/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </Panel>
    );
  }

  if (!rec) {
    return (
      <Panel title="Positioning advice">
        <div className="flex items-center gap-3 text-muted">
          <span className="size-2 rounded-full bg-muted" />
          <span>No urgent moves right now. You are positioned reasonably well for current demand.</span>
        </div>
      </Panel>
    );
  }

  const fallback = rec.source === 'fallback';
  return (
    <Panel
      title="Head to high demand"
      tone="signal"
      aside={<span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-extrabold text-signal">Recommended move</span>}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="sign text-4xl sm:text-5xl">Zone {rec.zone}, {rec.zone_name}</div>
          <div className="mt-1 text-base font-bold text-ink">
            Demand expected <span className="sign text-xl">+{rec.demand_delta_pct}%</span> above the hourly average
          </div>
        </div>
        <SurgePlate surge={rec.surge} size="lg" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-ink/10 p-3 text-center sm:text-left">
        <div>
          <div className="text-xs font-bold text-ink/70">Drive time</div>
          <div className="sign num text-2xl text-ink">~{rec.drive_min} min</div>
        </div>
        <div>
          <div className="text-xs font-bold text-ink/70">Drivers there now</div>
          <div className="sign num text-2xl text-ink">{rec.drivers}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-ink/70">Model confidence</div>
          <div className="sign num text-2xl text-ink">{Math.round(rec.confidence * 100)}%</div>
        </div>
      </div>

      {fallback && (
        <div className="mt-3 text-xs font-bold text-warn">
          The forecast model is stale. This move is based on live demand, not a forward prediction.
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={!live}
          onClick={() => send({ type: 'accept_rec' })}
          className="flex-1 rounded-md bg-ink px-4 py-3.5 text-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-45"
        >
          Accept and start driving
        </button>
        <button
          type="button"
          disabled={!live}
          onClick={() => send({ type: 'ignore_rec' })}
          className="rounded-md border-2 border-ink/40 px-4 py-3.5 font-bold text-ink hover:border-ink disabled:opacity-45"
        >
          Stay here
        </button>
      </div>
    </Panel>
  );
}

function ZoneDetail({ z, here, onClose }) {
  const isHere = z.id === here;
  return (
    <Panel
      title={`Zone ${z.id}, ${z.name}`}
      aside={<button type="button" onClick={onClose} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:border-ink">Close</button>}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Demand" value={z.demand} unit="req/min" />
        <Stat label="Drivers" value={z.supply} sub={z.density} />
        <Stat label="Surge" value={`${z.surge.toFixed(1)}x`} />
        <Stat label="Base fare" value={inr(z.fare_est)} />
      </div>
      <p className="mt-3 text-sm text-muted">
        {isHere ? "You're currently in this zone." : `Forecast expects ${z.forecast} requests/min over the next 10 minutes.`}
      </p>
    </Panel>
  );
}

function Stat({ label, value, unit, sub }) {
  return (
    <div>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="sign num text-2xl">{value}</span>
        {unit && <span className="text-xs font-bold text-muted">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- earnings */
function Earnings({ e }) {
  return (
    <Panel title="Today's earnings">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm text-muted">Take-home so far</div>
          <div className="sign num text-4xl">{inr(e.today)}</div>
        </div>
        <div className="text-right">
          <div className="sign num text-2xl">{e.trips}</div>
          <div className="text-xs font-bold text-muted">completed trips</div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Mini label="Rate" value={`${inr(e.per_hour)}/h`} />
        <Mini label="Hours" value={`${e.hours} h`} />
        <Mini label="Surge bonus" value={inr(e.surge_bonus)} />
      </dl>

      <Spark data={e.history} />

      {e.last_trip && <p className="mt-3 text-sm text-muted">Last trip {inr(e.last_trip.fare)} in Zone {e.last_trip.zone}{e.last_trip.surge > 1 ? ` at ${e.last_trip.surge.toFixed(1)}x surge` : ''}.</p>}
    </Panel>
  );
}
const Mini = ({ label, value }) => (
  <div><dt className="text-sm text-muted">{label}</dt><dd className="sign num mt-1 text-2xl">{value}</dd></div>
);

function Spark({ data }) {
  if (data.length < 2) return <div className="h-12" />;
  const w = 240, h = 48;
  const min = Math.min(...data), max = Math.max(...data);
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${((i / (data.length - 1)) * w).toFixed(1)} ${(h - 3 - ((v - min) / (max - min || 1)) * (h - 8)).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2 h-12 w-full" role="img" aria-label="Earnings so far today">
      <path d={d} fill="none" stroke="#0e1a2b" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------- chat */
const SUGGESTIONS = ['Where should I go?', 'How are my earnings?', 'How far is Zone 7?', 'Is the model healthy?'];
const fmtArgs = (a) => Object.entries(a || {}).map(([k, v]) => `${k}=${v}`).join(', ');

function Chat({ send, on, live }) {
  const [msgs, setMsgs] = useState([{ id: 'hello', role: 'assistant', specialist: 'Dispatch Coordinator', text: 'Ask me where to drive, how your day is going, how far a zone is, or whether the forecast model is healthy.', tools: [] }]);
  const [pending, setPending] = useState(null);
  const [text, setText] = useState('');
  const box = useRef(null);
  const seq = useRef(0);

  useEffect(() => on((m) => {
    if (m.type !== 'chat_reply') return;
    setMsgs((x) => [...x, { ...m, role: 'assistant', id: `${m.reply_to}-a` }]);
    setPending((p) => (p === m.reply_to ? null : p));
  }), [on]);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs, pending]);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      setPending(null);
      setMsgs((x) => [...x, { id: `err${Date.now()}`, role: 'assistant', specialist: 'System', text: 'No answer came back. Check the connection and ask again.', tools: [] }]);
    }, 10000);
    return () => clearTimeout(t);
  }, [pending]);

  const ask = (q) => {
    const t = q.trim();
    if (!t || pending || !live) return;
    const id = `q${++seq.current}`;
    if (send({ type: 'chat', id, text: t })) {
      setMsgs((x) => [...x, { id, role: 'user', text: t }]);
      setPending(id);
      setText('');
    }
  };

  return (
    <Panel title="Ask the assistant">
      <div ref={box} className="max-h-[22rem] min-h-40 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {msgs.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="ml-8 rounded-lg rounded-br-sm bg-ink px-3 py-2 text-white">{m.text}</div>
          ) : (
            <div key={m.id} className="mr-4 rounded-lg rounded-bl-sm border border-line bg-sunk px-3 py-2.5">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-signal px-2 py-0.5 text-xs font-bold text-ink">Answered by {m.specialist}</span>
              </div>
              <p>{m.text}</p>
              {m.tools?.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-line pt-2" aria-label="Tool calls used">
                  {m.tools.map((t, i) => (
                    <li key={i} className="rounded bg-white px-2 py-1 font-mono text-xs leading-snug">
                      <span className="font-bold">{t.name}</span>({fmtArgs(t.args)}) <span className="text-muted">returned</span> {t.result} <span className="text-muted">in {t.ms} ms</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}
        {pending && <div className="mr-4 flex items-center gap-2 text-sm text-muted"><Spinner /> Picking a specialist and running tools</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" disabled={!live || !!pending} onClick={() => ask(s)} className="rounded-full border border-line px-2.5 py-1 text-sm font-bold hover:border-ink disabled:opacity-45">{s}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" placeholder="Type a question" className="min-w-0 flex-1 rounded-md border border-line bg-sunk px-3 py-2.5" />
        <button type="submit" disabled={!live || !!pending || !text.trim()} className={cx('rounded-md bg-ink px-4 py-2.5 font-bold text-white disabled:opacity-45')}>Send</button>
      </form>
    </Panel>
  );
}
