import React, { useState } from 'react';
import { useWorld } from 'shared/useWorld.js';
import { SyntheticBadge } from 'shared/components/SyntheticBadge.jsx';
import { ZONE_DETAILS } from 'shared/constants.js';
import 'shared/uber-design.css';

export default function App() {
  const { world, conn, send } = useWorld();
  const [isCalling, setIsCalling] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);

  const { driver, recommendation: rec } = world || {};
  const isEnroute = driver?.status === 'enroute';
  const targetZoneId = driver?.target;
  const targetZone = targetZoneId ? ZONE_DETAILS.find((z) => z.id === targetZoneId) : null;

  // Positioning hint details from existing API/WebSocket
  const recZoneId = rec?.destination || rec?.zone || 7;
  const recZoneDetail = ZONE_DETAILS.find((z) => z.id === recZoneId) || { name: 'Stadium', icon: '🏟️' };
  const recDelta = rec?.demand_delta_pct || 180;
  const recSurge = rec?.surge || 2.2;

  const handleAcceptHint = () => {
    send({ type: 'accept_rec' });
  };

  const handleIgnoreHint = () => {
    send({ type: 'ignore_rec' });
  };

  return (
    <div className="uber-mobile-frame p-4 space-y-4">
      <SyntheticBadge />

      {/* Top Header Branding */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-black tracking-tighter text-black">Uber Driver</h1>
        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Online</span>
        </div>
      </div>

      {/* ========================================================
          DARK ACCEPTED HEADER CARD (matching collage "Driver View")
         ======================================================== */}
      <div className="bg-[#181D24] text-white rounded-3xl p-6 text-center space-y-3 shadow-lg">
        {/* Green checkmark circle */}
        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white text-2xl mx-auto shadow-md shadow-emerald-500/30">
          ✓
        </div>
        <h2 className="text-base font-bold text-white tracking-tight leading-snug">
          Your ride request has been accepted!
        </h2>
      </div>

      {/* ========================================================
          RIDER / DRIVER PROFILE CARD (matching collage)
         ======================================================== */}
      <div className="uber-card p-5 text-center space-y-4">
        {/* Photo Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-300 via-orange-400 to-indigo-600 p-0.5 mx-auto shadow-md">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-3xl">
            👨‍✈️
          </div>
        </div>

        {/* Name & Rating */}
        <div>
          <h3 className="text-lg font-extrabold text-gray-900">Rahul Kumar</h3>
          <p className="text-xs font-bold text-amber-500 mt-0.5">
            ★ 4.8 <span className="text-gray-400 font-normal">(1.2k rides)</span>
          </p>
        </div>

        {/* Car Details */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 py-2 px-3 rounded-xl border border-gray-100">
          <span className="text-base">🚗</span>
          <span>White Swift • KA01AB1234</span>
        </div>

        {/* Call & Message Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              setIsCalling(true);
              setTimeout(() => {
                alert('Connected call to passenger.');
                setIsCalling(false);
              }, 600);
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition border border-gray-200/70"
          >
            <span>📞</span>
            <span>{isCalling ? 'Calling...' : 'Call'}</span>
          </button>

          <button
            onClick={() => {
              const msg = prompt('Enter message for passenger:', 'I have arrived at the pickup spot.');
              if (msg) alert(`Message sent: "${msg}"`);
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition border border-gray-200/70"
          >
            <span>💬</span>
            <span>Message</span>
          </button>
        </div>

        {/* "Arriving in 3 min (1.2 km)" Purple Box */}
        <div className="p-3.5 rounded-2xl bg-[#EEECFB] border border-[#D9D3F9] text-center flex items-center justify-center gap-2">
          <span className="text-base text-[#4B2FD0]">📍</span>
          <span className="text-xs font-bold text-[#4B2FD0]">
            {isEnroute ? `En route to Zone #${targetZoneId} (${targetZone?.name})` : 'Arriving in 3 min (1.2 km)'}
          </span>
        </div>
      </div>

      {/* ========================================================
          POSITIONING HINT CARD (from existing API / WebSocket)
         ======================================================== */}
      <div className="uber-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#4B2FD0]">
            <span>⚡</span>
            <span>AI Demand Positioning</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
            {recSurge.toFixed(1)}x Surge
          </span>
        </div>

        {isEnroute ? (
          <div className="text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-900">
              Navigating to <strong>Zone #{targetZoneId} ({targetZone?.name})</strong>
            </p>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#4B2FD0] h-full w-2/3 animate-pulse" />
            </div>
            <p className="text-[11px] text-gray-400">Positioning in high demand zone to capture upcoming ride requests.</p>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <p className="font-semibold text-gray-800 leading-snug">
              Move to <strong>Zone #{recZoneId} ({recZoneDetail.name})</strong>, high demand (+{recDelta}%).
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAcceptHint}
                className="uber-btn-black py-2.5 text-xs"
              >
                Accept & Navigate
              </button>
              <button
                onClick={handleIgnoreHint}
                className="py-2.5 px-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition"
              >
                Stay Here
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
