import React from 'react';
import { CAP } from './constants.js';
import { CityMap } from './components/CityMap.jsx';
import { Navbar } from './components/Navbar.jsx';
import { ZoneDetailCard } from './components/ZoneDetailCard.jsx';
import { DemoGuideModal } from './components/DemoGuideModal.jsx';

export const cx = (...a) => a.filter(Boolean).join(' ');

/* Re-export all icons */
export * from './icons.jsx';

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

/* Re-export CityMap as ZoneMap and Map for backward compatibility */
export { CityMap, CityMap as ZoneMap, CityMap as Map, Navbar, ZoneDetailCard, DemoGuideModal };

export function ConnStatus({ conn, dark }) {
  const live = conn === 'live';
  return (
    <span className="flex items-center gap-1.5 text-xs" role="status">
      <span className={cx('size-2 rounded-full', live ? 'bg-emerald-400' : 'animate-pulse bg-amber-400')} />
      <span className={dark ? 'text-white/80' : 'text-slate-400'}>{live ? 'Live Engine' : 'Simulation'}</span>
    </span>
  );
}

export function Panel({ title, aside, children, className = '', tone }) {
  return (
    <section className={cx('rounded-2xl border bg-slate-900/90 border-slate-800 shadow-lg text-white p-5', tone === 'signal' ? 'border-amber-500/50 bg-amber-950/20' : '', className)}>
      {(title || aside) && (
        <header className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
          {aside}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}

export function Stat({ label, value, unit, sub, className = '' }) {
  return (
    <div className={className}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl font-extrabold text-white">{value}</span>
        {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function SurgePlate({ surge, size = 'md' }) {
  const on = surge > 1.0;
  return (
    <span
      className={cx(
        'inline-flex items-baseline gap-1 rounded-full font-bold',
        size === 'lg' ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs',
        on ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700',
      )}
    >
      <span>{surge.toFixed(1)}×</span>
      {size === 'lg' && <span className="text-xs font-semibold">{on ? 'surge active' : 'standard'}</span>}
    </span>
  );
}

export function Waiting({ conn }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center text-slate-300">
      <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4" />
      <h3 className="text-lg font-bold text-white">Initializing Marketplace Brain</h3>
      <p className="text-sm text-slate-400 max-w-md mt-1">
        Connecting to the real-time simulation stream on /ws/state.
      </p>
    </div>
  );
}

export function Spinner() {
  return <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-label="Loading" />;
}

export const fmtAge = (s) => (s < 90 ? `${Math.round(s)}s` : `${Math.round(s / 60)} min`);
export const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
