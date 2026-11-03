import React from 'react';

export function MapMock({
  showRoute = false,
  showCarOnRoute = false,
  pickupText = 'Your Location',
  dropText = 'Destination',
  className = 'h-52 w-full',
}) {
  return (
    <div className={`relative overflow-hidden bg-[#E5ECE9] rounded-2xl ${className}`}>
      {/* City Street Grid & Green Parks */}
      <svg className="w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="none">
        <defs>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2F66EE" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>

        {/* Base Map / Land */}
        <rect width="400" height="240" fill="#E6EDE8" />

        {/* Green Parks */}
        <rect x="20" y="20" width="80" height="60" rx="8" fill="#CDE5D2" />
        <rect x="260" y="40" width="100" height="70" rx="10" fill="#CDE5D2" />
        <rect x="140" y="150" width="70" height="65" rx="6" fill="#CDE5D2" />

        {/* Streets Grid */}
        {/* Horizontal roads */}
        <line x1="0" y1="50" x2="400" y2="50" stroke="#FFFFFF" strokeWidth="12" />
        <line x1="0" y1="120" x2="400" y2="120" stroke="#FFFFFF" strokeWidth="16" />
        <line x1="0" y1="180" x2="400" y2="180" stroke="#FFFFFF" strokeWidth="10" />

        {/* Vertical & Diagonal roads */}
        <line x1="110" y1="0" x2="110" y2="240" stroke="#FFFFFF" strokeWidth="12" />
        <line x1="240" y1="0" x2="240" y2="240" stroke="#FFFFFF" strokeWidth="14" />
        <line x1="330" y1="0" x2="330" y2="240" stroke="#FFFFFF" strokeWidth="8" />
        <line x1="0" y1="210" x2="300" y2="0" stroke="#FFFFFF" strokeWidth="7" />

        {/* Thin road markings */}
        <line x1="0" y1="120" x2="400" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="6 6" />

        {/* Dotted Uber cars in neighborhood when not showing route */}
        {!showRoute && (
          <>
            <g transform="translate(180, 50)">
              <rect x="-8" y="-4" width="16" height="8" rx="2" fill="#111827" />
              <circle cx="-5" cy="4" r="1.5" fill="#4B5563" />
              <circle cx="5" cy="4" r="1.5" fill="#4B5563" />
            </g>
            <g transform="translate(240, 160)">
              <rect x="-4" y="-8" width="8" height="16" rx="2" fill="#111827" />
            </g>
            <g transform="translate(300, 120)">
              <rect x="-8" y="-4" width="16" height="8" rx="2" fill="#111827" />
            </g>
            <g transform="translate(80, 180)">
              <rect x="-8" y="-4" width="16" height="8" rx="2" fill="#111827" />
            </g>
          </>
        )}

        {/* Blue Navigation Route Line */}
        {showRoute && (
          <>
            {/* Route path */}
            <path
              d="M 110 180 L 110 120 L 240 120 L 240 50 L 310 50"
              fill="none"
              stroke="#2563EB"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Pickup Marker (Blue circle with white ring) */}
            <circle cx="110" cy="180" r="10" fill="#FFFFFF" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.2))" />
            <circle cx="110" cy="180" r="6" fill="#2563EB" />

            {/* Drop Marker (Red location pin) */}
            <g transform="translate(310, 50)">
              <path
                d="M 0 0 C -6 -6 -9 -11 -9 -16 C -9 -21 -4 -25 0 -25 C 4 -25 9 -21 9 -16 C 9 -11 6 -6 0 0 Z"
                fill="#EF4444"
                filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.25))"
              />
              <circle cx="0" cy="-16" r="3" fill="#FFFFFF" />
            </g>

            {/* Car on Route */}
            {showCarOnRoute && (
              <g transform="translate(175, 120)">
                <rect x="-10" y="-5" width="20" height="10" rx="3" fill="#000000" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))" />
                <rect x="-6" y="-3" width="12" height="6" rx="1" fill="#3B82F6" opacity="0.8" />
              </g>
            )}
          </>
        )}

        {/* Center blue location pulse for home map */}
        {!showRoute && (
          <g transform="translate(195, 120)">
            <circle cx="0" cy="0" r="16" fill="#3B82F6" opacity="0.2" />
            <circle cx="0" cy="0" r="9" fill="#FFFFFF" filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.2))" />
            <circle cx="0" cy="0" r="5" fill="#2563EB" />
          </g>
        )}
      </svg>
    </div>
  );
}
