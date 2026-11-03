import React, { useEffect, useRef, useState } from 'react';
import { useWorld } from 'shared/useWorld.js';
import { Navbar } from 'shared/components/Navbar.jsx';
import { CityMap } from 'shared/components/CityMap.jsx';
import { ZoneDetailCard } from 'shared/components/ZoneDetailCard.jsx';
import { ZONE_DETAILS, inr, BASE_FARE } from 'shared/constants.js';
import {
  CarIcon,
  FlameIcon,
  SparklesIcon,
  TrendingUpIcon,
  ClockIcon,
  DollarIcon,
  ShieldIcon,
  SendIcon,
  MapPinIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  Spinner,
  Waiting
} from 'shared/ui.jsx';

const DEFAULT_DRIVER_ID = 'driver-042';

export default function App() {
  const { world, conn, send, on } = useWorld();
  const [isOnline, setIsOnline] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      specialist: 'Dispatch Coordinator',
      text: 'Hello Arjun! I am your AI Marketplace Co-pilot. Ask me where demand is highest, how your earnings are pacing, or why a zone is surging.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatPending, setIsChatPending] = useState(false);
  const chatScrollRef = useRef(null);

  // Listen for chat replies
  useEffect(() => {
    return on((msg) => {
      if (msg.type === 'chat_reply') {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `reply-${Date.now()}`,
            role: 'assistant',
            specialist: msg.specialist || 'Marketplace AI',
            text: msg.text,
            tools: msg.tools || [],
          },
        ]);
        setIsChatPending(false);
      }
    });
  }, [on]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatPending]);

  if (!world) {
    return <Waiting conn={conn} />;
  }

  const { driver, recommendation: rec, earnings, model, scenarios } = world;
  const currentZoneId = driver?.zone || 1;
  const currentZone = world.zones.find((z) => z.id === currentZoneId) || world.zones[0];
  const inspectedZone = selectedZoneId ? world.zones.find((z) => z.id === selectedZoneId) : null;
  const isEnroute = driver?.status === 'enroute';
  const targetZoneId = driver?.target;
  const targetZone = targetZoneId ? world.zones.find((z) => z.id === targetZoneId) : null;

  // Recommendation details
  const recZoneId = rec?.destination || rec?.zone;
  const recZone = recZoneId ? world.zones.find((z) => z.id === recZoneId) : null;

  const handleAcceptRecommendation = () => {
    send({ type: 'accept_rec' });
  };

  const handleIgnoreRecommendation = () => {
    send({ type: 'ignore_rec' });
  };

  const handleSendChat = (text) => {
    const q = text || chatInput;
    if (!q.trim() || isChatPending) return;

    setChatMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: q.trim() },
    ]);
    setIsChatPending(true);
    setChatInput('');

    send({
      type: 'chat',
      id: driver?.id || DEFAULT_DRIVER_ID,
      text: q.trim(),
    });
  };

  const quickPrompts = [
    'Where should I drive right now?',
    'How are my earnings today?',
    'Why is Stadium surging?',
    'Is the forecast model healthy?',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        app="driver"
        conn={conn}
        city={world.city}
        tick={world.tick}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Driver Header Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-extrabold text-xl shadow-lg shadow-amber-500/20">
              {driver?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">{driver?.name || 'Arjun Singh'}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-semibold border border-slate-700">
                  {driver?.id || DEFAULT_DRIVER_ID}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-blue-400 font-semibold">
                  <MapPinIcon className="w-3.5 h-3.5" />
                  Currently in Zone #{currentZoneId} ({currentZone.name})
                </span>
                <span>•</span>
                <span className="text-slate-400">Maruti Swift Dzire (PB 36 AB 1420)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {driver?.last_event && (
              <div className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5 text-blue-400" />
                {driver.last_event.text}
              </div>
            )}
            {scenarios?.stale && (
              <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400" />
                Model Stale: Using Moving Average Fallback
              </div>
            )}
          </div>
        </div>

        {/* HERO RECOMMENDATION OR EN-ROUTE NAVIGATION CARD */}
        {isEnroute && targetZone ? (
          /* Enroute Navigation State */
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/40 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <CarIcon className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Repositioning In Progress
                  </span>
                  <h2 className="text-2xl font-extrabold text-white">
                    Navigating to Zone #{targetZone.id} ({targetZone.name})
                  </h2>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-blue-400 font-mono">
                  {Math.max(1, Math.ceil((driver.arrive_in || 3) / 3))} min
                </div>
                <div className="text-xs text-slate-400">Estimated Drive Time</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((((driver.total || 8) - (driver.arrive_in || 0)) / (driver.total || 8)) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Departed Zone #{currentZoneId}</span>
                <span>Meeting expected demand in Zone #{targetZone.id}</span>
              </div>
            </div>
          </div>
        ) : rec && recZone ? (
          /* Active AI Recommendation Card */
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-orange-950/30 border border-amber-500/50 shadow-xl space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                    <SparklesIcon className="w-3.5 h-3.5" /> AI POSITIONING RECOMMENDATION
                  </span>
                  <span className="text-xs text-amber-300/80 font-semibold">
                    {Math.round((rec.confidence || 0.88) * 100)}% Model Confidence
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
                  Head to Zone #{recZone.id} ({recZone.name})
                </h2>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {rec.reason || `Expected demand spike (+${rec.demand_delta_pct || 45}% over baseline). Anti-crowding algorithm reserves your dispatch slot.`}
                </p>
              </div>

              {/* Surge Pill */}
              <div className="text-right">
                <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-lg font-extrabold font-mono inline-flex items-center gap-1">
                  <FlameIcon className="w-4 h-4 text-amber-400" />
                  {(recZone.surge || 1.8).toFixed(1)}x Surge
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">High Fare Potential</span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center sm:text-left">
              <div>
                <span className="text-[11px] text-slate-400 block">Drive Time</span>
                <span className="text-lg font-bold text-white font-mono">
                  ~{rec.drive_min || 4} mins
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Current Drivers There</span>
                <span className="text-lg font-bold text-white font-mono">
                  {recZone.supply || rec.drivers || 3} cars
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Estimated Earnings Boost</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  +{inr(150 + Math.round((recZone.surge || 1.5) * 80))} / trip
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={handleAcceptRecommendation}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <CarIcon className="w-4 h-4 text-slate-950" />
                Accept & Start Driving to Zone #{recZone.id}
              </button>
              <button
                type="button"
                onClick={handleIgnoreRecommendation}
                className="py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-sm transition"
              >
                Stay in Zone #{currentZoneId}
              </button>
            </div>
          </div>
        ) : (
          /* Well positioned / Idle state */
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow flex items-center gap-3 text-sm text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>
              <strong>You are well positioned!</strong> Zone #{currentZoneId} ({currentZone.name}) has balanced passenger demand. Keep an eye out for incoming ride requests.
            </span>
          </div>
        )}

        {/* Content Columns: City Map & Zone Detail (Left) + Earnings & AI Chat (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: 12-Zone Map with Driver Opportunities (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUpIcon className="w-4 h-4 text-amber-400" />
                    City Demand Heatmap & Opportunities
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time demand vs active drivers across all 12 zones.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">Updates every 1s</span>
              </div>

              {/* City Map in Driver Mode */}
              <CityMap
                zones={world.zones}
                mode="driver"
                selectedZone={selectedZoneId}
                onSelectZone={(id) => setSelectedZoneId(id)}
                userZone={currentZoneId}
                recommendedZone={recZoneId}
              />
            </div>

            {/* Inspect Zone Card */}
            {inspectedZone && (
              <ZoneDetailCard
                zone={inspectedZone}
                onClose={() => setSelectedZoneId(null)}
              />
            )}
          </div>

          {/* RIGHT: Earnings & AI Assistant Chat (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Earnings Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Shift Performance</span>
                  <div className="text-3xl font-extrabold text-white mt-0.5">
                    {inr(earnings?.today || 2340)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                    {earnings?.trips || 14} completed trips
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    {inr(earnings?.per_hour || Math.round((earnings?.today || 2340) / (earnings?.hours || 5.2)))} / hour
                  </span>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-400">Hours Online</span>
                  <span className="font-bold text-sm text-white block mt-0.5">
                    {earnings?.hours || 5.2} hrs
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Surge Bonus</span>
                  <span className="font-bold text-sm text-amber-400 block mt-0.5">
                    +{inr(earnings?.surge_bonus || earnings?.bonus || 310)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Avg Trip Fare</span>
                  <span className="font-bold text-sm text-emerald-400 block mt-0.5">
                    {inr(Math.round((earnings?.today || 2340) / Math.max(1, earnings?.trips || 14)))}
                  </span>
                </div>
              </div>

              {/* Sparkline Visual */}
              {earnings?.history && earnings.history.length > 1 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">Earnings Progression</span>
                  <svg viewBox="0 0 240 40" className="w-full h-10 overflow-visible">
                    {(() => {
                      const data = earnings.history;
                      const min = Math.min(...data);
                      const max = Math.max(...data);
                      const points = data.map((v, i) => {
                        const x = (i / (data.length - 1)) * 240;
                        const y = 35 - ((v - min) / Math.max(1, max - min)) * 30;
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                      }).join(' ');
                      return (
                        <polyline
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="2.5"
                          points={points}
                        />
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>

            {/* AI Assistant Chat Panel */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <SparklesIcon className="w-4 h-4 text-blue-400" />
                  AI Marketplace Co-pilot
                </h3>
                <span className="text-[11px] text-slate-400">
                  Multi-Agent Assistant
                </span>
              </div>

              {/* Chat Message Box */}
              <div 
                ref={chatScrollRef}
                className="max-h-56 min-h-[160px] overflow-y-auto space-y-2.5 pr-1 text-xs"
              >
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <span className="text-[10px] font-bold text-blue-400 mb-0.5 px-1">
                        🤖 {msg.specialist}
                      </span>
                    )}
                    <div
                      className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-slate-800/80 border border-slate-700 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatPending && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                    <Spinner /> <span>Querying Marketplace Forecaster...</span>
                  </div>
                )}
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSendChat(q)}
                    disabled={isChatPending}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex gap-2 pt-1"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about earnings, demand, or routes..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatPending}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs transition flex items-center justify-center shadow"
                >
                  <SendIcon className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
