import React from 'react';

export function MapMock({
  mode = 'rider', // 'rider' | 'heatmap' | 'route' | 'ontrip'
  showRoute = false,
  showCarOnRoute = false,
  etaTag = null,
  bubbleText = null,
  className = 'h-full w-full',
}) {
  return (
    <div className={`relative overflow-hidden bg-[#E9EFE9] ${className}`}>
      {/* SVG Map Background */}
      <svg className="w-full h-full" viewBox="0 0 390 320" preserveAspectRatio="none">
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
        </defs>

        {/* Base Map / Land */}
        <rect width="390" height="320" fill="#E6EDE6" />

        {/* Green Parks & Water */}
        <rect x="20" y="30" width="70" height="60" rx="10" fill="#CEE6D0" />
        <rect x="250" y="20" width="110" height="85" rx="14" fill="#CEE6D0" />
        <rect x="15" y="210" width="80" height="80" rx="12" fill="#CEE6D0" />
        <rect x="270" y="230" width="100" height="70" rx="10" fill="#CEE6D0" />

        {/* Streets Grid */}
        <line x1="0" y1="70" x2="390" y2="70" stroke="#FFFFFF" strokeWidth="14" />
        <line x1="0" y1="160" x2="390" y2="160" stroke="#FFFFFF" strokeWidth="18" />
        <line x1="0" y1="240" x2="390" y2="240" stroke="#FFFFFF" strokeWidth="12" />

        <line x1="105" y1="0" x2="105" y2="320" stroke="#FFFFFF" strokeWidth="14" />
        <line x1="230" y1="0" x2="230" y2="320" stroke="#FFFFFF" strokeWidth="16" />
        <line x1="330" y1="0" x2="330" y2="320" stroke="#FFFFFF" strokeWidth="10" />

        <line x1="0" y1="280" x2="320" y2="0" stroke="#FFFFFF" strokeWidth="8" />

        {/* ========================================================
            HEXAGONAL DEMAND HEATMAP (Driver App Screen 2)
           ======================================================== */}
        {mode === 'heatmap' && (
          <g transform="translate(195, 150)">
            {/* Outer Pale Hexagons (Yellow-Green) */}
            <g opacity="0.45">
              <polygon points="0,-100 86,-50 86,50 0,100 -86,50 -86,-50" fill="#A7F3D0" />
              <polygon points="0,-120 104,-60 104,60 0,120 -104,60 -104,-60" fill="#FDE68A" opacity="0.5" />
            </g>

            {/* Mid Layer Hexagons (Yellow / Orange gradient) */}
            <g opacity="0.65">
              <polygon points="0,-75 65,-37 65,37 0,75 -65,37 -65,-37" fill="#FBBF24" />
              <polygon points="70,0 120,-30 120,30 70,60 20,30 20,-30" fill="#FCD34D" opacity="0.6" />
              <polygon points="-70,0 -20,-30 -20,30 -70,60 -120,30 -120,-30" fill="#FCD34D" opacity="0.6" />
            </g>

            {/* Core Intense Surge Hexagons (Red / Orange) */}
            <g opacity="0.8">
              <polygon points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25" fill="#F97316" />
              <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="#EF4444" />
            </g>

            {/* Driver GPS Blue Arrow Indicator */}
            <g transform="rotate(25)">
              <circle cx="0" cy="0" r="16" fill="#3B82F6" opacity="0.25" />
              <path
                d="M 0 -14 L 9 10 L 0 5 L -9 10 Z"
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
              />
            </g>
          </g>
        )}

        {/* ========================================================
            RIDER HOME VIEW (Cars & User Location Dot)
           ======================================================== */}
        {mode === 'rider' && !showRoute && (
          <>
            {/* Ambient moving Uber cars */}
            <g transform="translate(65, 160)">
              <rect x="-8" y="-4" width="16" height="8" rx="2" fill="#111827" />
              <circle cx="-5" cy="4" r="1.5" fill="#6B7280" />
              <circle cx="5" cy="4" r="1.5" fill="#6B7280" />
            </g>
            <g transform="translate(190, 70)">
              <rect x="-8" y="-4" width="16" height="8" rx="2" fill="#111827" />
            </g>
            <g transform="translate(230, 240)">
              <rect x="-4" y="-8" width="8" height="16" rx="2" fill="#111827" />
            </g>
            <g transform="translate(310, 160)">
              <rect x="-8" y="-4" width="16" height="8" rx="2" fill="#111827" />
            </g>

            {/* Blue Current Location Dot */}
            <g transform="translate(195, 160)">
              <circle cx="0" cy="0" r="18" fill="#3B82F6" opacity="0.2" />
              <circle cx="0" cy="0" r="9" fill="#FFFFFF" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))" />
              <circle cx="0" cy="0" r="5.5" fill="#2563EB" />
            </g>
          </>
        )}

        {/* ========================================================
            ROUTE VIEW (Choose a ride, Live ride, On trip)
           ======================================================== */}
        {(showRoute || mode === 'route' || mode === 'ontrip') && (
          <>
            {/* Route path */}
            <path
              d="M 105 240 L 105 160 L 230 160 L 230 70 L 310 70"
              fill="none"
              stroke="#111827"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Green Pickup Circle */}
            <circle cx="105" cy="240" r="8" fill="#FFFFFF" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
            <circle cx="105" cy="240" r="5" fill="#10B981" />

            {/* Black / Red Destination Pin */}
            <g transform="translate(310, 70)">
              <circle cx="0" cy="0" r="8" fill="#FFFFFF" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
              <circle cx="0" cy="0" r="5" fill="#111827" />
            </g>

            {/* Car Moving along route */}
            {showCarOnRoute && (
              <g transform="translate(170, 160)">
                <rect x="-12" y="-6" width="24" height="12" rx="3" fill="#000000" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.35))" />
                <rect x="-8" y="-4" width="16" height="8" rx="1.5" fill="#3B82F6" opacity="0.8" />
              </g>
            )}
          </>
        )}
      </svg>

      {/* "2 min" Floating Route Tag (from Choose a ride image) */}
      {etaTag && (
        <div className="absolute top-[125px] left-[155px] z-10">
          <span className="bg-black text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-md">
            {etaTag}
          </span>
        </div>
      )}

      {/* "Arriving in 2 min" Top White Bubble (from Arriving Screen image) */}
      {bubbleText && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-white px-4 py-2 rounded-2xl shadow-lg border border-gray-100 text-center">
            <span className="text-xs font-extrabold text-black block">{bubbleText}</span>
          </div>
        </div>
      )}
    </div>
  );
}
