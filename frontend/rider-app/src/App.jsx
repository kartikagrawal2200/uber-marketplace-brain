import React, { useState, useEffect } from 'react';
import { useWorld } from 'shared/useWorld.js';
import { MapMock } from 'shared/components/MapMock.jsx';
import { SyntheticBadge } from 'shared/components/SyntheticBadge.jsx';
import { BASE_FARE, inr, SIM_SEC_PER_MIN } from 'shared/constants.js';
import 'shared/uber-design.css';

export default function App() {
  const { world, send, on } = useWorld();

  // Screen flow: 'home' | 'choose' | 'booking' | 'arriving' | 'completed' | 'activity' | 'wallet' | 'profile'
  const [screen, setScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'activity' | 'wallet' | 'profile'

  // Ride choices
  const [selectedRide, setSelectedRide] = useState('Uber Go');
  const [rating, setRating] = useState(5);
  const [bookingProgress, setBookingProgress] = useState(65);

  const [tripHistory, setTripHistory] = useState([
    { id: 1, date: 'Today, 1:20 PM', from: 'Central Zone', to: 'Tech Park', price: '₹142', status: 'Completed' },
    { id: 2, date: 'Yesterday, 6:45 PM', from: 'Koramangala', to: 'Whitefield', price: '₹180', status: 'Completed' },
    { id: 3, date: 'Sep 5, 4:10 PM', from: 'BTM Layout', to: 'MG Road', price: '₹140', status: 'Completed' },
  ]);

  // Listen for backend booking confirm
  useEffect(() => {
    return on((msg) => {
      if (msg.type === 'booking') {
        setScreen('arriving');
      }
    });
  }, [on]);

  // Auto transition from booking -> arriving after 2.5s for realistic simulation
  useEffect(() => {
    if (screen === 'booking') {
      const t = setTimeout(() => {
        setScreen('arriving');
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // Dynamic pricing based on zone surge
  const centralZone = world?.zones?.find((z) => z.id === 6) || { surge: 1.25 };
  const surge = centralZone.surge || 1.25;

  const rideOptions = [
    { id: 'uber_go', name: 'Uber Go', capacity: 4, waitMin: 2, basePrice: 120, icon: '🚗' },
    { id: 'uber_comfort', name: 'Uber Comfort', capacity: 4, waitMin: 4, basePrice: 160, icon: '✨' },
    { id: 'uber_xl', name: 'Uber XL', capacity: 6, waitMin: 6, basePrice: 220, icon: '🚐' },
  ];

  const currentOption = rideOptions.find((r) => r.name === selectedRide) || rideOptions[0];
  const finalPrice = Math.round(currentOption.basePrice * (surge > 1 ? surge : 1.0));

  const handleStartBooking = () => {
    send({ type: 'book', zone: 6 });
    setScreen('booking');
  };

  const handleDoneTrip = () => {
    setTripHistory((prev) => [
      {
        id: Date.now(),
        date: 'Just now',
        from: 'Central Zone',
        to: 'Tech Park',
        price: `₹${finalPrice}`,
        status: 'Completed',
      },
      ...prev,
    ]);
    setScreen('home');
    setActiveTab('home');
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === 'home') setScreen('home');
    else if (tab === 'activity') setScreen('activity');
    else if (tab === 'wallet') setScreen('wallet');
    else if (tab === 'profile') setScreen('profile');
  };

  return (
    <div className="uber-phone-container">
      <SyntheticBadge />

      {/* iOS Top Status Bar (9:41, Cellular, Wifi, Battery) */}
      <div className="uber-status-bar">
        <span>9:41</span>
        <div className="flex items-center gap-1.5 text-xs">
          <span>📶</span>
          <span>⚡</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Screen Viewport */}
      <div className="uber-screen-content">

        {/* ========================================================
            SCREEN 1: HOME PAGE (matching reference image)
           ======================================================== */}
        {screen === 'home' && (
          <div className="flex-1 flex flex-col relative bg-[#F6F6FB]">
            {/* Top Bar: Hamburger ☰, Search Pill, Camera 📷 */}
            <div className="px-4 py-2 flex items-center justify-between gap-3 z-20">
              <button 
                type="button" 
                onClick={() => handleTabClick('profile')}
                className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-lg text-black border border-gray-100"
              >
                ☰
              </button>

              <button 
                type="button"
                onClick={() => setScreen('choose')}
                className="flex-1 flex items-center justify-between bg-white px-4 py-2.5 rounded-full shadow-md border border-gray-100 text-xs font-semibold text-gray-500 cursor-pointer hover:border-gray-300 transition"
              >
                <span>Where to?</span>
                <span className="text-black font-bold">→</span>
              </button>

              <button 
                type="button"
                onClick={() => alert('Camera scanner ready.')}
                className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-base text-black border border-gray-100"
              >
                📷
              </button>
            </div>

            {/* Map Area with Dotted Cars and User Dot */}
            <div className="flex-1 w-full min-h-[360px]">
              <MapMock mode="rider" className="h-full w-full" />
            </div>

            {/* Bottom Floating Surge Pricing Card */}
            <div className="p-4 z-20">
              <button
                type="button"
                onClick={() => setScreen('choose')}
                className="w-full text-left bg-white p-4 rounded-2xl shadow-lg border border-amber-100 flex items-center gap-3.5 hover:shadow-xl transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl shrink-0">
                  ⚡
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900">Surge Pricing +25%</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">High demand in Central Zone</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 2: CHOOSE A RIDE (matching reference image)
           ======================================================== */}
        {screen === 'choose' && (
          <div className="flex-1 flex flex-col relative bg-[#F6F6FB]">
            {/* Top Back & Pin Bar */}
            <div className="absolute top-2 left-4 right-4 z-20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setScreen('home')}
                className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-sm font-bold text-black border border-gray-100"
              >
                ←
              </button>
              <div className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-sm text-black border border-gray-100">
                📍
              </div>
            </div>

            {/* Map with Route & "2 min" Badge */}
            <div className="h-56 w-full">
              <MapMock mode="route" etaTag="2 min" className="h-full w-full" />
            </div>

            {/* Bottom Card: Choose a ride */}
            <div className="flex-1 bg-white rounded-t-3xl -mt-4 shadow-xl p-5 flex flex-col justify-between space-y-4 z-10 border-t border-gray-100">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-gray-900">Choose a ride</h3>
                  <span className="text-gray-400 text-xs">→</span>
                </div>

                {/* Ride Cards List */}
                <div className="space-y-2">
                  {rideOptions.map((opt) => {
                    const isSelected = selectedRide === opt.name;
                    const price = Math.round(opt.basePrice * (surge > 1 ? surge : 1.0));
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedRide(opt.name)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{opt.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-gray-900">{opt.name}</span>
                              <span className="text-[10px] text-gray-400">👤 {opt.capacity}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 block">{opt.waitMin} min away</span>
                          </div>
                        </div>
                        <span className="text-sm font-extrabold text-black">₹{price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confirm Ride Black Button */}
              <button
                type="button"
                onClick={handleStartBooking}
                className="uber-btn-black cursor-pointer"
              >
                Confirm Ride
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 3: BOOKING... (Finding your driver...)
           ======================================================== */}
        {screen === 'booking' && (
          <div className="flex-1 bg-white flex flex-col justify-between p-6 text-center space-y-4">
            {/* Header */}
            <div className="pt-2">
              <h2 className="text-sm font-extrabold text-gray-900">Booking...</h2>
            </div>

            {/* Circular Speedometer Progress Arc with Car Graphic */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#F3F4F6" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeDasharray="264"
                  strokeDashoffset="80"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-4xl">
                🚗
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">Finding your driver...</h3>
              <p className="text-xs text-gray-400">This might take a moment</p>
            </div>

            {/* City Skyline Silhouette */}
            <div className="w-full h-12 opacity-15 flex items-end justify-center gap-1.5 px-4">
              <div className="w-4 h-8 bg-black rounded-t-sm" />
              <div className="w-6 h-12 bg-black rounded-t-sm" />
              <div className="w-5 h-7 bg-black rounded-t-sm" />
              <div className="w-7 h-10 bg-black rounded-t-sm" />
              <div className="w-4 h-6 bg-black rounded-t-sm" />
              <div className="w-6 h-11 bg-black rounded-t-sm" />
            </div>

            {/* Driver Match Card */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 flex items-center justify-center text-base text-white font-bold">
                  👨‍✈️
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Rohit Singh</h4>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <span className="text-amber-500 font-bold">★ 4.9</span>
                    <span>• Honda City - DL 8C 7321</span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-400">⚡</span>
            </div>

            {/* Call, Message, Share Buttons */}
            <div className="flex items-center justify-around text-xs font-semibold text-gray-700 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => alert('Calling Rohit Singh...')} className="flex flex-col items-center gap-1">
                <span className="text-base">📞</span>
                <span className="text-[10px]">Call</span>
              </button>
              <button type="button" onClick={() => alert('Message driver...')} className="flex flex-col items-center gap-1">
                <span className="text-base">💬</span>
                <span className="text-[10px]">Message</span>
              </button>
              <button type="button" onClick={() => alert('Trip link shared!')} className="flex flex-col items-center gap-1">
                <span className="text-base">↗</span>
                <span className="text-[10px]">Share</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 4: ARRIVING IN 2 MIN (matching reference image)
           ======================================================== */}
        {screen === 'arriving' && (
          <div className="flex-1 flex flex-col relative bg-[#F6F6FB]">
            {/* Top Back Bar */}
            <div className="absolute top-2 left-4 z-20">
              <button
                type="button"
                onClick={() => setScreen('home')}
                className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-sm font-bold text-black border border-gray-100"
              >
                ←
              </button>
            </div>

            {/* Map with "Arriving in 2 min" Top White Bubble */}
            <div className="flex-1 w-full min-h-[300px]">
              <MapMock 
                mode="route" 
                showCarOnRoute={true} 
                bubbleText="Arriving in 2 min" 
                className="h-full w-full" 
              />
            </div>

            {/* Bottom Driver Card & View Details Button */}
            <div className="bg-white rounded-t-3xl -mt-4 shadow-xl p-5 space-y-4 z-10 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 flex items-center justify-center text-base text-white font-bold">
                    👨‍✈️
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">Your driver is here!</h3>
                    <p className="text-[11px] text-gray-500">Rohit Singh • 4.9 ★</p>
                    <p className="text-[10px] text-gray-400">Honda City - DL 8C 7321</p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => alert('Calling Rohit Singh...')}
                  className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-sm shadow-sm"
                >
                  📞
                </button>
              </div>

              {/* View Details Black Button (advances to completed) */}
              <button
                type="button"
                onClick={() => setScreen('completed')}
                className="uber-btn-black cursor-pointer"
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 5: RIDE COMPLETED! (matching reference image)
           ======================================================== */}
        {screen === 'completed' && (
          <div className="flex-1 bg-white flex flex-col justify-between p-6 text-center space-y-4">
            <div className="pt-4 space-y-3">
              {/* Green Checkmark Circle */}
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white text-3xl font-bold flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
                ✓
              </div>

              <h2 className="text-lg font-black text-gray-900">Ride Completed!</h2>
              <div className="text-3xl font-black text-black">₹{finalPrice}</div>
            </div>

            {/* Distance & Time Box */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-2">
              <div className="flex justify-between text-gray-500">
                <span>Trip Distance</span>
                <span className="font-bold text-gray-900">8.2 km</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Trip Time</span>
                <span className="font-bold text-gray-900">14 min</span>
              </div>
            </div>

            {/* Rate your driver */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-700">Rate your driver</span>
              <div className="flex justify-center gap-2 text-2xl text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    {star <= rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Done Black Button */}
            <button
              type="button"
              onClick={handleDoneTrip}
              className="uber-btn-black cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {/* ========================================================
            SCREEN 6: WALLET (matching reference image)
           ======================================================== */}
        {screen === 'wallet' && (
          <div className="flex-1 bg-white p-5 space-y-6">
            <h2 className="text-base font-extrabold text-gray-900 pt-1">Wallet</h2>

            {/* Balance Card */}
            <div className="space-y-2">
              <div className="text-3xl font-black text-black">₹842.50</div>
              <button 
                type="button"
                onClick={() => alert('Payment gateway opened')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 transition cursor-pointer"
              >
                <span>→</span>
                <span>Add Money</span>
              </button>
            </div>

            {/* Menu List */}
            <div className="divide-y divide-gray-100 text-xs font-bold text-gray-800 pt-2">
              {[
                { label: 'Ride History', icon: '⏱️', action: () => handleTabClick('activity') },
                { label: 'Payment Methods', icon: '💳', action: () => alert('Visa •••• 4242') },
                { label: 'Promotions', icon: '🎁', badge: '3', action: () => alert('Promo 25% applied') },
                { label: 'Help', icon: '❓', action: () => alert('Support: 24/7 in-app chat') },
              ].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={item.action}
                  className="w-full py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-gray-50 px-1 rounded-lg"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                    <span className="text-gray-400">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 7: ACTIVITY (Ride History)
           ======================================================== */}
        {screen === 'activity' && (
          <div className="flex-1 bg-white p-5 space-y-4">
            <h2 className="text-base font-extrabold text-gray-900 pt-1">Activity</h2>

            <div className="space-y-3">
              {tripHistory.map((trip) => (
                <div key={trip.id} className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-900">{trip.date}</span>
                    <span className="font-extrabold text-black">{trip.price}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">{trip.from} → {trip.to}</p>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {trip.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 8: PROFILE
           ======================================================== */}
        {screen === 'profile' && (
          <div className="flex-1 bg-white p-5 space-y-4">
            <div className="flex items-center gap-3 pt-2">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                👤
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Kartik Agrawal</h3>
                <p className="text-xs text-gray-400">kartik@uber.com</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 text-xs font-bold text-gray-800 pt-4">
              {[
                { label: 'Messages', icon: '💬' },
                { label: 'Settings', icon: '⚙️' },
                { label: 'Legal & Privacy', icon: '📜' },
                { label: 'Sign Out', icon: '🚪', action: () => handleTabClick('home') },
              ].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={item.action}
                  className="w-full py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-gray-50 px-1 rounded-lg"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <span className="text-gray-400">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================
          BOTTOM 4-TAB NAVIGATION BAR (Home, Activity, Wallet, Profile)
         ======================================================== */}
      <nav className="uber-tab-bar">
        <button
          type="button"
          onClick={() => handleTabClick('home')}
          className={`uber-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
        >
          <span className="text-base">🏠</span>
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('activity')}
          className={`uber-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
        >
          <span className="text-base">📄</span>
          <span>Activity</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('wallet')}
          className={`uber-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
        >
          <span className="text-base">💳</span>
          <span>Wallet</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('profile')}
          className={`uber-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <span className="text-base">👤</span>
          <span>Profile</span>
        </button>
      </nav>

      {/* iOS Home Indicator */}
      <div className="uber-home-indicator" />
    </div>
  );
}
