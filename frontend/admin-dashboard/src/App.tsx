import { useEffect, useState } from 'react'

const SCENARIOS = [
  { id: 'stadium_surge', label: '🏟️ Stadium Surge', color: 'bg-orange-600' },
  { id: 'rain_burst',    label: '🌧️ Rain Burst',    color: 'bg-blue-600' },
  { id: 'stale_model',   label: '⚠️ Stale Model',   color: 'bg-red-600' },
]

export default function App() {
  const [tick, setTick] = useState(0)
  const [simHour, setSimHour] = useState(8.0)
  const [weather, setWeather] = useState('clear')
  const [fr, setFr] = useState(0)
  const [baselineFr] = useState(0.71)
  const [llmStatus, setLlmStatus] = useState<'healthy' | 'fallback' | 'down'>('healthy')

  useEffect(() => {
  }, [])

  const triggerScenario = async (id: string) => {
    alert(`TODO: trigger scenario "${id}" via adminApi.triggerScenario()`)
  }

  const deltaPP = ((fr - baselineFr) * 100).toFixed(1)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-6 py-4 border-b border-gray-800 flex items-center gap-4">
        <h1 className="text-xl font-bold">🧠 Admin Dashboard</h1>
        <div className="ml-auto flex items-center gap-4">
          <LlmHealthBadge status={llmStatus} />
          <span className="text-xs text-gray-500">
            Tick {tick} · {formatHour(simHour)} · {weather}
          </span>
        </div>
      </header>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <MetricCard
            label="Fulfilment Rate"
            value={`${(fr * 100).toFixed(1)}%`}
            sub={`Baseline: ${(baselineFr * 100).toFixed(1)}%`}
            delta={`${Number(deltaPP) >= 0 ? '+' : ''}${deltaPP} pp`}
            positive={Number(deltaPP) >= 0}
          />

          <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 space-y-3">
            <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">
              Demo Scenarios
            </h3>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => triggerScenario(s.id)}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition hover:opacity-90 ${s.color}`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={() => alert('TODO: adminApi.reset()')}
              className="w-full py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 transition"
            >
              🔄 Reset Simulation
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
            <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">
              Zone Overview
            </h3>
            <ZoneGrid />
          </div>
        </div>

        <div className="lg:col-span-3">
          <BaselineComparisonTable fr={fr} baselineFr={baselineFr} />
        </div>
      </div>
    </div>
  )
}

function LlmHealthBadge({ status }: { status: 'healthy' | 'fallback' | 'down' }) {
  const config = {
    healthy:  { dot: 'bg-green-400',  label: 'Local LLM' },
    fallback: { dot: 'bg-yellow-400', label: 'Gemini Fallback' },
    down:     { dot: 'bg-red-500',    label: 'LLM Down' },
  }[status]
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-full">
      <div className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  )
}

function MetricCard({
  label, value, sub, delta, positive
}: {
  label: string; value: string; sub: string; delta: string; positive: boolean
}) {
  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
      <p className={`text-sm font-semibold mt-2 ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {delta} vs baseline
      </p>
    </div>
  )
}

function ZoneGrid() {
  const zones = Array.from({ length: 12 }, (_, i) => i + 1)
  return (
    <div className="grid grid-cols-4 gap-2">
      {zones.map((z) => (
        <div
          key={z}
          className="p-3 bg-gray-800 rounded-lg border border-gray-700 text-center"
        >
          <p className="font-bold text-sm">Z{z}</p>
          <p className="text-xs text-gray-500 mt-1">
            🚗 — | 📍 —
          </p>
        </div>
      ))}
    </div>
  )
}

function BaselineComparisonTable({ fr, baselineFr }: { fr: number; baselineFr: number }) {
  const rows = [
    { metric: 'Fulfilment Rate',  baseline: `${(baselineFr * 100).toFixed(1)}%`, ai: `${(fr * 100).toFixed(1)}%`, delta: `${((fr - baselineFr) * 100).toFixed(1)} pp` },
    { metric: 'Avg Wait Time',    baseline: '4m 12s', ai: 'TODO', delta: 'TODO' },
    { metric: 'Surge Accuracy',   baseline: '—',      ai: 'TODO', delta: '—' },
    { metric: 'Driver Idle Time', baseline: '—',      ai: 'TODO', delta: '—' },
  ]
  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
      <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">
        Baseline Comparison
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-left border-b border-gray-800">
            <th className="pb-2">Metric</th>
            <th className="pb-2">Baseline</th>
            <th className="pb-2">AI System</th>
            <th className="pb-2">Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.metric} className="border-b border-gray-800 last:border-0">
              <td className="py-2 text-gray-300">{r.metric}</td>
              <td className="py-2 text-gray-400">{r.baseline}</td>
              <td className="py-2 font-semibold">{r.ai}</td>
              <td className="py-2 text-green-400 font-semibold">{r.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatHour(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  const ampm = hh < 12 ? 'AM' : 'PM'
  const h12 = hh % 12 || 12
  return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`
}
