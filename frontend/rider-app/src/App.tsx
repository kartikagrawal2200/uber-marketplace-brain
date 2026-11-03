import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState<string>('Connecting...')

  useEffect(() => {
    setStatus('Ready — TODO: connect WebSocket')
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <span className="text-black font-bold text-xs">U</span>
        </div>
        <h1 className="text-xl font-bold">Rider</h1>
        <span className="ml-auto text-xs text-gray-400">{status}</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-full max-w-md h-64 bg-gray-900 rounded-xl flex items-center justify-center border border-gray-700">
          <p className="text-gray-500 text-sm">🗺️ Map — TODO: render zone grid</p>
        </div>

        <RideRequestForm />

        <div className="w-full max-w-md p-4 bg-gray-900 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Current ride status</p>
          <p className="text-white font-semibold mt-1">No active ride</p>
        </div>
      </main>
    </div>
  )
}

function RideRequestForm() {
  const [pickupZone, setPickupZone] = useState(1)
  const [dropoffZone, setDropoffZone] = useState(2)

  const handleRequest = async () => {
    alert(`TODO: request ride from Zone ${pickupZone} to Zone ${dropoffZone}`)
  }

  return (
    <div className="w-full max-w-md p-4 bg-gray-900 rounded-xl border border-gray-700 space-y-4">
      <h2 className="font-semibold">Request a Ride</h2>

      <div className="flex gap-3">
        <label className="flex-1">
          <span className="text-xs text-gray-400">Pickup Zone</span>
          <select
            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
            value={pickupZone}
            onChange={(e) => setPickupZone(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((z) => (
              <option key={z} value={z}>Zone {z}</option>
            ))}
          </select>
        </label>

        <label className="flex-1">
          <span className="text-xs text-gray-400">Dropoff Zone</span>
          <select
            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
            value={dropoffZone}
            onChange={(e) => setDropoffZone(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((z) => (
              <option key={z} value={z}>Zone {z}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={handleRequest}
        className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition"
      >
        Request Ride
      </button>
    </div>
  )
}
