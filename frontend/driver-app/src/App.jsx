import React, { useState, useEffect, useRef } from 'react';
import { useWorld } from 'shared/useWorld.js';
import { MapMock } from 'shared/components/MapMock.jsx';
import { SyntheticBadge } from 'shared/components/SyntheticBadge.jsx';
import { inr } from 'shared/constants.js';
import 'shared/uber-design.css';

export default function App() {
  const { world, send, on } = useWorld();

  // Screen flow: 'home' | 'heatmap' | 'ontrip' | 'earnings' | 'assistant' | 'profile'
  const [screen, setScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'trips' | 'earnings' | 'assistant' | 'profile'
  const [isOnline, setIsOnline] = useState(true);

  // AI Assistant Chat state (guiding the driver)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi Amit! I am your AI Dispatch Assistant. I can guide you to high-demand zones, predict surge spikes, or analyze your earnings today.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatBottomRef = useRef(null);

  // Listen for real backend AI chat replies
  useEffect(() => {
    return on((msg) => {
      if (msg.type === 'chat_reply') {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `reply-${Date.now()}`,
            role: 'assistant',
            text: msg.text,
          },
        ]);
        setIsBotTyping(false);
      }
    });
  }, [on]);

  useEffect(() => {
    if (screen === 'assistant' && chatBottomRef.current) {
      chatBottomRef.current.scrollTop = chatBottomRef.current.scrollHeight;
    }
  }, [chatMessages, isBotTyping, screen]);

  // Handle AI Guidance queries
  const handleAskAI = (question) => {
    const q = question || chatInput;
    if (!q.trim() || isBotTyping) return;

    setChatMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: q.trim() },
    ]);
    setIsBotTyping(true);
    setChatInput('');

    // Send through WebSocket to backend/sim
    send({
      type: 'chat',
      id: 'driver-042',
      text: q.trim(),
    });

    // Fallback local smart response if backend doesn't answer within 800ms
    setTimeout(() => {
      setIsBotTyping((typing) => {
        if (!typing) return false;
        let response = '';
        const lower = q.toLowerCase();
        if (lower.includes('zone') || lower.includes('best') || lower.includes('where')) {
          response = '📍 Recommended move: Head towards Central Zone (Zone 6) & Stadium (Zone 7). A concert is ending, causing a +180% surge with 2.2x fares. You can earn an extra ₹350 per trip!';
        } else if (lower.includes('earn') || lower.includes('money') || lower.includes('summary')) {
          response = '💰 Today you have earned ₹2,850 across 24 trips (8.5 hrs online, avg ₹335/trip). You also qualified for a ₹150 surge bonus!';
        } else if (lower.includes('nav') || lower.includes('traffic') || lower.includes('route')) {
          response = '🗺️ Route tip: Traffic is moderate along MG Road. Use Outer Ring Road to reach Tech Park 6 minutes faster.';
        } else {
          response = '✅ I am monitoring real-time passenger demand across all 12 city zones. Currently Central Zone has the highest demand gap.';
        }
        setChatMessages((prev) => [
          ...prev,
          { id: `reply-${Date.now()}`, role: 'assistant', text: response },
        ]);
        return false;
      });
    }, 900);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === 'home') setScreen('home');
    else if (tab === 'trips') setScreen('heatmap');
    else if (tab === 'earnings') setScreen('earnings');
    else if (tab === 'assistant') setScreen('assistant');
    else if (tab === 'profile') setScreen('profile');
  };

  const weeklyEarnings = [
    { day: 'Mon', val: 40 },
    { day: 'Tue', val: 65 },
    { day: 'Wed', val: 50 },
    { day: 'Thu', val: 75 },
    { day: 'Fri', val: 90 },
    { day: 'Sat', val: 85 },
    { day: 'Sun', val: 100, active: true },
  ];

  return (
    <div className="uber-phone-container">
      <SyntheticBadge />

      {/* iOS Top Status Bar (9:41, Cellular, Wifi, Battery) */}
      <div className={`uber-status-bar ${screen === 'home' || screen === 'assistant' ? 'dark-status bg-[#111622]' : ''}`}>
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
            SCREEN 1: DRIVER HOME (You're all set! - matching collage)
           ======================================================== */}
        {screen === 'home' && (
          <div className="flex-1 flex flex-col justify-between bg-[#111622] text-white p-6">
            {/* Top Bar: "Uber Driver" & Bell 🔔 */}
            <div className="flex items-center justify-between pt-1">
              <h2 className="text-base font-extrabold text-white tracking-tight">Uber Driver</h2>
              <button 
                type="button" 
                onClick={() => alert('No new driver alerts')}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm"
              >
                🔔
              </button>
            </div>

            {/* Online Toggle Pill */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setScreen('heatmap')}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <span>Online</span>
                <span>›</span>
              </button>
            </div>

            {/* City Skyline Illustration & "You're all set!" */}
            <div className="text-center space-y-4 my-auto">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white">You're all set!</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Start receiving ride requests in your area.
                </p>
              </div>

              {/* Skyline silhouette */}
              <div className="w-full h-24 opacity-25 flex items-end justify-center gap-1.5 pt-4">
                <div className="w-4 h-12 bg-white rounded-t-sm" />
                <div className="w-6 h-18 bg-white rounded-t-sm" />
                <div className="w-5 h-10 bg-white rounded-t-sm" />
                <div className="w-7 h-24 bg-white rounded-t-sm" />
                <div className="w-4 h-14 bg-white rounded-t-sm" />
                <div className="w-8 h-20 bg-white rounded-t-sm" />
                <div className="w-5 h-16 bg-white rounded-t-sm" />
              </div>
            </div>

            {/* Bottom Actions: View Heatmap OR Go Offline */}
            <div className="space-y-3 pt-4">
              <button
                type="button"
                onClick={() => setScreen('heatmap')}
                className="uber-btn-black bg-white text-black hover:bg-gray-100 cursor-pointer"
              >
                View Demand Heatmap & Moves
              </button>
              <button
                type="button"
                onClick={() => alert('Driver went offline')}
                className="w-full text-center text-xs font-semibold text-gray-400 py-2 hover:text-white transition"
              >
                Go Offline
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 2: HEXAGONAL DEMAND HEATMAP (matching collage)
           ======================================================== */}
        {screen === 'heatmap' && (
          <div className="flex-1 flex flex-col relative bg-[#F6F6FB]">
            {/* Top Orange Banner: "⚡ High Demand Zone · +40% rides" */}
            <div className="absolute top-3 left-4 right-4 z-20 flex justify-center">
              <div className="bg-[#FEF3C7] border border-amber-300 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                <span className="text-amber-600 text-sm">⚡</span>
                <span className="text-xs font-black text-amber-900">
                  High Demand Zone · +40% rides
                </span>
              </div>
            </div>

            {/* Hexagonal Heatmap SVG with Blue GPS Arrow */}
            <div className="flex-1 w-full min-h-[380px]">
              <MapMock mode="heatmap" className="h-full w-full" />
            </div>

            {/* Bottom Recommendation Card: "Recommended Area: Central Zone" */}
            <div className="bg-white rounded-t-3xl -mt-6 shadow-xl p-5 space-y-4 z-10 border-t border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                    🎯
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">
                      Recommended Area
                    </span>
                    <h4 className="text-sm font-extrabold text-gray-900">Central Zone</h4>
                    <p className="text-[11px] text-gray-500">Move here for more rides</p>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">→</span>
              </div>

              {/* Navigate Black Button */}
              <button
                type="button"
                onClick={() => {
                  send({ type: 'accept_rec' });
                  setScreen('ontrip');
                }}
                className="uber-btn-black cursor-pointer"
              >
                Navigate
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 3: ON TRIP (matching collage)
           ======================================================== */}
        {screen === 'ontrip' && (
          <div className="flex-1 flex flex-col relative bg-[#F6F6FB]">
            {/* Top Back & "🟢 On Trip" Pill */}
            <div className="absolute top-2 left-4 right-4 z-20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setScreen('heatmap')}
                className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-sm font-bold text-black border border-gray-100"
              >
                ←
              </button>
              <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>On Trip</span>
              </div>
            </div>

            {/* Map with Route to Destination */}
            <div className="flex-1 w-full min-h-[300px]">
              <MapMock mode="ontrip" className="h-full w-full" />
            </div>

            {/* Bottom Card: Drop off in 6 min, Passenger details */}
            <div className="bg-white rounded-t-3xl -mt-6 shadow-xl p-5 space-y-4 z-10 border-t border-gray-100">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold">Drop off in</span>
                  <span className="text-xl font-black text-black">6 min</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-gray-900">3.8 km</span>
                  <span className="text-[10px] text-gray-400 block">Remaining</span>
                </div>
              </div>

              {/* Passenger Card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    👩
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Priya Sharma</h4>
                    <p className="text-[11px] text-gray-500">4.9 ★</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => alert('Calling Priya Sharma...')}
                    className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 transition"
                  >
                    📞 Call
                  </button>
                  <button 
                    type="button"
                    onClick={() => alert('Message passenger...')}
                    className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 transition"
                  >
                    💬 Message
                  </button>
                </div>
              </div>

              {/* End Trip Black Button */}
              <button
                type="button"
                onClick={() => setScreen('earnings')}
                className="uber-btn-black cursor-pointer"
              >
                End Trip
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 4: EARNINGS (matching collage)
           ======================================================== */}
        {screen === 'earnings' && (
          <div className="flex-1 bg-white p-5 space-y-4 overflow-y-auto">
            {/* Header: "Earnings" & Bell 🔔 */}
            <div className="flex items-center justify-between pt-1">
              <h2 className="text-base font-extrabold text-gray-900">Earnings</h2>
              <button 
                type="button"
                onClick={() => alert('Earnings statement sent to email')}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm"
              >
                🔔
              </button>
            </div>

            {/* Total Balance */}
            <div className="space-y-0.5">
              <div className="text-3xl font-black text-black">₹2,850</div>
              <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <span>▲ +12% vs last week</span>
              </div>
            </div>

            {/* Weekly Bar Chart (Mon-Sun with Green Bars) */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="h-28 flex items-end justify-between gap-2 px-2 pt-2">
                {weeklyEarnings.map((b) => (
                  <div key={b.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div
                      className={`w-full rounded-md transition-all ${
                        b.active ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-gray-300'
                      }`}
                      style={{ height: `${b.val}%` }}
                    />
                    <span className={`text-[10px] font-semibold ${b.active ? 'text-black font-bold' : 'text-gray-400'}`}>
                      {b.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Row: 24 Trips, 8.5 hrs Online, ₹335 Avg/Trip */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-lg font-black text-black block">24</span>
                <span className="text-[10px] text-gray-400 font-semibold">Trips</span>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-lg font-black text-black block">8.5 hrs</span>
                <span className="text-[10px] text-gray-400 font-semibold">Online</span>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-lg font-black text-black block">₹335</span>
                <span className="text-[10px] text-gray-400 font-semibold">Avg/Trip</span>
              </div>
            </div>

            {/* Surge Bonus Card */}
            <div className="p-3.5 rounded-2xl bg-[#FEF3C7]/40 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-amber-500 text-base">⚡</span>
                <span className="text-xs font-bold text-gray-900">Surge Bonus</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
                +₹150
              </span>
            </div>

            {/* View Details Black Button */}
            <button
              type="button"
              onClick={() => alert('Full detailed weekly breakdown loaded.')}
              className="uber-btn-black cursor-pointer"
            >
              View Details
            </button>
          </div>
        )}

        {/* ========================================================
            SCREEN 5: 🤖 ASK AI ASSISTANT (Matching Screen 5 of Collage)
            Guiding the driver to high demand & optimal earnings!
           ======================================================== */}
        {screen === 'assistant' && (
          <div className="flex-1 bg-[#111622] text-white flex flex-col justify-between p-5">
            {/* Top Bar: "🤖 Ask AI Assistant" and ✕ Close */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Ask AI Assistant
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setScreen('home')}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Mascot & Chat History Area */}
            <div 
              ref={chatBottomRef}
              className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[460px] scrollbar-none"
            >
              {/* Cute AI Robot Mascot Graphic in Glowing Ring */}
              <div className="text-center space-y-2 pt-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-500 p-1 mx-auto shadow-xl shadow-indigo-500/30">
                  <div className="w-full h-full rounded-full bg-[#181D2A] flex items-center justify-center text-3xl">
                    🤖
                  </div>
                </div>
                <h4 className="text-sm font-extrabold text-white">How can I help you today?</h4>
              </div>

              {/* Quick Prompt Chips (from collage) */}
              <div className="space-y-2 pt-1 max-w-xs mx-auto">
                {[
                  'Best zones for today',
                  'My earnings summary',
                  'Navigation tips',
                  'Onboarding help',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleAskAI(chip)}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 transition text-center cursor-pointer block"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Message History */}
              <div className="space-y-3 pt-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isBotTyping && (
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 p-2 bg-white/5 rounded-xl w-36">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[10px]">Analyzing city...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Message Input Box with Send Button ➤ */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAI();
              }}
              className="flex items-center gap-2 pt-3 border-t border-gray-800"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/10 border border-white/15 px-4 py-3 rounded-full text-xs text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isBotTyping}
                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center text-white text-sm shadow-md cursor-pointer"
              >
                ➤
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            SCREEN 6: PROFILE (matching collage)
           ======================================================== */}
        {screen === 'profile' && (
          <div className="flex-1 bg-white p-5 space-y-5">
            <div className="flex items-center gap-3.5 pt-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow">
                👨‍✈️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Amit Kumar</h3>
                <p className="text-xs text-gray-400">Driver ID: D12345</p>
                <span className="inline-block text-[10px] font-bold text-amber-500 mt-0.5">★ 4.9 Rating</span>
              </div>
            </div>

            <div className="divide-y divide-gray-100 text-xs font-bold text-gray-800 pt-2">
              {[
                { label: 'My Earnings', icon: '💰', action: () => handleTabClick('earnings') },
                { label: 'Performance', icon: '📈', action: () => alert('98% acceptance rate') },
                { label: 'Driver Support', icon: '🛡️', action: () => handleTabClick('assistant') },
                { label: 'Settings', icon: '⚙️', action: () => alert('Vehicle: KA01AB1234') },
                { label: 'Log Out', icon: '🚪', action: () => handleTabClick('home') },
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
          BOTTOM NAVIGATION BAR (Home, Trips/Heatmap, Earnings, Assistant, Profile)
         ======================================================== */}
      <nav className={`uber-tab-bar ${screen === 'assistant' ? 'bg-[#111622] border-gray-800' : ''}`}>
        <button
          type="button"
          onClick={() => handleTabClick('home')}
          className={`uber-tab-btn ${activeTab === 'home' ? 'active' : ''} ${screen === 'assistant' ? 'text-gray-400' : ''}`}
        >
          <span className="text-base">🏠</span>
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('trips')}
          className={`uber-tab-btn ${activeTab === 'trips' ? 'active' : ''} ${screen === 'assistant' ? 'text-gray-400' : ''}`}
        >
          <span className="text-base">🗺️</span>
          <span>Trips</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('earnings')}
          className={`uber-tab-btn ${activeTab === 'earnings' ? 'active' : ''} ${screen === 'assistant' ? 'text-gray-400' : ''}`}
        >
          <span className="text-base">💰</span>
          <span>Earnings</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('assistant')}
          className={`uber-tab-btn ${activeTab === 'assistant' ? 'active text-blue-400' : ''} ${screen === 'assistant' ? 'text-blue-400' : ''}`}
        >
          <span className="text-base">🤖</span>
          <span>Assistant</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('profile')}
          className={`uber-tab-btn ${activeTab === 'profile' ? 'active' : ''} ${screen === 'assistant' ? 'text-gray-400' : ''}`}
        >
          <span className="text-base">👤</span>
          <span>Profile</span>
        </button>
      </nav>

      {/* iOS Home Indicator */}
      <div className={`uber-home-indicator ${screen === 'home' || screen === 'assistant' ? 'dark-bar' : ''}`} />
    </div>
  );
}
