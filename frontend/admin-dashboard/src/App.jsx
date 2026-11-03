import { useState } from 'react';
import { useWorld } from '../shared/useWorld.js';
import { Shell, Panel, Stat, ZoneMap, HeatLegend, Waiting, Spinner, cx, fmtAge, fmtTime } from '../shared/ui.jsx';

const SCENARIOS = [
  { key: 'stadium', label: 'Stadium ends', hint: 'Zone 7 demand jumps fivefold and its drivers thin out' },
  { key: 'surge', label: 'Surge', hint: 'Rush hour: demand up across the city, most at the station and business district' },
  { key: 'rain', label: 'Rain', hint: 'More requests, fewer drivers, slower trips' },
  { key: 'stale', label: 'Make model stale', hint: 'Stop feature refresh and force the fallback heuristic' },
];

export default function App() {
  const { world, conn, send } = useWorld();
  const live = conn === 'live';
  return (
    <Shell
      app="Admin"
      conn={conn}
      wide
      actions={<button type="button" disabled={!live} onClick={() => send({ type: 'scenario', name: 'reset' })} className="rounded-md border border-line px-3 py-1.5 text-sm font-bold hover:border-ink disabled:opacity-45">Reset all scenarios</button>}
    >
      {!world ? <Waiting conn={conn} /> : <Dashboard world={world} send={send} live={live} />}
    </Shell>
  );
}

function Dashboard({ world, send, live }) {
  const { model, scenarios, city, eval: ev } = world;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <ModelBadge m={model} />
        <Panel title="Scenarios">
          <div className="grid grid-cols-2 gap-2.5">
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                type="button"
                disabled={!live}
                aria-pressed={scenarios[s.key]}
                onClick={() => send({ type: 'scenario', name: s.key })}
                className={cx(
                  'rounded-md border-2 px-3 py-3 text-left transition-colors disabled:opacity-45',
                  scenarios[s.key] ? 'border-ink bg-ink text-white' : 'border-line bg-sunk hover:border-ink',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-bold">{s.label}</span>
                  <span className={cx('rounded-full px-2 py-0.5 text-xs font-bold', scenarios[s.key] ? 'bg-signal text-ink' : 'bg-white text-muted')}>{scenarios[s.key] ? 'On' : 'Off'}</span>
                </div>
                <div className={cx('mt-1 text-sm', scenarios[s.key] ? 'text-white/80' : 'text-muted')}>{s.hint}</div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-panel p-4 lg:grid-cols-4">
        <Stat label="Requests served right now" value={city.fulfilment_live.toFixed(1)} unit="%" sub="Demand the online drivers can cover" />
        <Stat label="Demand" value={city.demand_total} unit="req/min" sub="Across all 12 zones" />
        <Stat label="Drivers online" value={city.supply_total} />
        <Stat label="Zones surging" value={city.surging_zones} unit="of 12" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Baseline ev={ev} send={send} live={live} />
        <Panel title="Live zones">
          <ZoneMap zones={world.zones} mode="driver" compact />
          <HeatLegend />
        </Panel>
      </div>
    </div>
  );
}

function ModelBadge({ m }) {
  const stale = m.status !== 'healthy';
  return (
    <section className={cx('rounded-lg border-2 p-4 sm:p-5', stale ? 'border-warnline bg-warnbg text-warn' : 'border-ok/40 bg-okbg text-ok')} aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="relative flex size-4">
          <span className={cx('absolute inline-flex size-full animate-ping rounded-full opacity-50', stale ? 'bg-warnline' : 'bg-ok')} />
          <span className={cx('relative inline-flex size-4 rounded-full', stale ? 'bg-warnline' : 'bg-ok')} />
        </span>
        <h2 className="sign text-3xl sm:text-4xl">{stale ? 'Model stale, fallback active' : 'Model healthy'}</h2>
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-ink">
        <Fact label="Version" value={m.version} />
        <Fact label="Features last refreshed" value={`${fmtAge(m.age_s)} ago`} sub={`limit ${fmtAge(m.max_age_s)}`} />
        <Fact label="Forecast error" value={`${m.mae.toFixed(1)} req/min`} sub="per zone" />
      </dl>
      {stale && m.fallback && (
        <div className="mt-4 space-y-2 border-t border-warnline/60 pt-3 text-ink">
          <p><b>Why it switched.</b> {m.fallback.reason}</p>
          <p><b>What is running instead.</b> {m.fallback.name}.</p>
          <p><b>What it costs.</b> {m.fallback.impact}</p>
        </div>
      )}
    </section>
  );
}
const Fact = ({ label, value, sub }) => (
  <div><dt className="text-sm opacity-80">{label}</dt><dd className="font-bold num">{value}{sub && <span className="ml-1 text-sm font-normal opacity-75">({sub})</span>}</dd></div>
);

function Baseline({ ev, send, live }) {
  const pp = ev.improvement_pp;
  const weak = pp < 3;
  return (
    <Panel
      title="Model against the baseline"
      aside={
        <button type="button" disabled={!live || ev.running} onClick={() => send({ type: 'rerun_eval' })} className="flex items-center gap-2 rounded-md bg-accent px-3.5 py-2 font-bold text-on-accent hover:opacity-90 disabled:opacity-60">
          {ev.running ? <><Spinner /> Running</> : 'Re-run evaluation'}
        </button>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-muted">Improvement in fulfilment rate</div>
          <div className={cx('sign num text-6xl', weak ? 'text-warn' : 'text-ok')}>{pp >= 0 ? '+' : ''}{pp.toFixed(1)} <span className="text-3xl">pp</span></div>
        </div>
        <p className="max-w-[18rem] text-sm text-muted">
          {weak ? 'The model is barely ahead of the baseline, because the stale model is running on its fallback.' : 'Percentage points of requests served that the baseline would have dropped.'}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <BarRow label={ev.baseline.name} value={ev.baseline.fulfilment} color="bg-muted" />
        <BarRow label={ev.model.name} value={ev.model.fulfilment} color={ev.model.status === 'stale' ? 'bg-warnline' : 'bg-ok'} />
      </div>
      <p className="mt-3 text-sm text-muted">
        Replay of {ev.sample_size.toLocaleString('en-IN')} simulated requests under: {ev.note}. Last run {fmtTime(ev.ran_at)}.
      </p>

      <table className="mt-4 w-full text-left text-sm">
        <caption className="sr-only">Recent evaluation runs</caption>
        <thead className="text-muted"><tr><th className="py-1 font-bold">Run at</th><th className="font-bold">Conditions</th><th className="text-right font-bold">Baseline</th><th className="text-right font-bold">Model</th><th className="text-right font-bold">Gain</th></tr></thead>
        <tbody>
          {ev.runs.map((r) => (
            <tr key={r.id} className="border-t border-line num">
              <td className="py-1.5">{fmtTime(r.ran_at)}</td>
              <td className="font-sans">{r.note}</td>
              <td className="text-right">{r.baseline.toFixed(1)}%</td>
              <td className="text-right">{r.model.toFixed(1)}%</td>
              <td className="text-right font-bold">{r.pp >= 0 ? '+' : ''}{r.pp.toFixed(1)} pp</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function BarRow({ label, value, color }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-bold">{label}</span>
        <span className="sign num text-2xl">{value.toFixed(1)}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-sunk" role="img" aria-label={`${label}: ${value.toFixed(1)} percent fulfilled`}>
        <div className={cx('h-full rounded-full transition-[width] duration-700', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
