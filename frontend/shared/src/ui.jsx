import { CAP } from './constants.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

/* ---------- heat colour: oversupplied (cool) → balanced → short of drivers (red) ---------- */
const STOPS = [
  [0.35, [186, 226, 236]],
  [0.9, [228, 233, 239]],
  [1.35, [255, 210, 122]],
  [2.2, [255, 150, 100]],
  [3.6, [240, 98, 80]],
];
const rgb = (c) => `rgb(${c[0]} ${c[1]} ${c[2]})`;
export function heat(p) {
  if (p <= STOPS[0][0]) return rgb(STOPS[0][1]);
  for (let k = 1; k < STOPS.length; k++) {
    const [p1, c1] = STOPS[k];
    const [p0, c0] = STOPS[k - 1];
    if (p <= p1) {
      const t = (p - p0) / (p1 - p0);
      return rgb(c0.map((v, j) => Math.round(v + (c1[j] - v) * t)));
    }
  }
  return rgb(STOPS[STOPS.length - 1][1]);
}

/* ---------- chrome ---------- */
export function ConnStatus({ conn, dark }) {
  const live = conn === 'live';
  return (
    <span className="flex items-center gap-1.5 text-xs" role="status">
      <span className={cx('size-2 rounded-full', live ? 'bg-emerald-400' : 'animate-pulse bg-signal')} />
      <span className={dark ? 'text-white/80' : 'text-muted'}>{live ? 'Live on /ws/state' : conn === 'connecting' ? 'Connecting' : 'Reconnecting'}</span>
    </span>
  );
}

export function SimBanner({ conn }) {
  return (
    <div className="sticky top-0 z-50 bg-ink text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="rounded-sm bg-signal px-2 py-0.5 text-xs font-extrabold tracking-wide text-ink">SIMULATED DATA</span>
          <span className="hidden text-xs text-white/75 sm:inline">No real riders, drivers or trips are shown.</span>
        </div>
        <ConnStatus conn={conn} dark />
      </div>
      <div className="hazard h-1" aria-hidden />
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-9" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--color-ink)" />
      <path d="M9 10h14L9 22h14" fill="none" stroke="var(--color-signal)" strokeWidth="3.2" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function Shell({ app, conn, actions, children, wide }) {
  return (
    <div className="min-h-dvh">
      <SimBanner conn={conn} />
      <header className="border-b border-line bg-panel">
        <div className={cx('mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6', wide ? 'max-w-7xl' : 'max-w-6xl')}>
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="sign text-2xl">Zonal</div>
              <div className="mt-0.5 text-sm font-bold text-muted">{app}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">{actions}</div>
        </div>
      </header>
      <main className={cx('mx-auto px-4 py-5 sm:px-6', wide ? 'max-w-7xl' : 'max-w-6xl')}>{children}</main>
    </div>
  );
}

export function Panel({ title, aside, children, className, tone }) {
  return (
    <section className={cx('rounded-lg border bg-panel', tone === 'signal' ? 'border-ink bg-signal' : 'border-line', className)}>
      {(title || aside) && (
        <header className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5">
          <h2 className="sign text-xl">{title}</h2>
          {aside}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, unit, sub, className }) {
  return (
    <div className={className}>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="sign num text-3xl sm:text-4xl">{value}</span>
        {unit && <span className="text-sm font-bold text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/* A taxi-roof-sign style multiplier */
export function SurgePlate({ surge, size = 'md' }) {
  const on = surge > 1;
  return (
    <span
      className={cx(
        'inline-flex items-baseline gap-1 rounded-md border font-bold num',
        size === 'lg' ? 'px-3 py-1.5 text-2xl' : 'px-1.5 py-0.5 text-xs',
        on ? 'border-ink bg-signal text-ink' : 'border-line bg-sunk text-muted',
      )}
    >
      <span className="sign">{surge.toFixed(1)}×</span>
      {size === 'lg' && <span className="text-sm font-bold">{on ? 'surge' : 'no surge'}</span>}
    </span>
  );
}

export function Waiting({ conn }) {
  return (
    <Panel title="Waiting for the city">
      <p className="text-muted">
        {conn === 'live' ? 'Connected. Waiting for the first update.' : 'Connecting to /ws/state. This page updates on its own as soon as the socket opens.'}
      </p>
    </Panel>
  );
}

export function Spinner() {
  return <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="Loading" />;
}

/* ---------- map (4 cols × 3 rows) ---------- */
function dotPos(seed, i) {
  const n = (seed * 1103515245 + i * 12345) & 0x7fffffff;
  const col = i % 4;
  const row = Math.floor(i / 4);
  const x = 16 + col * 20 + ((n % 7) - 3) * 1.5;
  const y = 38 + row * 22 + (((n >> 4) % 7) - 3) * 1.5;
  return [Math.max(10, Math.min(88, x)), Math.max(28, Math.min(82, y))];
}

export function Map({ zones, selected, onSelect, recZone, youZone, mode = 'driver', compact }) {
  const maxD = Math.max(1, ...zones.map((z) => z.demand));
  const maxS = Math.max(1, ...zones.map((z) => z.supply * CAP));

  return (
    <div className="rounded-lg bg-[#d5dce5] p-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {zones.map((z) => {
          const isSel = selected === z.id;
          const isRec = recZone === z.id;
          const style =
            mode === 'rider'
              ? { background: `linear-gradient(rgb(43 59 224 / ${0.04 + (Math.min(z.supply, 10) / 10) * 0.2}), rgb(43 59 224 / ${0.04 + (Math.min(z.supply, 10) / 10) * 0.2})), #fff` }
              : { background: heat(z.pressure) };
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => onSelect?.(z.id)}
              aria-pressed={onSelect ? isSel : undefined}
              aria-label={
                mode === 'rider'
                  ? `Zone ${z.id}, ${z.name}. ${z.supply} drivers nearby, ETA ${z.eta_min} minutes, surge ${z.surge.toFixed(1)}x`
                  : `Zone ${z.id}, ${z.name}. Demand ${z.demand} per minute, ${z.supply} drivers, surge ${z.surge.toFixed(1)}x`
              }
              style={style}
              className={cx(
                'relative overflow-hidden rounded-md text-left transition-shadow duration-300',
                compact ? 'min-h-[84px] sm:min-h-[112px]' : 'min-h-[96px] sm:min-h-[152px]',
                isSel ? 'ring-[3px] ring-ink' : 'ring-1 ring-black/10 hover:ring-black/30',
                isRec && 'rec-ring',
                !onSelect && 'cursor-default',
              )}
            >
              <div className="flex items-start justify-between gap-1 p-1.5 sm:p-2">
                <div>
                  <div className="sign text-3xl sm:text-5xl">{z.id}</div>
                  <div className={cx('mt-0.5 text-xs font-bold leading-tight text-ink/70', compact ? 'hidden' : 'hidden sm:block')}>{z.name}</div>
                </div>
                <div className="relative z-10 flex flex-col items-end gap-1">
                  {z.surge > 1 && <SurgePlate surge={z.surge} />}
                  {youZone === z.id && <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white sm:text-xs">{mode === 'rider' ? 'You' : 'You here'}</span>}
                </div>
              </div>

              {mode === 'rider' &&
                Array.from({ length: Math.min(z.supply, 14) }).map((_, k) => {
                  const [l, t] = dotPos(z.id, k);
                  return <span key={k} className="absolute size-1.5 rounded-full bg-accent transition-all duration-700 sm:size-2" style={{ left: `${l}%`, top: `${t}%` }} />;
                })}

              {mode === 'rider' ? (
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-1.5 sm:p-2">
                  <div className="num">
                    <span className="sign text-2xl sm:text-3xl">{z.eta_min}</span>
                    <span className="ml-0.5 text-[10px] font-bold text-ink/70 sm:text-xs">min</span>
                  </div>
                  <div className="num hidden text-xs font-bold text-ink/70 sm:block">{z.supply} cars</div>
                </div>
              ) : (
                <div className="absolute inset-x-0 bottom-0 space-y-1 p-1.5 sm:p-2">
                  <Bar letter="D" value={z.demand} pct={(z.demand / maxD) * 100} color="#0e1a2b" />
                  <Bar letter="S" value={z.supply} pct={((z.supply * CAP) / maxS) * 100} color="#1b6f93" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ letter, value, pct, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 text-[10px] font-extrabold sm:text-xs">{letter}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/15">
        <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </span>
      <span className="num w-6 text-right text-[11px] font-bold sm:text-xs">{Math.round(value)}</span>
    </div>
  );
}

export function HeatLegend() {
  const ps = [0.3, 0.7, 1.0, 1.4, 1.9, 2.6, 3.6];
  return (
    <div className="mt-3 text-xs text-muted">
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {ps.map((p) => <span key={p} className="flex-1" style={{ background: heat(p) }} />)}
      </div>
      <div className="mt-1 flex justify-between font-bold">
        <span>More drivers than needed</span>
        <span>Balanced</span>
        <span>Short of drivers</span>
      </div>
      <p className="mt-2">D is demand in requests per minute. S is drivers in the zone (bar scaled to what they can serve).</p>
    </div>
  );
}

export const fmtAge = (s) => (s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);
export const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
