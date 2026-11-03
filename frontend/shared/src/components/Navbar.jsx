import React, { useState } from 'react';
import { BrainIcon, UserIcon, CarIcon, ShieldIcon, HelpCircleIcon, ActivityIcon, ClockIcon } from '../icons.jsx';
import { DemoGuideModal } from './DemoGuideModal.jsx';

export function Navbar({ app, conn, city, tick, actions }) {
  const [showGuide, setShowGuide] = useState(false);

  const apps = [
    { key: 'rider', name: 'Rider App', port: '5173', icon: UserIcon, url: 'http://localhost:5173' },
    { key: 'driver', name: 'Driver App', port: '5174', icon: CarIcon, url: 'http://localhost:5174' },
    { key: 'admin', name: 'Admin Dashboard', port: '5175', icon: ShieldIcon, url: 'http://localhost:5175' },
  ];

  const isLive = conn === 'live';

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & App Identification */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <BrainIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">Uber Marketplace Brain</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  AI SIMULATOR
                </span>
              </div>
              <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <span>{app === 'rider' ? '👤 Rider Experience' : app === 'driver' ? '🚗 Driver Partner Portal' : '🧠 Marketplace Admin Console'}</span>
              </div>
            </div>
          </div>

          {/* Center App Switcher Tabs */}
          <nav className="hidden md:flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800" aria-label="Apps">
            {apps.map((item) => {
              const active = app === item.key;
              const Icon = item.icon;
              return (
                <a
                  key={item.key}
                  href={item.url}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${active ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'}`}>
                    :{item.port}
                  </span>
                </a>
              );
            })}
          </nav>

          {/* Right section: System Status, Time, and Guide Button */}
          <div className="flex items-center gap-2.5">
            {/* Live Clock / Weather if available */}
            {city && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                <ClockIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Sim: <strong>{city.time || '08:00 AM'}</strong></span>
                {city.weather && (
                  <span className="ml-1 text-slate-400">({city.weather})</span>
                )}
              </div>
            )}

            {/* Connection Status Indicator */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
              title={isLive ? 'Connected to FastAPI WebSocket /ws/state' : 'Running in-browser standalone simulation'}
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-slate-300 font-medium">
                {isLive ? 'Live Engine' : 'Simulation'}
              </span>
            </div>

            {/* Custom actions per app (e.g. Sign out, Reset) */}
            {actions}

            {/* Guide Button */}
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition shadow-sm"
              title="Open Evaluation & Demo Guide"
            >
              <HelpCircleIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Demo Guide</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800 py-1.5 px-2 bg-slate-950/60 text-xs">
          {apps.map((item) => {
            const active = app === item.key;
            return (
              <a
                key={item.key}
                href={item.url}
                className={`px-2.5 py-1 rounded-md font-bold ${
                  active ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                {item.name} (:{item.port})
              </a>
            );
          })}
        </div>
      </header>

      {/* Guide Modal */}
      <DemoGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}
