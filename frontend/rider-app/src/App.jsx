import React, { useEffect, useState } from 'react';
import { useWorld } from 'shared/useWorld.js';
import { Navbar } from 'shared/components/Navbar.jsx';
import { CityMap } from 'shared/components/CityMap.jsx';
import { ZoneDetailCard } from 'shared/components/ZoneDetailCard.jsx';
import { ZONE_DETAILS, inr, BASE_FARE, SIM_SEC_PER_MIN } from 'shared/constants.js';
import { 
  CarIcon, 
  MapPinIcon, 
  ClockIcon, 
  FlameIcon, 
  ShieldIcon, 
  CheckCircleIcon, 
  SparklesIcon, 
  Spinner,
  Waiting 
} from 'shared/ui.jsx';

const DEFAULT_USER_ZONE = 6; // Central Station

export default function App() {
  const { world, conn, send, on } = useWorld();
  const [pickupZoneId, setPickupZoneId] = useState(DEFAULT_USER_ZONE);
  const [dropoffZoneId, setDropoffZoneId] = useState(3); // Tech Park
  const [selectedRideTier, setSelectedRideTier] = useState('uber_go');
  const [activeBooking, setActiveBooking] = useState(null);
  const [isBookingPending, setIsBookingPending] = useState(false);
  const [inspectZoneId, setInspectZoneId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Listen for booking replies from backend or in-browser sim
  useEffect(() => {
    return on((msg) => {
      if (msg.type === 'booking') {
        setActiveBooking({
          ...msg,
          bookedAt: Date.now(),
          driver: msg.driver || {
            name: 'Arjun Singh',
            vehicle: 'White Swift Dzire',
            plate: 'PB 36 AB 1420',
            rating: '4.92 ★'
          }
        });
        setIsBookingPending(false);
      }
    });
  }, [on]);

  // Tick timer for countdown when a ride is active
  useEffect(() => {
    if (!activeBooking) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [activeBooking]);

  // Timeout guard for pending booking requests
  useEffect(() => {
    if (!isBookingPending) return;
    const timer = setTimeout(() => setIsBookingPending(false), 5000);
    return () => clearTimeout(timer);
  }, [isBookingPending]);

  if (!world) {
    return <Waiting conn={conn} />;
  }

  const pickupZone = world.zones.find((z) => z.id === pickupZoneId) || world.zones[0];
  const dropoffZone = world.zones.find((z) => z.id === dropoffZoneId) || world.zones[1];
  const inspectZone = inspectZoneId ? world.zones.find((z) => z.id === inspectZoneId) : null;
  const surgingZones = world.zones.filter((z) => (z.surge || 1.0) > 1.0).sort((a, b) => b.surge - a.surge);

  // Time remaining calculation for active ride
  const elapsedSec = activeBooking ? (now - activeBooking.bookedAt) / 1000 : 0;
  const totalEtaMin = activeBooking ? (activeBooking.eta_min || 3) : 3;
  const totalDurationSec = totalEtaMin * SIM_SEC_PER_MIN;
  const remainingSec = Math.max(0, totalDurationSec - elapsedSec);
  const remainingMin = Math.ceil(remainingSec / SIM_SEC_PER_MIN);
  const rideProgressPct = Math.min(100, Math.round(((totalDurationSec - remainingSec) / totalDurationSec) * 100));
  const isDriverArrived = activeBooking && remainingSec <= 0;

  // Pricing calculations
  const surgeMultiplier = pickupZone.surge || 1.0;
  const hasSurge = surgeMultiplier > 1.0;
  
  const rideTiers = [
    {
      id: 'uber_go',
      name: 'UberGo',
      description: 'Affordable, compact sedans for quick daily trips',
      basePrice: BASE_FARE,
      icon: '🚗',
      seats: 4,
    },
    {
      id: 'uber_premier',
      name: 'Uber Premier',
      description: 'Top-rated drivers in comfortable, premium sedans',
      basePrice: Math.round(BASE_FARE * 1.5),
      icon: '✨',
      seats: 4,
    },
    {
      id: 'uber_xl',
      name: 'UberXL',
      description: 'Spacious 6-seater SUVs for groups and luggage',
      basePrice: Math.round(BASE_FARE * 2.0),
      icon: '🚐',
      seats: 6,
    },
  ];

  const currentTier = rideTiers.find((t) => t.id === selectedRideTier) || rideTiers[0];
  const estimatedFare = Math.round(currentTier.basePrice * surgeMultiplier);

  const handleBookRide = () => {
    setIsBookingPending(true);
    send({
      type: 'book',
      zone: pickupZoneId,
      tier: selectedRideTier,
      dropoffZone: dropoffZoneId,
    });
  };

  const handleCancelOrResetRide = () => {
    setActiveBooking(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Shared Navigation */}
      <Navbar 
        app="rider" 
        conn={conn} 
        city={world.city} 
        tick={world.tick}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Top Announcement / Surge Tracker Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 font-bold flex items-center gap-1">
              <FlameIcon className="w-3.5 h-3.5" /> City Surge Status
            </span>
            <span className="text-slate-400">
              {surgingZones.length === 0 
                ? 'All zones normal. Fares are at baseline (1.0x) citywide.' 
                : `${surgingZones.length} of 12 zones experiencing elevated demand:`
              }
            </span>
          </div>

          {surgingZones.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {surgingZones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => {
                    setPickupZoneId(z.id);
                    setInspectZoneId(z.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold transition flex items-center gap-1"
                >
                  <span>Z{z.id} {z.name}</span>
                  <span className="font-mono text-amber-400">{(z.surge || 1).toFixed(1)}x</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content: Map (Left) + Booking & Tracking (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: 12-Zone City Interactive Map (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-blue-400" />
                    Interactive City Map
                  </h2>
                  <p className="text-xs text-slate-400">
                    Click any zone to set your pickup location or inspect driver density and ETAs.
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold">
                  Pickup: Zone #{pickupZoneId} ({pickupZone.name})
                </div>
              </div>

              {/* City Map Component */}
              <CityMap
                zones={world.zones}
                mode="rider"
                selectedZone={pickupZoneId}
                onSelectZone={(id) => {
                  setPickupZoneId(id);
                  setInspectZoneId(id);
                }}
                userZone={DEFAULT_USER_ZONE}
              />
            </div>

            {/* Inspect Zone Detail if opened */}
            {inspectZone && (
              <ZoneDetailCard
                zone={inspectZone}
                onClose={() => setInspectZoneId(null)}
                onBookInZone={(id) => {
                  setPickupZoneId(id);
                  setInspectZoneId(null);
                }}
              />
            )}
          </div>

          {/* RIGHT: Booking Experience or Active Driver Tracking (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {!activeBooking ? (
              /* BOOKING FLOW */
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CarIcon className="w-5 h-5 text-blue-400" />
                    Request a Ride
                  </h2>
                  <p className="text-xs text-slate-400">
                    Transparent pricing backed by AI real-time dispatch
                  </p>
                </div>

                {/* Pickup and Dropoff Selection */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      📍 Pickup Location
                    </label>
                    <select
                      value={pickupZoneId}
                      onChange={(e) => setPickupZoneId(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:border-blue-500"
                    >
                      {ZONE_DETAILS.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.icon} Zone {z.id}: {z.name} ({z.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      🏁 Drop-off Destination
                    </label>
                    <select
                      value={dropoffZoneId}
                      onChange={(e) => setDropoffZoneId(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:border-blue-500"
                    >
                      {ZONE_DETAILS.map((z) => (
                        <option key={z.id} value={z.id} disabled={z.id === pickupZoneId}>
                          {z.icon} Zone {z.id}: {z.name} ({z.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ride Options (Tiers) */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400">
                    Choose Vehicle Option
                  </label>
                  <div className="space-y-2">
                    {rideTiers.map((tier) => {
                      const isSelected = selectedRideTier === tier.id;
                      const tierFare = Math.round(tier.basePrice * surgeMultiplier);
                      return (
                        <div
                          key={tier.id}
                          onClick={() => setSelectedRideTier(tier.id)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-600/10 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                              : 'bg-slate-800/40 border-slate-850 hover:bg-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{tier.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{tier.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                  👤 {tier.seats}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">{tier.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-base text-white">{inr(tierFare)}</span>
                            {hasSurge && (
                              <span className="text-[10px] text-amber-400 block font-semibold">
                                {surgeMultiplier.toFixed(1)}x Surge
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing Breakdown & Surge Explainer */}
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  hasSurge 
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' 
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300'
                }`}>
                  <div className="flex justify-between font-semibold">
                    <span>Base Fare ({currentTier.name}):</span>
                    <span>{inr(currentTier.basePrice)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Dynamic Surge Multiplier:</span>
                    <span className={hasSurge ? 'text-amber-400 font-extrabold' : 'text-slate-300'}>
                      {surgeMultiplier.toFixed(1)}x {hasSurge ? '(High Demand)' : '(Standard)'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/60 flex justify-between font-bold text-sm text-white">
                    <span>Total Fare:</span>
                    <span className="text-blue-400 text-base">{inr(estimatedFare)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                    {hasSurge
                      ? `⚡ Fares are temporarily higher in Zone ${pickupZone.id} (${pickupZone.name}) because passenger demand exceeds local driver supply. The AI Brain is already nudging nearby drivers here to bring fares back to normal.`
                      : '✅ Balanced demand. Normal fares apply with no surge.'}
                  </p>
                </div>

                {/* Book Ride Button */}
                <button
                  type="button"
                  onClick={handleBookRide}
                  disabled={isBookingPending}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-base shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isBookingPending ? (
                    <>
                      <Spinner /> Matching with Nearby Driver...
                    </>
                  ) : (
                    <>
                      Book {currentTier.name} for {inr(estimatedFare)}
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* ACTIVE TRIP TRACKING */
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isDriverArrived 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {isDriverArrived ? '🎉 Driver Has Arrived!' : '🚗 Driver Is En Route'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Booking #{activeBooking.id}
                  </span>
                </div>

                {/* Driver Profile Card */}
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-blue-500 flex items-center justify-center font-bold text-slate-950 text-base shadow">
                      {activeBooking.driver?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">
                        {activeBooking.driver?.name || 'Arjun Singh'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {activeBooking.driver?.vehicle || 'White Swift Dzire'}
                      </p>
                      <span className="text-[11px] text-amber-400 font-semibold">
                        {activeBooking.driver?.rating || '4.92 ★ (1,420 trips)'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-600 font-mono font-bold text-xs text-amber-400 block">
                      {activeBooking.driver?.plate || 'PB 36 AB 1420'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Verified Driver</span>
                  </div>
                </div>

                {/* Arrival Countdown & Progress Bar */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center space-y-3">
                  <div className="text-xs text-slate-400">Estimated Arrival Time</div>
                  <div className="text-4xl font-extrabold text-white flex items-center justify-center gap-2">
                    {isDriverArrived ? (
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <CheckCircleIcon className="w-8 h-8" /> At Pickup Location
                      </span>
                    ) : (
                      <>
                        <ClockIcon className="w-7 h-7 text-blue-400 animate-pulse" />
                        <span>{remainingMin} min</span>
                      </>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isDriverArrived ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`}
                      style={{ width: `${rideProgressPct}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Dispatched from nearby</span>
                    <span>Zone #{pickupZoneId} ({pickupZone.name})</span>
                  </div>
                </div>

                {/* Ride Summary Breakdown */}
                <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Pickup:</span>
                    <span className="text-white font-semibold">Zone #{pickupZoneId} ({pickupZone.name})</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Destination:</span>
                    <span className="text-white font-semibold">Zone #{dropoffZoneId} ({dropoffZone.name})</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Locked Fare:</span>
                    <span className="text-emerald-400 font-bold">{inr(activeBooking.fare || estimatedFare)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancelOrResetRide}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition"
                  >
                    {isDriverArrived ? 'Complete Trip & Finish' : 'Cancel Ride'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Safety PIN for driver: 4921. Driver is at Zone ${pickupZoneId}.`);
                    }}
                    className="px-4 py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <ShieldIcon className="w-4 h-4" /> Safety PIN
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
