import React from 'react';
import { ZONE_DETAILS, inr, BASE_FARE, CAP } from '../constants.js';
import { MapPinIcon, FlameIcon, CarIcon, ClockIcon, SparklesIcon, TrendingUpIcon, XIcon } from '../icons.jsx';

export function ZoneDetailCard({ zone, onClose, onBookInZone = null }) {
  if (!zone) return null;

  const detail = ZONE_DETAILS.find((d) => d.id === zone.id) || {
    icon: '📍',
    name: zone.name,
    type: 'Urban Zone',
    desc: 'Metropolitan zone with active ride hailing traffic',
  };

  const surge = zone.surge || 1.0;
  const isSurging = surge > 1.0;
  const estimatedFare = Math.round(BASE_FARE * surge);
  const waitMin = zone.eta_min || Math.round(Math.max(2, (15 - (zone.supply || 5)) * 0.4));
  const capacity = Math.round((zone.supply || 1) * CAP);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700/80 p-5 text-white shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl p-2 rounded-xl bg-slate-800 border border-slate-700/60" role="img" aria-label={detail.name}>
            {detail.icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                Zone #{zone.id}
              </span>
              <h3 className="text-base font-bold text-white">{zone.name}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{detail.desc}</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid of Key Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block flex items-center gap-1">
            <ClockIcon className="w-3 h-3 text-blue-400" /> Wait ETA
          </span>
          <span className="text-lg font-bold text-white mt-1 block">
            {waitMin} mins
          </span>
          <span className="text-[10px] text-slate-500">Pickup arrival</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block flex items-center gap-1">
            <CarIcon className="w-3 h-3 text-emerald-400" /> Active Drivers
          </span>
          <span className="text-lg font-bold text-white mt-1 block">
            {zone.supply || 0}
          </span>
          <span className="text-[10px] text-slate-500">Can serve ~{capacity}/min</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block flex items-center gap-1">
            <TrendingUpIcon className="w-3 h-3 text-purple-400" /> Demand
          </span>
          <span className="text-lg font-bold text-white mt-1 block">
            {Math.round(zone.demand || 0)} <span className="text-xs text-slate-400 font-normal">req/min</span>
          </span>
          <span className="text-[10px] text-slate-500">Passenger requests</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block flex items-center gap-1">
            <FlameIcon className="w-3 h-3 text-amber-400" /> Surge Price
          </span>
          <span className="text-lg font-bold text-amber-400 mt-1 block">
            {isSurging ? `${surge.toFixed(1)}x` : '1.0x Normal'}
          </span>
          <span className="text-[10px] text-slate-500">Base fare: {inr(estimatedFare)}</span>
        </div>
      </div>

      {/* AI Demand Forecasting Insight */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/20 text-xs">
        <div className="flex items-center gap-1.5 text-blue-300 font-bold mb-1">
          <SparklesIcon className="w-3.5 h-3.5 text-blue-400" />
          <span>AI Demand Forecaster Insight</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          {zone.forecast 
            ? `Predictive model forecasts ${zone.forecast} requests/min over the next 15 minutes (${zone.forecast > zone.avg ? 'rising' : 'stable'} compared to hourly historical benchmark).`
            : `Current demand is ${Math.round(zone.demand)} requests/min. ${isSurging ? 'Drivers are being routed from nearby calmer zones to reduce wait times.' : 'Supply is well-balanced.'}`
          }
        </p>
      </div>

      {/* Book ride button if available */}
      {onBookInZone && (
        <button
          onClick={() => onBookInZone(zone.id)}
          className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-1.5"
        >
          <MapPinIcon className="w-3.5 h-3.5" /> Set Zone #{zone.id} as Pickup Location
        </button>
      )}
    </div>
  );
}
