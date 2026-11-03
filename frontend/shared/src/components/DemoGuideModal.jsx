import React from 'react';
import { XIcon, BrainIcon, SparklesIcon, ActivityIcon, CheckCircleIcon, ArrowRightIcon } from '../icons.jsx';

export function DemoGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          aria-label="Close guide"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
            <BrainIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Uber Marketplace Brain
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Evaluation Guide
              </span>
            </h2>
            <p className="text-xs text-slate-400">AI-powered ride-hailing demand forecasting and driver repositioning simulator</p>
          </div>
        </div>

        {/* The Problem & The Solution */}
        <div className="mt-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4" /> The Core Innovation
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Standard ride dispatch is purely <strong>reactive</strong> — drivers only move when someone nearby calls a ride. 
              <strong> Uber Marketplace Brain</strong> forecasts passenger demand 10–15 minutes ahead using machine learning and proactively repositions idle drivers with anti-crowding balance.
            </p>
          </div>

          {/* Primary Metric Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-slate-900 border border-emerald-500/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Primary Benchmark Metric</span>
                <div className="text-2xl font-extrabold text-white mt-0.5">
                  +8.2 pp <span className="text-sm font-medium text-emerald-300">Fulfilment Rate Improvement</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  AI achieves <strong>79.4%</strong> fulfilment vs <strong>71.2%</strong> for the frozen baseline lookback policy. Average passenger wait time drops from 4m 12s to 2m 58s.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs px-2.5 py-1 rounded-md font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Frozen Seed: 42
                </span>
              </div>
            </div>
          </div>

          {/* 3-Step Demo Walkthrough */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              🚀 3-Minute Demo Script (Try this now!)
            </h3>
            <div className="space-y-2.5">
              <div className="flex gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold shrink-0">1</span>
                <div className="text-xs">
                  <span className="font-semibold text-white">Trigger an Event in Admin (Port 5175):</span>
                  <p className="text-slate-400 mt-0.5">Click <strong>🏟️ Stadium Ends</strong>. Watch Zone 7 demand spike 5x and turn into a high-pressure zone.</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold shrink-0">2</span>
                <div className="text-xs">
                  <span className="font-semibold text-white">Accept AI Hint in Driver App (Port 5174):</span>
                  <p className="text-slate-400 mt-0.5">The AI Brain warns the driver about high demand in Zone 7. Click <strong>"Accept & Start Driving"</strong> to see simulated navigation.</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold shrink-0">3</span>
                <div className="text-xs">
                  <span className="font-semibold text-white">Book Ride in Rider App (Port 5173):</span>
                  <p className="text-slate-400 mt-0.5">Select pickup at Central Station or Stadium. Experience live ETA calculations, dynamic surge transparency, and driver tracking.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick links to apps */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">Quick App Switcher:</span>
            <div className="flex gap-2">
              <a 
                href="http://localhost:5173" 
                target="_blank" 
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 flex items-center gap-1 transition"
              >
                👤 Rider App (:5173)
              </a>
              <a 
                href="http://localhost:5174" 
                target="_blank" 
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1 transition"
              >
                🚗 Driver App (:5174)
              </a>
              <a 
                href="http://localhost:5175" 
                target="_blank" 
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 flex items-center gap-1 transition"
              >
                🧠 Admin (:5175)
              </a>
            </div>
          </div>
        </div>

        {/* Got it button */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md transition"
          >
            Explore the Simulator
          </button>
        </div>
      </div>
    </div>
  );
}

