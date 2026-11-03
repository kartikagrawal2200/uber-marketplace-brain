import { useEffect, useState } from 'react'

const MOCK_DRIVER_ID = 'driver-001'

export default function App() {
  const [isOnline, setIsOnline] = useState(false)
  const [currentZone, setCurrentZone] = useState(1)
  const [tick, setTick] = useState(0)

  useEffect(() => {
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <span className="text-black font-bold text-xs">D</span>
        </div>
        <h1 className="text-xl font-bold">Driver</h1>
        <span className="ml-auto text-xs text-gray-500">Tick {tick}</span>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <OnlineToggle isOnline={isOnline} onToggle={() => setIsOnline(!isOnline)} />
        <HintCard driverId={MOCK_DRIVER_ID} currentZone={currentZone} />
        <EarningsSummary driverId={MOCK_DRIVER_ID} />
        <ChatPanel driverId={MOCK_DRIVER_ID} />
      </main>
    </div>
  )
}

function OnlineToggle({ isOnline, onToggle }: { isOnline: boolean; onToggle: () => void }) {
  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 flex items-center justify-between">
      <span className="font-semibold">{isOnline ? '🟢 Online' : '⚫ Offline'}</span>
      <button
        onClick={onToggle}
        className={`px-6 py-2 rounded-full font-bold transition ${
          isOnline ? 'bg-gray-700 text-white' : 'bg-white text-black'
        }`}
      >
        {isOnline ? 'Go Offline' : 'Go Online'}
      </button>
    </div>
  )
}

function HintCard({ driverId, currentZone }: { driverId: string; currentZone: number }) {
  return (
    <div className="p-4 bg-blue-950 rounded-xl border border-blue-700 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">
          AI Recommendation
        </span>
      </div>
      <p className="text-white font-bold text-lg">
        📍 Stay in Zone {currentZone}
      </p>
      <p className="text-blue-300 text-sm">
        TODO: fetch real positioning hint from driverApi.getHint()
      </p>
      <div className="flex gap-3">
        <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-sm transition">
          ✓ Accept
        </button>
        <button className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-sm transition">
          ✗ Skip
        </button>
      </div>
    </div>
  )
}

function EarningsSummary({ driverId }: { driverId: string }) {
  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
      <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-3">
        Today's Earnings
      </h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Earnings" value="$0.00" />
        <Stat label="Rides" value="0" />
        <Stat label="Hrs Online" value="0.0" />
      </div>
      <p className="text-xs text-gray-600 mt-2">TODO: connect to driverApi.getEarnings()</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}

function ChatPanel({ driverId }: { driverId: string }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([
    { role: 'assistant', text: 'Hi! Ask me about earnings, zones, or how to get started.' }
  ])

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: userMsg }])
    setMessages((m) => [
      ...m,
      { role: 'assistant', text: 'TODO: implement agent response via driverApi.chat()' }
    ])
  }

  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 space-y-3">
      <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">AI Assistant</h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block px-3 py-1 rounded-lg ${
              m.role === 'user' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-200'
            }`}>
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition"
        >
          Send
        </button>
      </div>
    </div>
  )
}
