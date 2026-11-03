import React from 'react';
import { ZONE_DETAILS, CAP, surgeOf, pressureOf } from '../constants.js';
import { FlameIcon, CarIcon, ClockIcon, MapPinIcon } from '../icons.jsx';

export function CityMap({
  zones = [],
  mode = 'rider', // 'rider' | 'driver' | 'admin'
  selectedZone = null,
  onSelectZone = null,
  userZone = null,
  recommendedZone = null,
  compact = false,
}) {
  // Compute maximum demand across zones for relative scaling
  const maxDemand = Math.max(1, ...zones.map((z) => z.demand || 1));
  const maxSupply = Math.max(1, ...zones.map((z) => (z.supply || 1) * CAP));

  return (
    <div className="w-full">
      {/* Map Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {zones.map((z) => {
          const detail = ZONE_DETAILS.find((d) => d.id === z.id) || {
            icon: '📍',
            name: z.name,
            type: 'Urban Zone',
          };

          const isSelected = selectedZone === z.id;
          const isUserHere = userZone === z.id;
          const isRecommended = recommendedZone === z.id;
          const pressure = z.pressure || pressureOf(z.demand, z.supply);
          const surge = z.surge || surgeOf(pressure);
          const hasSurge = surge > 1.0;

          // Heat styling based on supply/demand balance
          let heatBorder = 'border-slate-800';
          let heatBg = 'bg-slate-900/90 hover:bg-slate-850';
          
          if (mode !== 'rider') {
            if (pressure > 2.0) {
              heatBorder = 'border-rose-500/50';
              heatBg = 'bg-rose-950/20 hover:bg-rose-950/30';
            } else if (pressure > 1.3) {
              heatBorder = 'border-amber-500/50';
              heatBg = 'bg-amber-950/20 hover:bg-amber-950/30';
            } else {
              heatBorder = 'border-slate-800';
              heatBg = 'bg-slate-900/90 hover:bg-slate-850';
            }
          }

          if (isSelected) {
            heatBorder = 'border-blue-500 ring-2 ring-blue-500/40';
          }
          if (isRecommended) {
            heatBorder = 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20';
          }

          return (
            <button
              key={z.id}
              type="button"
              onClick={() => onSelectZone?.(z.id)}
              disabled={!onSelectZone}
              className={`relative text-left rounded-xl p-3 border transition-all duration-200 group ${heatBorder} ${heatBg} ${
                onSelectZone ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {/* Header: Zone Number + Landmark + Badges */}
              <div className="flex items-start justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg" role="img" aria-label={detail.name}>{detail.icon}</span>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono font-bold text-slate-400">Z{z.id}</span>
                      <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                        {z.name}
                      </h4>
                    </div>
                    {!compact && (
                      <span className="text-[10px] text-slate-500 block line-clamp-1">
                        {detail.type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Surge or User Badge */}
                <div className="flex flex-col items-end gap-1">
                  {isUserHere && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shadow-sm flex items-center gap-0.5">
                      <MapPinIcon className="w-2.5 h-2.5" />
                      {mode === 'rider' ? 'You' : 'Here'}
                    </span>
                  )}
                  {isRecommended && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 shadow-sm animate-pulse">
                      ★ Move Here
                    </span>
                  )}
                  {hasSurge && !isRecommended && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-0.5">
                      <FlameIcon className="w-2.5 h-2.5 text-amber-400" />
                      {surge.toFixed(1)}x
                    </span>
                  )}
                </div>
              </div>

              {/* Mode-Specific Information */}
              {mode === 'rider' ? (
                /* Rider Mode: Focus on ETA, Nearby Cars, and Price */
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-end justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Pickup Wait</span>
                    <span className="font-extrabold text-sm text-white flex items-center gap-1">
                      <ClockIcon className="w-3 h-3 text-blue-400" />
                      {z.eta_min || Math.round(Math.max(2, (15 - (z.supply || 5)) * 0.4))} min
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Available</span>
                    <span className="font-semibold text-slate-300 flex items-center gap-1 justify-end">
                      <CarIcon className="w-3 h-3 text-slate-400" />
                      {z.supply || 0} cars
                    </span>
                  </div>
                </div>
              ) : mode === 'driver' ? (
                /* Driver Mode: Focus on Demand vs Drivers and Surge */
                <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Demand: <strong className="text-slate-200">{Math.round(z.demand || 0)}/min</strong></span>
                    <span className="text-slate-400">Drivers: <strong className="text-slate-200">{z.supply || 0}</strong></span>
                  </div>
                  {/* Visual Demand vs Supply Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500" 
                      style={{ width: `${Math.min(100, ((z.demand || 0) / maxDemand) * 100)}%` }} 
                      title={`Demand: ${z.demand}/min`}
                    />
                    <div 
                      className="h-full bg-amber-400 transition-all duration-500" 
                      style={{ width: `${Math.min(100, (((z.supply || 0) * CAP) / maxSupply) * 100)}%` }} 
                      title={`Drivers: ${z.supply}`}
                    />
                  </div>
                </div>
              ) : (
                /* Admin Mode: Comprehensive metrics */
                <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Demand: <strong className="text-slate-200">{Math.round(z.demand || 0)}</strong></span>
                    <span>Supply: <strong className="text-slate-200">{z.supply || 0}</strong></span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Pressure: <strong className={pressure > 1.3 ? 'text-amber-400' : 'text-slate-300'}>{pressure.toFixed(2)}</strong></span>
                    <span className={hasSurge ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {hasSurge ? `🔥 ${surge.toFixed(1)}x` : '1.0x Normal'}
                    </span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300">City Grid (12 Zones):</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500" /> Balanced
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> High Demand (Surge)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Severe Shortage
          </span>
        </div>
        <div className="text-slate-500 italic">
          Click any zone for deep intelligence
        </div>
      </div>
    </div>
  );
}
