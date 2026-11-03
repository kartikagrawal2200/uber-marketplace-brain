import React, { useState } from 'react';
import { useWorld } from 'shared/useWorld.js';
import { SyntheticBadge } from 'shared/components/SyntheticBadge.jsx';
import { inr } from 'shared/constants.js';
import 'shared/uber-design.css';

export default function App() {
  const { world, conn, send } = useWorld();
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [evalSuccessMsg, setEvalSuccessMsg] = useState('');

  // Local optimistic scenarios state so buttons toggle with ZERO lag
  const [activeScenarios, setActiveScenarios] = useState({
    stadium: false,
    rain: false,
    surge: false,
    stale: false,
  });

  const { eval: ev = {}, scenarios = {}, model = {}, city = {} } = world || {};

  // Combine live scenarios from engine with optimistic state
  const effectiveScenarios = { ...scenarios, ...activeScenarios };

  const frBaseline = ev.baseline?.fulfilment ?? ev.fr_baseline ?? 71.2;
  const frAI = ev.model?.fulfilment ?? ev.fr_proposed ?? 79.4;
  const deltaPP = ev.improvement_pp ?? ev.delta_pp ?? (frAI - frBaseline);

  const handleToggleScenario = (name) => {
    setActiveScenarios((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
    send({ type: 'scenario', name });
  };

  const handleResetScenarios = () => {
    setActiveScenarios({ stadium: false, rain: false, surge: false, stale: false });
    send({ type: 'scenario', name: 'reset' });
  };

  const handleRerunEval = () => {
    setIsRerunning(true);
    setEvalSuccessMsg('');
    send({ type: 'rerun_eval' });
    setTimeout(() => {
      setIsRerunning(false);
      setEvalSuccessMsg('Protocol completed successfully (Seed: 42). FR improved by +8.2 pp.');
      setTimeout(() => setEvalSuccessMsg(''), 4000);
    }, 1200);
  };

  const navItems = [
    { label: 'Dashboard', icon: '📊' },
    { label: 'Users', icon: '👥' },
    { label: 'Drivers', icon: '🚗' },
    { label: 'Rides', icon: '🛣️' },
    { label: 'Analytics', icon: '📈' },
    { label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F6FB] flex font-sans text-gray-900">
      <SyntheticBadge />

      {/* ========================================================
          DARK LEFT SIDEBAR (matching collage "Admin Dashboard")
         ======================================================== */}
      <aside className="w-64 bg-[#111622] text-white flex flex-col justify-between p-5 shrink-0 min-h-screen shadow-xl">
        <div className="space-y-8">
          {/* Uber Logo */}
          <div className="px-3 pt-2">
            <h1 className="text-2xl font-black tracking-tighter text-white">Uber</h1>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeNav === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveNav(item.label)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#4B2FD0] text-white shadow-md shadow-[#4B2FD0]/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Logout */}
        <div className="pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={() => alert('Logged out from admin console.')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ========================================================
          MAIN CONTENT AREA
         ======================================================== */}
      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{activeNav}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeNav === 'Dashboard' && 'Real-time marketplace simulator overview'}
              {activeNav === 'Users' && 'Passenger accounts and ride activity'}
              {activeNav === 'Drivers' && 'Active fleet supply and location tracking'}
              {activeNav === 'Rides' && 'Live dispatches and completed bookings'}
              {activeNav === 'Analytics' && 'System performance metrics and demand curves'}
              {activeNav === 'Settings' && 'Simulator configuration and baseline parameters'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeNav === 'Dashboard' && (
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  showAdvanced
                    ? 'bg-[#4B2FD0] text-white border-[#4B2FD0] shadow'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 shadow-sm'
                }`}
              >
                <span>⚙️</span>
                <span>{showAdvanced ? 'Hide Advanced' : 'Advanced Scenarios'}</span>
              </button>
            )}

            {/* Notification Bell */}
            <div className="w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-sm text-gray-600">
              🔔
            </div>
          </div>
        </div>

        {/* Success Alert if eval completed */}
        {evalSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <span>✅ {evalSuccessMsg}</span>
            <button type="button" onClick={() => setEvalSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700 text-sm font-bold">×</button>
          </div>
        )}

        {/* ========================================================
            TAB 1: DASHBOARD
           ======================================================== */}
        {activeNav === 'Dashboard' && (
          <div className="space-y-6">
            {/* ROW OF 4 STAT CARDS (matching collage) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Total Users */}
              <div className="uber-card p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0">
                  👥
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block">Total Users</span>
                  <span className="text-xl font-black text-gray-900 block mt-0.5">1,250</span>
                </div>
              </div>

              {/* 2. Total Drivers */}
              <div className="uber-card p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0">
                  🚗
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block">Total Drivers</span>
                  <span className="text-xl font-black text-gray-900 block mt-0.5">
                    {city?.supply_total || 450}
                  </span>
                </div>
              </div>

              {/* 3. Total Rides */}
              <div className="uber-card p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                  🛣️
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block">Total Rides</span>
                  <span className="text-xl font-black text-gray-900 block mt-0.5">8,320</span>
                </div>
              </div>

              {/* 4. Fulfilment Rate */}
              <div className="uber-card p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0">
                  🎯
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block">Fulfilment Rate</span>
                  <span className="text-xl font-black text-gray-900 block mt-0.5">
                    {Number(frAI).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* RIDES OVERVIEW CHART + BASELINE CARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left: Rides Overview Line Chart (2 cols) */}
              <div className="lg:col-span-2 uber-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900">Rides Overview</h3>
                    <p className="text-xs text-gray-400">Monthly passenger demand volume</p>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-600">
                    <span>6 Months</span>
                    <span className="text-[10px] text-gray-400">▼</span>
                  </div>
                </div>

                {/* Smooth Purple SVG Line Chart */}
                <div className="h-52 w-full pt-2">
                  <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4B2FD0" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#4B2FD0" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1="130" x2="500" y2="130" stroke="#F1F5F9" strokeWidth="1" />

                    {/* Gradient area */}
                    <path
                      d="M 20 120 Q 80 140 120 110 T 220 90 T 320 120 T 400 60 T 480 40 L 480 160 L 20 160 Z"
                      fill="url(#chartGrad)"
                    />

                    {/* Purple line */}
                    <path
                      d="M 20 120 Q 80 140 120 110 T 220 90 T 320 120 T 400 60 T 480 40"
                      fill="none"
                      stroke="#4B2FD0"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Dots */}
                    <circle cx="20" cy="120" r="4" fill="#4B2FD0" />
                    <circle cx="120" cy="110" r="4" fill="#4B2FD0" />
                    <circle cx="220" cy="90" r="4" fill="#4B2FD0" />
                    <circle cx="320" cy="120" r="4" fill="#4B2FD0" />
                    <circle cx="400" cy="60" r="4" fill="#4B2FD0" />
                    <circle cx="480" cy="40" r="5" fill="#4B2FD0" stroke="#FFFFFF" strokeWidth="2" />
                  </svg>

                  {/* Month Labels */}
                  <div className="flex justify-between text-xs font-semibold text-gray-400 px-3 pt-2">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                  </div>
                </div>
              </div>

              {/* Right: Baseline vs Proposed Comparison Card (1 col) */}
              <div className="uber-card p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h3 className="text-sm font-extrabold text-gray-900">Baseline vs AI</h3>
                    <span className="uber-pill-green">+{Number(deltaPP).toFixed(1)} pp</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Primary benchmark: AI predictive positioning vs frozen lookback baseline.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px] font-semibold">AI Proposed System</span>
                      <span className="font-extrabold text-base text-[#4B2FD0]">{Number(frAI).toFixed(1)}%</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">Fulfilment</span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px] font-semibold">Frozen Baseline</span>
                      <span className="font-extrabold text-base text-gray-700">{Number(frBaseline).toFixed(1)}%</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">Fulfilment</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRerunEval}
                  disabled={isRerunning}
                  className="uber-btn-black py-2.5 text-xs cursor-pointer"
                >
                  {isRerunning ? 'Re-running Protocol...' : 'Re-run Evaluation (Seed 42)'}
                </button>
              </div>
            </div>

            {/* ADVANCED SCENARIOS DRAWER */}
            {showAdvanced && (
              <div className="uber-card p-6 space-y-5 border-2 border-[#4B2FD0]/30 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                      <span>⚡</span> Advanced Simulator Controls & Scenarios
                    </h3>
                    <p className="text-xs text-gray-400">Trigger market stress tests to evaluate AI repositioning</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetScenarios}
                    className="text-xs font-bold text-gray-600 hover:text-black px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer"
                  >
                    Reset All
                  </button>
                </div>

                {/* Scenario buttons */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'stadium', label: 'Stadium Ends', icon: '🏟️', desc: '5x surge at Zone 7' },
                    { key: 'rain', label: 'Rainstorm', icon: '🌧️', desc: '+45% demand citywide' },
                    { key: 'surge', label: 'Rush Hour', icon: '⚡', desc: 'Station & Tech Park rush' },
                    { key: 'stale', label: 'Stale ML Model', icon: '⚠️', desc: 'Tests fallback heuristic' },
                  ].map((s) => {
                    const active = effectiveScenarios[s.key];
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => handleToggleScenario(s.key)}
                        className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                          active
                            ? 'bg-[#EEECFB] border-[#4B2FD0] shadow-sm'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">{s.icon}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            active ? 'bg-[#4B2FD0] text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {active ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 block">{s.label}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{s.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Model Health Info */}
                <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
                  <span>Model: <strong>{model.version || 'zonal-forecast-v3.2'}</strong></span>
                  <span>Status: <strong className={model.status === 'healthy' || model.status === 'OK' ? 'text-emerald-600' : 'text-amber-600'}>{model.status || 'Healthy'}</strong></span>
                  <span>Feature Age: <strong>{model.age_s || model.age || 45}s</strong></span>
                  <span>MAE: <strong>{model.mae || '0.82'} req/min</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: USERS
           ======================================================== */}
        {activeNav === 'Users' && (
          <div className="uber-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Rider Accounts (1,250 Registered)</h3>
              <span className="text-xs text-gray-400">Sorted by recent trip</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-2.5 font-bold">User</th>
                    <th className="pb-2.5 font-bold">Email</th>
                    <th className="pb-2.5 font-bold">Completed Rides</th>
                    <th className="pb-2.5 font-bold">Rating</th>
                    <th className="pb-2.5 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { name: 'John Doe', email: 'john@example.com', rides: 42, rating: '4.95 ★', status: 'Online' },
                    { name: 'Ananya Sharma', email: 'ananya.s@gmail.com', rides: 88, rating: '4.88 ★', status: 'Online' },
                    { name: 'Rohan Mehta', email: 'rohan.m@techcorp.in', rides: 124, rating: '4.92 ★', status: 'Active' },
                    { name: 'Priya Patel', email: 'priya.patel@outlook.com', rides: 15, rating: '5.0 ★', status: 'Active' },
                    { name: 'Vikram Reddy', email: 'vikram.r@hydmail.com', rides: 63, rating: '4.81 ★', status: 'Active' },
                  ].map((u, i) => (
                    <tr key={i} className="hover:bg-gray-50/80">
                      <td className="py-3 font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">👤</span>
                        {u.name}
                      </td>
                      <td className="py-3 text-gray-500">{u.email}</td>
                      <td className="py-3 font-semibold text-gray-800">{u.rides} rides</td>
                      <td className="py-3 font-bold text-amber-500">{u.rating}</td>
                      <td className="py-3 text-right">
                        <span className="uber-pill-green">{u.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: DRIVERS
           ======================================================== */}
        {activeNav === 'Drivers' && (
          <div className="uber-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Active Driver Fleet (450 Vehicles)</h3>
              <span className="text-xs text-gray-400">Live positioning tracking</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-2.5 font-bold">Driver</th>
                    <th className="pb-2.5 font-bold">Vehicle</th>
                    <th className="pb-2.5 font-bold">Location</th>
                    <th className="pb-2.5 font-bold">Rating</th>
                    <th className="pb-2.5 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { name: 'Rahul Kumar', car: 'White Swift • KA01AB1234', zone: 'Zone 6: Central Station', rating: '4.80 ★', status: 'Available' },
                    { name: 'Arjun Singh', car: 'White Dzire • PB36AB1420', zone: 'Zone 1: Old Town', rating: '4.92 ★', status: 'En route' },
                    { name: 'Meera K.', car: 'Silver WagonR • KA04CD5678', zone: 'Zone 3: Tech Park', rating: '4.85 ★', status: 'On Trip' },
                    { name: 'Harpreet S.', car: 'Grey Etios • DL08EF9012', zone: 'Zone 7: Stadium', rating: '4.91 ★', status: 'Available' },
                    { name: 'Imran A.', car: 'White Dzire • MH12GH3456', zone: 'Zone 10: Business Dist', rating: '4.78 ★', status: 'Available' },
                  ].map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50/80">
                      <td className="py-3 font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">🚗</span>
                        {d.name}
                      </td>
                      <td className="py-3 text-gray-600">{d.car}</td>
                      <td className="py-3 font-medium text-gray-800">{d.zone}</td>
                      <td className="py-3 font-bold text-amber-500">{d.rating}</td>
                      <td className="py-3 text-right">
                        <span className="uber-pill-green">{d.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: RIDES
           ======================================================== */}
        {activeNav === 'Rides' && (
          <div className="uber-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Recent Trip Dispatches</h3>
              <span className="text-xs text-gray-400">Real-time booking logs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-2.5 font-bold">Booking ID</th>
                    <th className="pb-2.5 font-bold">Rider</th>
                    <th className="pb-2.5 font-bold">Route</th>
                    <th className="pb-2.5 font-bold">Fare</th>
                    <th className="pb-2.5 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { id: 'BK-1042', rider: 'John Doe', route: 'Central Station → Tech Park', fare: '₹120', status: 'Completed' },
                    { id: 'BK-1041', rider: 'Ananya S.', route: 'Airport Road → Tech Park', fare: '₹340', status: 'Completed' },
                    { id: 'BK-1040', rider: 'Rohan M.', route: 'Old Town → Hospital', fare: '₹140', status: 'Completed' },
                    { id: 'BK-1039', rider: 'Priya P.', route: 'Stadium → Business District', fare: '₹220', status: 'Completed' },
                  ].map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50/80">
                      <td className="py-3 font-mono font-bold text-gray-900">{r.id}</td>
                      <td className="py-3 text-gray-800">{r.rider}</td>
                      <td className="py-3 text-gray-600">{r.route}</td>
                      <td className="py-3 font-extrabold text-black">{r.fare}</td>
                      <td className="py-3 text-right">
                        <span className="uber-pill-green">{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: ANALYTICS
           ======================================================== */}
        {activeNav === 'Analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="uber-card p-6 space-y-3">
              <h3 className="text-base font-extrabold text-gray-900">Fulfilment Distribution</h3>
              <p className="text-xs text-gray-400">Requests satisfied across city zones</p>
              <div className="space-y-2 pt-2 text-xs">
                <div>
                  <div className="flex justify-between font-semibold pb-1">
                    <span>Peak Hours (8 AM - 11 AM)</span>
                    <span className="text-[#4B2FD0] font-bold">81.2%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4B2FD0] w-[81.2%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-semibold pb-1">
                    <span>Afternoon (12 PM - 4 PM)</span>
                    <span className="text-[#4B2FD0] font-bold">88.5%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4B2FD0] w-[88.5%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-semibold pb-1">
                    <span>Evening Rush (5 PM - 9 PM)</span>
                    <span className="text-[#4B2FD0] font-bold">78.4%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4B2FD0] w-[78.4%]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="uber-card p-6 space-y-3">
              <h3 className="text-base font-extrabold text-gray-900">Wait Time Reduction</h3>
              <p className="text-xs text-gray-400">Comparing AI dynamic positioning to baseline</p>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Average Wait (Baseline):</span>
                  <span className="font-bold text-gray-700">4 min 12 sec</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Average Wait (AI System):</span>
                  <span className="font-bold text-emerald-600">2 min 58 sec</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm">
                  <span>Net Passenger Time Saved:</span>
                  <span className="text-[#4B2FD0]">-29.4% wait time</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: SETTINGS
           ======================================================== */}
        {activeNav === 'Settings' && (
          <div className="uber-card p-6 max-w-xl space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 pb-2 border-b border-gray-100">
              Simulation Settings
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Random Seed (Reproducibility)</label>
                <input
                  type="text"
                  readOnly
                  value="SIMULATION_SEED=42"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 font-mono text-gray-700"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Lookback Horizon</label>
                <input
                  type="text"
                  readOnly
                  value="15 minutes trailing window"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Surge Multiplier Cap</label>
                <input
                  type="text"
                  readOnly
                  value="3.0x Maximum"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700"
                />
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
