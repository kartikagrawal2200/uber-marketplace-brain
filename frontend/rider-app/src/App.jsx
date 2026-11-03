import { useEffect, useState } from 'react';
import { useWorld } from '../shared/useWorld.js';
import { Shell, Panel, ZoneMap, SurgePlate, Waiting, Spinner, cx } from '../shared/ui.jsx';
import { inr, SIM_SEC_PER_MIN } from '../shared/constants.js';

const HOME = 6; // the rider is standing in Zone 6, Central Station

export default function App() {
  const { world, conn, send, on } = useWorld();
  const [pickup, setPickup] = useState(HOME);
  const [booking, setBooking] = useState(null);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => on((m) => { if (m.type === 'booking') { setBooking({ ...m, at: Date.now() }); setPending(false); } }), [on]);
  useEffect(() => {
    if (!booking) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [booking]);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(false), 6000);
    return () => clearTimeout(t);
  }, [pending]);

  const book = () => { if (send({ type: 'book', zone: pickup })) setPending(true); };

  return (
    <Shell app="Rider" conn={conn}>
      {!world ? (
        <Waiting conn={conn} />
      ) : (
        <Content world={world} pickup={pickup} setPickup={setPickup} booking={booking} setBooking={setBooking} pending={pending} book={book} now={now} live={conn === 'live'} />
      )}
    </Shell>
  );
}

function Content({ world, pickup, setPickup, booking, setBooking, pending, book, now, live }) {
  const z = world.zones.find((x) => x.id === pickup);
  const surging = world.zones.filter((x) => x.surge > 1).sort((a, b) => b.surge - a.surge);
  const remaining = booking ? Math.max(0, booking.eta_min - (now - booking.at) / 1000 / SIM_SEC_PER_MIN) : 0;
  const busy = booking && remaining > 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-4 py-3">
          <span className="font-bold">Surge right now</span>
          {surging.length === 0 ? (
            <span className="text-muted">None. Fares are at the normal rate everywhere.</span>
          ) : (
            surging.slice(0, 5).map((s) => (
              <button key={s.id} type="button" onClick={() => setPickup(s.id)} className="flex items-center gap-1.5 rounded-full border border-line bg-sunk py-0.5 pl-2.5 pr-1 text-sm font-bold hover:border-ink">
                Zone {s.id} <SurgePlate surge={s.surge} />
              </button>
            ))
          )}
        </div>

        <Panel title="Drivers and arrival time by zone" aside={<span className="text-sm text-muted">Tap a zone to set your pickup</span>}>
          <ZoneMap zones={world.zones} mode="rider" selected={pickup} onSelect={setPickup} youZone={HOME} />
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" />One driver nearby</span>
            <span>Big number is the estimated wait in minutes. Darker zones have more drivers.</span>
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title={`Zone ${z.id}, ${z.name}`} aside={pickup === HOME ? <span className="rounded-full bg-sunk px-2 py-0.5 text-sm font-bold text-muted">Your location</span> : null}>
          <div className="grid grid-cols-3 gap-3">
            <Big label="Pickup in" value={z.eta_min} unit="min" />
            <Big label="Drivers near" value={z.supply} sub={z.density} />
            <Big label="Fare from" value={inr(z.fare_est)} />
          </div>

          <SurgeMeter surge={z.surge} />

          <button
            type="button"
            onClick={book}
            disabled={!live || pending || busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-4 text-lg font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-45"
          >
            {pending ? <><Spinner /> Finding a driver</> : busy ? 'Ride in progress' : !live ? 'Reconnecting' : `Book ride for ${inr(z.fare_est)}`}
          </button>
          <p className="mt-2 text-sm text-muted">The fare is an estimate for a standard trip and locks when a driver accepts.</p>
        </Panel>

        {booking && (
          <Panel title={remaining > 0 ? 'Your driver is on the way' : 'Your driver has arrived'}>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-bold">{booking.driver.name}</div>
                <div className="text-sm text-muted">{booking.driver.vehicle}</div>
              </div>
              <div className="rounded-md border-2 border-ink bg-signal px-2.5 py-1 text-lg font-bold num">{booking.driver.plate}</div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="sign num text-5xl">{Math.ceil(remaining)}</span>
              <span className="font-bold text-muted">min away</span>
              <span className="ml-auto text-sm text-muted">Booking {booking.id}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunk" role="progressbar" aria-valuemin={0} aria-valuemax={booking.eta_min} aria-valuenow={booking.eta_min - remaining}>
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, ((booking.eta_min - remaining) / booking.eta_min) * 100)}%` }} />
            </div>
            <div className="mt-2 text-sm text-muted">Fare {inr(booking.fare_estimate)} at {booking.surge.toFixed(1)}x, pickup in Zone {booking.zone}</div>
            <button type="button" onClick={() => setBooking(null)} className="mt-4 w-full rounded-md border border-line px-4 py-2.5 font-bold hover:border-ink">
              {remaining > 0 ? 'Cancel ride' : 'Done'}
            </button>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Big({ label, value, unit, sub }) {
  return (
    <div>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="sign num text-4xl">{value}</span>
        {unit && <span className="text-sm font-bold text-muted">{unit}</span>}
      </div>
      {sub && <div className="text-sm text-muted">{sub} density</div>}
    </div>
  );
}

function SurgeMeter({ surge }) {
  const pct = ((surge - 1) / 2) * 100;
  const msg = surge <= 1 ? 'Fares are at the normal rate in this zone.' : surge < 1.6 ? 'Busy here, so fares are a little higher.' : surge < 2.4 ? 'Many more riders than drivers here. Fares are well above normal.' : 'Very few drivers for the number of riders. Try a calmer zone nearby or wait a few minutes.';
  return (
    <div className="mt-5 rounded-md border border-line bg-sunk p-3">
      <div className="flex items-center justify-between">
        <span className="font-bold">Surge</span>
        <SurgePlate surge={surge} size="lg" />
      </div>
      <div className="relative mt-3 h-3 rounded-full" style={{ background: 'linear-gradient(90deg,#e4e9ef,#ffd27a 45%,#ff9664 75%,#f06250)' }} role="img" aria-label={`Surge ${surge.toFixed(1)} times on a scale from 1 to 3`}>
        <span className={cx('absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink bg-white transition-[left] duration-700')} style={{ left: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs font-bold text-muted"><span>1x</span><span>2x</span><span>3x</span></div>
      <p className="mt-2 text-sm">{msg}</p>
    </div>
  );
}
