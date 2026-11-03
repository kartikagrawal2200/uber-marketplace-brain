import React, { useState, useEffect } from 'react';
import { useWorld } from 'shared/useWorld.js';
import { MapMock } from 'shared/components/MapMock.jsx';
import { SyntheticBadge } from 'shared/components/SyntheticBadge.jsx';
import { ZONE_DETAILS, BASE_FARE, inr, SIM_SEC_PER_MIN } from 'shared/constants.js';
import 'shared/uber-design.css';

export default function App() {
  const { world, conn, send, on } = useWorld();
  
  // Navigation: 'home' | 'book' | 'live' | 'completed' | 'history' | 'profile'
  const [screen, setScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'history' | 'profile'

  // Ride state
  const [selectedRide, setSelectedRide] = useState('UberGo');
  const [pickupZoneId, setPickupZoneId] = useState(6); // Central Station
  const [dropoffZoneId, setDropoffZoneId] = useState(3); // Tech Park
  const [activeBooking, setActiveBooking] = useState(null);
  const [remainingMin, setRemainingMin] = useState(3);
  const [rideStep, setRideStep] = useState(1); // 0 = Pickup, 1 = On the way, 2 = Arrived
  const [rideHistory, setRideHistory] = useState([
    { id: 1, date: 'Today, 1:20 PM', from: 'Central Station', to: 'Tech Park', price: '₹120', status: 'Completed' },
    { id: 2, date: 'Yesterday, 6:45 PM', from: 'Koramangala', to: 'Whitefield', price: '₹180', status: 'Completed' },
    { id: 3, date: 'Sep 5, 2025, 4:10 PM', from: 'BTM Layout', to: 'MG Road', price: '₹140', status: 'Completed' },
  ]);

  // Handle WebSocket booking events
  useEffect(() => {
    return on((msg) => {
      if (msg.type === 'booking') {
        setActiveBooking(msg);
        setRemainingMin(msg.eta_min || 3);
        setRideStep(1);
        setScreen('live');
      }
    });
  }, [on]);

  // Countdown timer when on live ride
  useEffect(() => {
    if (screen !== 'live') return;
    const interval = setInterval(() => {
      setRemainingMin((prev) => {
        if (prev <= 1) {
          setRideStep(2);
          clearInterval(interval);
          setTimeout(() => setScreen('completed'), 2000);
          return 0;
        }
        return prev - 1;
      });
    }, SIM_SEC_PER_MIN * 1000);
    return () => clearInterval(interval);
  }, [screen]);

  // Compute live price based on selected zone's surge
  const currentZone = world?.zones?.find((z) => z.id === pickupZoneId);
  const surge = currentZone?.surge || 1.0;

  const rideTypes = [
    { name: 'UberGo', tag: 'Affordable rides', basePrice: 120, img: '🚗' },
    { name: 'UberXL', tag: 'Spacious 6-seater', basePrice: 180, img: '🚐' },
    { name: 'UberPremium', tag: 'Comfort & top drivers', basePrice: 250, img: '✨' },
  ];

  const selectedRideInfo = rideTypes.find((r) => r.name === selectedRide) || rideTypes[0];
  const calculatedFare = Math.round(selectedRideInfo.basePrice * surge);

  const handleSelectRide = (rideName) => {
    setSelectedRide(rideName);
    setScreen('book');
  };

  const handleBookNow = () => {
    // Send booking to backend/sim
    send({ type: 'book', zone: pickupZoneId });
    setScreen('live');
    setRemainingMin(3);
    setRideStep(1);
  };

  const handleCompleteDone = () => {
    // Add to history
    setRideHistory((prev) => [
      {
        id: Date.now(),
        date: 'Just now',
        from: currentZone?.name || 'Central Station',
        to: 'Tech Park',
        price: `₹${calculatedFare}`,
        status: 'Completed',
      },
      ...prev,
    ]);
    setActiveBooking(null);
    setScreen('home');
    setActiveTab('home');
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'home') setScreen('home');
    else if (tab === 'history') setScreen('history');
    else if (tab === 'profile') setScreen('profile');
  };

  return (
    <div className="uber-mobile-frame relative">
      <SyntheticBadge />

      {/* ========================================================
          SCREEN 1: HOME PAGE
         ======================================================== */}
      {screen === 'home' && (
        <div className="flex-1 flex flex-col p-4 space-y-4">
          {/* Top Bar: Logo, Location dropdown, Profile icon */}
          <div className="flex items-center justify-between pt-1">
            <h1 className="text-2xl font-black tracking-tighter text-black">Uber</h1>
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <span className="text-blue-600">📍</span>
              <span>{currentZone ? `Zone ${currentZone.id}: ${currentZone.name}` : 'Your Location'}</span>
              <span className="text-gray-400 text-[10px]">▼</span>
            </div>
            <button 
              onClick={() => switchTab('profile')}
              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-700"
            >
              👤
            </button>
          </div>

          {/* Search Box: "Where to?" */}
          <div 
            onClick={() => setScreen('book')}
            className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm cursor-pointer hover:border-gray-400 transition"
          >
            <span className="text-gray-400 text-sm">🔍</span>
            <span className="text-sm font-semibold text-gray-500">Where to?</span>
          </div>

          {/* Map Area */}
          <div className="flex-1 min-h-[220px]">
            <MapMock showRoute={false} className="h-56 w-full" />
          </div>

          {/* Popular Rides Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Popular Rides</h2>
              <button onClick={() => setScreen('book')} className="text-xs font-semibold text-[#4B2FD0] hover:underline flex items-center gap-0.5">
                See all →
              </button>
            </div>

            {/* Row of 3 Ride Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {rideTypes.map((r) => {
                const fare = Math.round(r.basePrice * surge);
                const isSelected = selectedRide === r.name;
                return (
                  <button
                    key={r.name}
                    onClick={() => handleSelectRide(r.name)}
                    className={`p-3 rounded-2xl bg-white border text-center transition flex flex-col items-center justify-between ${
                      isSelected 
                        ? 'border-[#4B2FD0] ring-2 ring-[#4B2FD0]/20 shadow-sm' 
                        : 'border-gray-200/70 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl mb-1">{r.img}</span>
                    <span className="text-xs font-bold text-gray-900 block">{r.name}</span>
                    <span className="text-xs font-extrabold text-black mt-1">₹{fare}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SCREEN 2: BOOK A RIDE
         ======================================================== */}
      {screen === 'book' && (
        <div className="flex-1 flex flex-col relative">
          {/* Top Bar with back arrow */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <button
              onClick={() => setScreen('home')}
              className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-sm font-bold text-black pointer-events-auto border border-gray-100"
            >
              ←
            </button>
            <div className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-sm text-gray-700 pointer-events-auto border border-gray-100">
              🎯
            </div>
          </div>

          {/* Map with Blue Route Line */}
          <div className="h-64 w-full">
            <MapMock showRoute={true} showCarOnRoute={false} className="h-full w-full rounded-none" />
          </div>

          {/* Bottom Card */}
          <div className="flex-1 bg-white rounded-t-3xl -mt-4 shadow-xl p-5 flex flex-col justify-between space-y-4 z-10 border-t border-gray-100">
            {/* Selected Ride Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedRideInfo.img}</span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{selectedRideInfo.name}</h3>
                  <p className="text-xs text-gray-400">{selectedRideInfo.tag}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-black">₹{calculatedFare}</span>
                {surge > 1 && (
                  <span className="text-[10px] text-amber-600 font-bold block">{surge.toFixed(1)}x surge</span>
                )}
              </div>
            </div>

            {/* Pickup & Drop Rows */}
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                <div className="flex-1">
                  <span className="text-gray-400 block text-[10px] font-semibold">Pickup Location</span>
                  <span className="font-bold text-gray-900 text-xs">
                    {currentZone?.name || 'Your Current Location'} (Zone #{pickupZoneId})
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0" />
                <div className="flex-1">
                  <span className="text-gray-400 block text-[10px] font-semibold">Drop Location</span>
                  <span className="font-bold text-gray-900 text-xs">
                    MG Road, Bangalore (Zone #{dropoffZoneId})
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Row */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">💳</span>
                <span className="font-bold text-gray-800">•••• 4242</span>
              </div>
              <button className="text-[#4B2FD0] font-bold text-xs hover:underline">Change</button>
            </div>

            {/* Big Black Button */}
            <button
              onClick={handleBookNow}
              className="uber-btn-black"
            >
              Book Ride
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          SCREEN 3: LIVE RIDE
         ======================================================== */}
      {screen === 'live' && (
        <div className="flex-1 flex flex-col relative">
          {/* Top back button */}
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setScreen('home')}
              className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-sm font-bold text-black border border-gray-100"
            >
              ←
            </button>
          </div>

          {/* Map with Car on route */}
          <div className="h-64 w-full">
            <MapMock showRoute={true} showCarOnRoute={true} className="h-full w-full rounded-none" />
          </div>

          {/* Live Ride Card */}
          <div className="flex-1 bg-white rounded-t-3xl -mt-4 shadow-xl p-5 flex flex-col justify-between space-y-4 z-10 border-t border-gray-100">
            {/* Header: On the way! */}
            <div className="text-center pt-1">
              <h2 className="text-lg font-black text-gray-900">On the way!</h2>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">
                Arriving in {remainingMin} min (1.2 km)
              </p>
            </div>

            {/* Driver Profile Row */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                  👨‍✈️
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Rahul Kumar</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="text-amber-500 font-bold">★ 4.8</span>
                    <span>• White Swift • KA01AB1234</span>
                  </div>
                </div>
              </div>

              {/* Call Button */}
              <button 
                onClick={() => alert('Calling driver Rahul Kumar at +91 98765 43210...')}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-base hover:bg-gray-100 transition"
              >
                📞
              </button>
            </div>

            {/* 3-Step Progress: Pickup > On the way > Arrived */}
            <div className="space-y-1.5 px-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={rideStep >= 0 ? 'text-black' : 'text-gray-400'}>Pickup</span>
                <span className={rideStep >= 1 ? 'text-[#4B2FD0]' : 'text-gray-400'}>On the way</span>
                <span className={rideStep >= 2 ? 'text-emerald-600' : 'text-gray-400'}>Arrived</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-black transition-all" style={{ width: rideStep === 0 ? '33%' : rideStep === 1 ? '66%' : '100%' }} />
              </div>
            </div>

            {/* Cancel / Dev Fast Forward */}
            <button
              onClick={() => setScreen('completed')}
              className="text-xs text-gray-400 font-semibold text-center hover:text-black transition"
            >
              Simulate Instant Arrival →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          SCREEN 4: RIDE COMPLETED
         ======================================================== */}
      {screen === 'completed' && (
        <div className="flex-1 bg-white flex flex-col items-center justify-center p-6 text-center space-y-6">
          {/* Big Green Check Circle */}
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white text-4xl shadow-lg shadow-emerald-500/20 animate-bounce">
            ✓
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-900">Ride Completed!</h2>
            <p className="text-xs text-gray-400">Thank you for riding with Uber</p>
          </div>

          {/* Total Fare Card */}
          <div className="w-full max-w-xs p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-1">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Fare</span>
            <div className="text-3xl font-black text-black">₹{calculatedFare}</div>
            <span className="text-[10px] text-gray-400 block">Paid via Card •••• 4242</span>
          </div>

          {/* Black Done Button */}
          <div className="w-full max-w-xs pt-4">
            <button
              onClick={handleCompleteDone}
              className="uber-btn-black"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          SCREEN 5: RIDE HISTORY
         ======================================================== */}
      {screen === 'history' && (
        <div className="flex-1 p-4 space-y-4">
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <span>⏱️</span> Your Rides
            </h2>
            <span className="text-xs text-gray-400 font-semibold">{rideHistory.length} total</span>
          </div>

          <div className="space-y-2.5">
            {rideHistory.map((h) => (
              <div key={h.id} className="uber-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-xs font-bold text-gray-900">{h.date}</span>
                  </div>
                  <span className="text-sm font-black text-black">{h.price}</span>
                </div>
                <div className="text-xs text-gray-500 pl-4">
                  {h.from} → {h.to}
                </div>
                <div className="pl-4 pt-1">
                  <span className="uber-pill-green">Completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          BONUS SCREEN: PROFILE
         ======================================================== */}
      {screen === 'profile' && (
        <div className="flex-1 p-4 space-y-4">
          {/* Profile Header */}
          <div className="text-center py-4 space-y-2">
            <div className="w-16 h-16 rounded-full bg-gray-200 text-gray-700 font-bold text-2xl flex items-center justify-center mx-auto">
              👤
            </div>
            <h3 className="text-base font-bold text-gray-900">John Doe</h3>
            <p className="text-xs text-gray-400">john@example.com</p>
          </div>

          {/* Menu Items */}
          <div className="uber-card divide-y divide-gray-100 text-xs font-semibold text-gray-700">
            {[
              { label: 'My Rides', icon: '🚗', action: () => switchTab('history') },
              { label: 'Payment Methods', icon: '💳' },
              { label: 'Notifications', icon: '🔔' },
              { label: 'Help & Support', icon: '❓' },
              { label: 'Settings', icon: '⚙️' },
              { label: 'Log Out', icon: '🚪' },
            ].map((m, idx) => (
              <button
                key={idx}
                onClick={m.action}
                className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition text-left"
              >
                <span className="flex items-center gap-3">
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </span>
                <span className="text-gray-400">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          BOTTOM NAVIGATION BAR (on home, history, profile)
         ======================================================== */}
      {(screen === 'home' || screen === 'history' || screen === 'profile') && (
        <nav className="uber-bottom-nav">
          <button
            onClick={() => switchTab('home')}
            className={`uber-nav-item ${activeTab === 'home' ? 'active' : ''}`}
          >
            <span className="text-base">🏠</span>
            <span>Home</span>
          </button>
          <button
            onClick={() => switchTab('history')}
            className={`uber-nav-item ${activeTab === 'history' ? 'active' : ''}`}
          >
            <span className="text-base">⏱️</span>
            <span>Ride History</span>
          </button>
          <button
            onClick={() => switchTab('profile')}
            className={`uber-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <span className="text-base">👤</span>
            <span>Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
}
