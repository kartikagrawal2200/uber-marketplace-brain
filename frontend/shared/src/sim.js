// Zonal world simulator. Everything it produces is SIMULATED DATA.
// vite.config.js uses it as the dev stand-in for the backend behind /ws/state.
//
// Contract on /ws/state (a real backend should speak the same shapes):
//   server -> all clients, about once a second:  { type:'state', simulated:true, zones, scenarios, city, model, eval, driver, earnings, recommendation }
//   client -> server:  { type:'scenario', name:'stadium'|'surge'|'rain'|'stale'|'reset', on?:boolean }
//                      { type:'rerun_eval' }   { type:'book', zone }   { type:'login', id, pin }
//                      { type:'accept_rec' }   { type:'ignore_rec' }   { type:'chat', id, text }
//   server -> sender only:  { type:'booking' | 'login_ok' | 'login_err' | 'chat_reply' | 'ack', ... }
import { COLS, CAP, BASE_FARE, SIM_SEC_PER_MIN, ZONE_NAMES, pressureOf, surgeOf, inr } from './constants.js';

const N = ZONE_NAMES.length;
const BASE_DEMAND = [6, 5, 7, 9, 6, 12, 4, 3, 8, 10, 4, 3]; // requests/min
const BASE_SUPPLY = [5, 4, 6, 8, 5, 10, 3, 3, 7, 8, 4, 4];  // drivers
const SCEN_LABEL = { stadium: 'Stadium ends', surge: 'Surge', rain: 'Rain', stale: 'Stale model' };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r1 = (v) => Math.round(v * 10) / 10;
const col = (i) => i % COLS;
const row = (i) => Math.floor(i / COLS);
const dist = (a, b) => Math.abs(col(a) - col(b)) + Math.abs(row(a) - row(b));
const driveMin = (a, b) => 2 + 2 * dist(a, b);

export function createSim({ tickMs = 1000 } = {}) {
  const rnd = Math.random;
  const zones = ZONE_NAMES.map((name, i) => ({
    i, id: i + 1, name, demand: BASE_DEMAND[i], supply: BASE_SUPPLY[i], avg: BASE_DEMAND[i], bump: 0, bias: 0.95 + rnd() * 0.1,
  }));
  const scen = { stadium: false, surge: false, rain: false, stale: false };
  const model = { version: 'zonal-forecast-v3.2', age: 45, snap: null };
  const driver = { id: 'driver-042', name: 'Arjun Singh', zone: 1, status: 'idle', target: null, arrive_in: 0, total: 0, last_event: null };
  const earn = { today: 2340, trips: 14, bonus: 310, hours: 5.2, history: [2340], last_trip: null };
  const blocked = {};
  let hot = { i: 6, until: 90, mult: 1.9 }; // an ambient hot spot, so the demo always has something to recommend
  let rec = null, recSeq = 0, cooldownUntil = 0, bookingSeq = 0, tick = 0, timer = null;
  const subs = new Set();

  // ---- demand / supply targets -------------------------------------------------------------
  const targetDemand = (i) => {
    let m = 1;
    if (scen.surge) m *= [3, 5, 9].includes(i) ? 2.2 : 1.7;
    if (scen.rain) m *= 1.45;
    if (scen.stadium) m *= i === 6 ? 5 : [2, 5, 7, 10].includes(i) ? 1.5 : 1;
    if (hot.i === i && tick < hot.until) m *= hot.mult;
    return BASE_DEMAND[i] * m;
  };
  const targetSupply = (i) => {
    let m = 1;
    if (scen.rain) m *= 0.7;
    if (scen.surge) m *= 0.9;
    if (scen.stadium && i === 6) m *= 0.6;
    return Math.max(1, Math.round(BASE_SUPPLY[i] * m));
  };

  // ---- forecasting (healthy model vs fallback heuristic) -----------------------------------
  const modelForecast = (i) => (scen.stale && model.snap ? model.snap[i] : (targetDemand(i) + zones[i].bump) * zones[i].bias);
  const fallbackForecast = (i) => 0.6 * zones[i].demand + 0.4 * zones[i].avg;
  const forecastOf = (i) => (scen.stale ? fallbackForecast(i) : modelForecast(i));

  // ---- recommendation engine ---------------------------------------------------------------
  const cand = (i) => {
    const z = zones[i];
    const f = forecastOf(i);
    const p = pressureOf(f, z.supply);
    const d = driveMin(driver.zone, i);
    return { i, f, p, d, delta: ((f - z.avg) / Math.max(z.avg, 0.5)) * 100, score: p / (1 + 0.12 * d) };
  };
  const best = (ignoreBlocks = false) => {
    let top = null;
    for (let i = 0; i < N; i++) {
      if (i === driver.zone || (!ignoreBlocks && (blocked[i] || 0) > tick)) continue;
      const c = cand(i);
      if (!top || c.score > top.score) top = c;
    }
    return top;
  };
  const makeRec = (c, id) => {
    const z = zones[c.i];
    return {
      id: id ?? ++recSeq, zone: z.id, zone_name: z.name, demand_delta_pct: Math.round(c.delta), drivers: z.supply,
      drive_min: c.d, surge: surgeOf(pressureOf(z.demand, z.supply)), source: scen.stale ? 'fallback' : 'model',
      confidence: scen.stale ? 0.58 : 0.9,
    };
  };
  const updateRec = () => {
    if (driver.status !== 'idle') { rec = null; return; }
    const b = best();
    if (rec) {
      const cur = cand(rec.zone - 1);
      if (cur.i === driver.zone || cur.p < 1.0 || (blocked[cur.i] || 0) > tick) rec = null;
      else if (b && b.i !== cur.i && b.score > cur.score * 1.35) rec = makeRec(b);
      else rec = makeRec(cur, rec.id);
    }
    if (!rec && tick >= cooldownUntil && b && b.p >= 1.3 && b.delta >= 15) rec = makeRec(b);
  };

  // ---- evaluation vs baseline --------------------------------------------------------------
  const scenarioNote = () => {
    const on = Object.keys(scen).filter((k) => scen[k]).map((k) => SCEN_LABEL[k]);
    return on.length ? on.join(' + ') : 'Normal conditions';
  };
  const computeEval = () => {
    const base = 71 + (rnd() - 0.5) * 3 - (scen.rain ? 3 : 0) - (scen.stadium ? 5 : 0) - (scen.surge ? 2 : 0);
    const gain = scen.stale ? 1.2 + rnd() * 1.2 : 8.5 + rnd() * 3 + (scen.stadium ? 3 : 0);
    const b = r1(base);
    const m = r1(Math.min(97, base + gain));
    return { id: Date.now() + Math.floor(rnd() * 1000), ran_at: Date.now(), baseline: b, model: m, pp: r1(m - b), note: scenarioNote(), model_status: scen.stale ? 'stale' : 'healthy' };
  };
  const evalState = { running: false, sample_size: 5000, runs: [] };
  evalState.runs.push(computeEval());

  // ---- snapshot ----------------------------------------------------------------------------
  const snapshot = () => {
    const zs = zones.map((z) => {
      const p = pressureOf(z.demand, z.supply);
      const s = surgeOf(p);
      return {
        id: z.id, name: z.name, col: col(z.i), row: row(z.i), demand: r1(z.demand), supply: z.supply,
        pressure: Math.round(p * 100) / 100, surge: s, eta_min: Math.round(clamp(2 + 2.2 * p + (scen.rain ? 1.5 : 0), 2, 20)),
        fare_est: Math.round(BASE_FARE * s), forecast: r1(forecastOf(z.i)), avg: r1(z.avg),
        density: z.supply >= 7 ? 'high' : z.supply >= 4 ? 'medium' : 'low',
      };
    });
    const dem = zones.reduce((a, z) => a + z.demand, 0);
    const served = zones.reduce((a, z) => a + Math.min(z.demand, z.supply * CAP), 0);
    const mae = zones.reduce((a, z) => a + Math.abs(modelForecast(z.i) - z.demand), 0) / N;
    const last = evalState.runs[0];
    const hours = earn.hours + tick / 3600;
    return {
      type: 'state', simulated: true, t: Date.now(), tick,
      scenarios: { ...scen },
      zones: zs,
      city: { demand_total: r1(dem), supply_total: zones.reduce((a, z) => a + z.supply, 0), fulfilment_live: r1((served / dem) * 100), surging_zones: zs.filter((z) => z.surge > 1).length },
      model: {
        status: scen.stale ? 'stale' : 'healthy', version: model.version, age_s: model.age, max_age_s: 900, mae: Math.round(mae * 100) / 100,
        fallback: scen.stale ? {
          name: 'Live demand blended with the trailing-hour average',
          reason: `The feature pipeline last refreshed ${Math.round(model.age / 60)} min ago (limit 15 min), so zone forecasts no longer reflect current conditions. Recommendations and surge hints now use a reactive heuristic until the model refreshes.`,
          impact: 'Moves are suggested after demand appears instead of ahead of it, so expect lower fulfilment and less certainty.',
        } : null,
      },
      eval: {
        running: evalState.running, sample_size: evalState.sample_size, ran_at: last.ran_at,
        baseline: { name: 'Nearest-zone dispatch, no forecast', fulfilment: last.baseline },
        model: { name: 'Zonal forecast model', fulfilment: last.model, status: last.model_status },
        improvement_pp: last.pp, note: last.note, runs: evalState.runs,
      },
      driver: { id: driver.id, name: driver.name, zone: driver.zone + 1, status: driver.status, target: driver.target == null ? null : driver.target + 1, arrive_in: driver.arrive_in, total: driver.total, last_event: driver.last_event },
      earnings: { today: earn.today, trips: earn.trips, surge_bonus: earn.bonus, hours: r1(hours), per_hour: Math.round(earn.today / hours), history: earn.history, last_trip: earn.last_trip },
      recommendation: rec,
    };
  };

  const broadcast = () => {
    if (!subs.size) return;
    const s = JSON.stringify(snapshot());
    for (const fn of [...subs]) { try { fn(s); } catch { subs.delete(fn); } }
  };

  // ---- the clock ---------------------------------------------------------------------------
  const step = () => {
    tick++;
    model.age += 1;
    if (!scen.stale && model.age > 300) model.age = 4; // healthy model refreshes every 5 min
    if (tick >= hot.until && rnd() < 0.02) hot = { i: Math.floor(rnd() * N), until: tick + 50 + Math.floor(rnd() * 40), mult: 1.7 + rnd() * 0.5 };

    for (const z of zones) {
      const tgt = targetDemand(z.i) + z.bump;
      z.bump *= 0.9;
      z.demand = Math.max(0.5, z.demand + (tgt - z.demand) * 0.2 + (rnd() - 0.5) * 0.12 * tgt);
      z.avg += (z.demand - z.avg) * 0.015;
      if (rnd() < 0.02) z.bias = 0.94 + rnd() * 0.12;
      const t = targetSupply(z.i);
      if (z.supply < t && rnd() < 0.3) z.supply++;
      else if (z.supply > t && rnd() < 0.3) z.supply--;
      else if (rnd() < 0.06) z.supply = Math.max(1, z.supply + (rnd() < 0.5 ? 1 : -1));
    }

    if (driver.status === 'enroute') {
      driver.arrive_in -= 1;
      if (driver.arrive_in <= 0) {
        driver.zone = driver.target; driver.target = null; driver.status = 'idle'; driver.arrive_in = 0;
        zones[driver.zone].supply++;
        driver.last_event = { text: `Arrived in Zone ${driver.zone + 1}, ${zones[driver.zone].name}`, at: Date.now() };
        cooldownUntil = tick + 10;
      }
    } else {
      const z = zones[driver.zone];
      const p = pressureOf(z.demand, z.supply);
      if (rnd() < clamp(p * 0.025, 0.01, 0.1)) {
        const s = surgeOf(p);
        const base = Math.round(BASE_FARE * (0.7 + rnd() * 1.3));
        const fare = Math.round(base * s);
        earn.today += fare; earn.trips++; earn.bonus += fare - base;
        earn.last_trip = { fare, surge: s, zone: z.id, at: Date.now() };
      }
    }
    if (tick % 4 === 0) { earn.history.push(earn.today); if (earn.history.length > 45) earn.history.shift(); }

    updateRec();
    broadcast();
  };

  // ---- chat assistant (router + specialists + tool calls) ----------------------------------
  const answer = (text) => {
    const q = text.toLowerCase();
    const zm = q.match(/zone\s*#?(\d{1,2})/);
    const zi = zm ? clamp(parseInt(zm[1], 10), 1, N) - 1 : null;
    const tool = (name, args, result) => ({ name, args, result, ms: 40 + Math.floor(rnd() * 140) });
    const stale = scen.stale;
    const here = zones[driver.zone];
    const pick = zi != null ? cand(zi) : best(true);
    const pz = zones[pick.i];
    const sgn = (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%';

    if (/model|stale|fallback|health|accura|why/.test(q)) {
      const m = Math.round(model.age / 60);
      const mae = zones.reduce((a, z) => a + Math.abs(modelForecast(z.i) - z.demand), 0) / N;
      return {
        specialist: 'Ops Monitor', intent: 'model_health',
        text: stale
          ? `The forecast model is stale: its features are ${m} min old (limit 15). I switched to a fallback that blends live demand with the trailing-hour average. Recommendations still work, but they react to demand instead of predicting it, so confidence is lower (${Math.round(rec ? rec.confidence * 100 : 58)}%).`
          : `The forecast model (${model.version}) is healthy. Its features are ${m} min old and its forecast error is about ${mae.toFixed(1)} requests/min per zone, so recommendations are using its 10-minute forecasts.`,
        tools: [
          tool('get_model_health', {}, `${stale ? 'stale' : 'healthy'}, features ${m} min old, MAE ${mae.toFixed(2)}`),
          tool('get_active_scenarios', {}, Object.keys(scen).filter((k) => scen[k]).join(', ') || 'none'),
        ],
      };
    }
    if (/earn|money|income|paid|per hour|hourly|fare|₹|rupee|profit/.test(q)) {
      const hours = earn.hours + tick / 3600;
      const per = Math.round(earn.today / hours);
      const there = Math.round(BASE_FARE * surgeOf(pressureOf(pz.demand, pz.supply)));
      const now = Math.round(BASE_FARE * surgeOf(pressureOf(here.demand, here.supply)));
      return {
        specialist: 'Earnings Advisor', intent: 'earnings',
        text: `You've made ${inr(earn.today)} from ${earn.trips} trips so far (${inr(per)} an hour), and ${inr(earn.bonus)} of that came from surge. A base-length trip in Zone ${pz.id} (${pz.name}) pays about ${inr(there)} right now, against ${inr(now)} where you are.`,
        tools: [
          tool('get_driver_earnings', { driver_id: driver.id }, `${inr(earn.today)}, ${earn.trips} trips, ${inr(per)}/hr`),
          tool('estimate_fare', { zone: pz.id }, `${inr(there)} at ${surgeOf(pressureOf(pz.demand, pz.supply)).toFixed(1)}x`),
        ],
      };
    }
    if (/route|eta|how far|how long|distance|drive to|get to|traffic|reach/.test(q)) {
      const to = pick.i;
      const mins = driveMin(driver.zone, to) + (scen.rain ? 2 : 0);
      const km = (dist(driver.zone, to) * 1.8).toFixed(1);
      return {
        specialist: 'Route Planner', intent: 'route',
        text: to === driver.zone
          ? `You're already in Zone ${here.id} (${here.name}).`
          : `From Zone ${here.id} (${here.name}) to Zone ${zones[to].id} (${zones[to].name}) is about ${mins} min and ${km} km${scen.rain ? '. Rain is slowing traffic, so I added 2 minutes' : ''}.`,
        tools: [
          tool('get_driver_location', { driver_id: driver.id }, `Zone ${here.id}`),
          tool('route_eta', { from: here.id, to: zones[to].id }, `${mins} min, ${km} km`),
        ],
      };
    }
    if (/demand|where|busy|hot|surge|zone|go |move|supply|drivers|best/.test(q)) {
      const s = pz.supply;
      const lead = pick.p < 1.1 && zi == null ? 'No zone is badly short of drivers right now. The best of them is' : zi == null ? 'The strongest opportunity is' : 'Here is';
      return {
        specialist: 'Demand Forecaster', intent: 'demand',
        text: `${lead} Zone ${pz.id} (${pz.name}): ${r1(pz.demand)} requests/min against ${s} driver${s === 1 ? '' : 's'}, surge ${surgeOf(pressureOf(pz.demand, pz.supply)).toFixed(1)}x. ` +
          (stale
            ? 'The forecast model is stale, so this is a reactive estimate from live demand and the hourly average, not a prediction. '
            : `The model expects ${r1(pick.f)}/min over the next 10 min (${sgn(pick.delta)} against the hourly average). `) +
          (pick.i === driver.zone ? "You're already there." : `It's about ${pick.d} min away.`),
        tools: [
          tool('get_zone_state', { zone: pz.id }, `demand ${r1(pz.demand)}/min, supply ${pz.supply}, pressure ${pick.p.toFixed(2)}`),
          stale ? tool('fallback_estimate', { zone: pz.id }, `${r1(pick.f)}/min (live + 1h average)`) : tool('forecast_demand', { zone: pz.id, horizon_min: 10 }, `${r1(pick.f)}/min`),
        ],
      };
    }
    return {
      specialist: 'Dispatch Coordinator', intent: 'general',
      text: 'I can tell you where demand is highest (Demand Forecaster), how your earnings are going (Earnings Advisor), how far a zone is (Route Planner), or whether the forecast model is healthy (Ops Monitor). Try "Where should I go?"',
      tools: [tool('route_intent', { text }, 'no specialist matched')],
    };
  };

  // ---- client messages ---------------------------------------------------------------------
  const send = (msg, reply) => {
    const out = (r) => { try { reply({ simulated: true, ...r }); } catch { /* socket gone */ } };
    switch (msg?.type) {
      case 'scenario': {
        const n = msg.name;
        if (n === 'reset') {
          if (scen.stale) model.age = 30;
          for (const k of Object.keys(scen)) scen[k] = false;
        } else if (n in scen) {
          const next = typeof msg.on === 'boolean' ? msg.on : !scen[n];
          if (n === 'stale') {
            if (next && !scen.stale) { model.snap = zones.map((z) => modelForecast(z.i)); model.age = 2700; }
            if (!next && scen.stale) model.age = 20;
          }
          if (n === 'stadium' && next && !scen.stadium) zones[6].bump += 6;
          scen[n] = next;
        }
        updateRec(); broadcast(); out({ type: 'ack', what: 'scenario', name: n, ok: true });
        break;
      }
      case 'rerun_eval': {
        if (evalState.running) { out({ type: 'ack', what: 'rerun_eval', ok: false }); break; }
        evalState.running = true; broadcast();
        setTimeout(() => {
          evalState.runs.unshift(computeEval());
          evalState.runs.length = Math.min(evalState.runs.length, 5);
          evalState.running = false; broadcast();
          out({ type: 'ack', what: 'rerun_eval', ok: true });
        }, 1800);
        break;
      }
      case 'book': {
        const i = clamp((+msg.zone || 1) - 1, 0, N - 1);
        const z = zones[i];
        const p = pressureOf(z.demand, z.supply);
        const s = surgeOf(p);
        z.bump += 1.5;
        const names = ['Meera K.', 'Harpreet S.', 'Imran A.', 'Sunita D.'];
        out({
          type: 'booking', status: 'confirmed', id: 'BK' + (1000 + ++bookingSeq), zone: z.id, zone_name: z.name,
          eta_min: Math.round(clamp(2 + 2.2 * p + (scen.rain ? 1.5 : 0), 2, 20)), surge: s, fare_estimate: Math.round(BASE_FARE * s),
          driver: { name: names[Math.floor(rnd() * names.length)], vehicle: 'White Maruti Dzire', plate: `PB 36 ${'ABCDEFGH'[Math.floor(rnd() * 8)]}${'KLMNPQRS'[Math.floor(rnd() * 8)]} ${1000 + Math.floor(rnd() * 8999)}` },
        });
        broadcast();
        break;
      }
      case 'login': {
        const id = String(msg.id || '').trim();
        if (id && String(msg.pin) === '1234') out({ type: 'login_ok', driver: { id, name: id === driver.id ? driver.name : id } });
        else out({ type: 'login_err', error: 'Driver ID or PIN is wrong. The demo PIN is 1234.' });
        break;
      }
      case 'accept_rec': {
        if (!rec || driver.status !== 'idle') { out({ type: 'ack', what: 'accept_rec', ok: false }); break; }
        const to = rec.zone - 1;
        zones[driver.zone].supply = Math.max(0, zones[driver.zone].supply - 1);
        driver.status = 'enroute'; driver.target = to; driver.total = driver.arrive_in = driveMin(driver.zone, to) * SIM_SEC_PER_MIN;
        rec = null; broadcast(); out({ type: 'ack', what: 'accept_rec', ok: true });
        break;
      }
      case 'ignore_rec': {
        if (rec) { blocked[rec.zone - 1] = tick + 40; rec = null; cooldownUntil = tick + 5; updateRec(); }
        broadcast(); out({ type: 'ack', what: 'ignore_rec', ok: true });
        break;
      }
      case 'chat': {
        const a = answer(String(msg.text || ''));
        setTimeout(() => out({ type: 'chat_reply', reply_to: msg.id, ...a }), 600 + Math.floor(rnd() * 600));
        break;
      }
      default: out({ type: 'ack', ok: false, error: 'unknown message type' });
    }
  };

  const subscribe = (fn) => {
    subs.add(fn);
    try { fn(JSON.stringify(snapshot())); } catch { subs.delete(fn); }
    if (!timer) timer = setInterval(step, tickMs);
    return () => { subs.delete(fn); if (!subs.size && timer) { clearInterval(timer); timer = null; } };
  };

  return { subscribe, send, snapshot };
}
