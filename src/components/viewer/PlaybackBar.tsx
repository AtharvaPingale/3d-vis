import { useGcodeStore } from '../../store/gcodeStore'

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10]

export function PlaybackBar() {
  const data = useGcodeStore((s) => s.data)
  const currentMoveIndex = useGcodeStore((s) => s.currentMoveIndex)
  const isPlaying = useGcodeStore((s) => s.isPlaying)
  const speed = useGcodeStore((s) => s.speed)
  const viewMode = useGcodeStore((s) => s.viewMode)
  const isolateStart = useGcodeStore((s) => s.isolateStart)
  const isolateEnd = useGcodeStore((s) => s.isolateEnd)

  const togglePlay = useGcodeStore((s) => s.togglePlay)
  const setSpeed = useGcodeStore((s) => s.setSpeed)
  const stepLayer = useGcodeStore((s) => s.stepLayer)
  const setCurrentLayer = useGcodeStore((s) => s.setCurrentLayer)
  const setViewMode = useGcodeStore((s) => s.setViewMode)
  const setIsolateRange = useGcodeStore((s) => s.setIsolateRange)

  if (!data) return null

  const currentLayer = data.timeline.layerIndex[currentMoveIndex] ?? 0
  const maxLayer = Math.max(data.layerCount - 1, 0)
  const posIdx = currentMoveIndex * 3
  const x = data.timeline.positions[posIdx]
  const y = data.timeline.positions[posIdx + 1]
  const z = data.timeline.positions[posIdx + 2]
  const extrusion = data.timeline.cumulativeExtrusion[currentMoveIndex] ?? 0
  const elapsed = data.timeline.cumulativeDurationSeconds[currentMoveIndex] ?? 0
  const remaining = Math.max(data.timeline.totalDurationSeconds - elapsed, 0)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-400">
          Layer {currentLayer + 1} / {data.layerCount}
        </span>
        <span className="font-mono text-xs text-slate-400">
          {formatDuration(elapsed)} elapsed · ~{formatDuration(remaining)} left
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={maxLayer}
        step={1}
        value={currentLayer}
        onChange={(e) => setCurrentLayer(Number(e.target.value))}
        className="w-full"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={() => stepLayer(-1)}
          className="rounded-md bg-slate-800 px-2.5 py-1.5 hover:bg-slate-700"
          aria-label="Step back one layer"
        >
          ◀
        </button>
        <button
          onClick={togglePlay}
          className="flex-1 rounded-md bg-sky-500 px-3 py-1.5 font-medium text-white hover:bg-sky-400"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => stepLayer(1)}
          className="rounded-md bg-slate-800 px-2.5 py-1.5 hover:bg-slate-700"
          aria-label="Step forward one layer"
        >
          ▶
        </button>
      </div>

      <div className="flex items-center gap-1">
        <span className="mr-1 text-xs text-slate-400">Speed</span>
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
              speed === s
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-slate-950/50 p-2 font-mono text-xs text-slate-300">
        <span>X {x?.toFixed(2) ?? '—'}</span>
        <span>Y {y?.toFixed(2) ?? '—'}</span>
        <span>Z {z?.toFixed(2) ?? '—'}</span>
        <span>E {extrusion.toFixed(1)}mm</span>
      </div>

      <div className="border-t border-slate-800 pt-3">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={viewMode === 'isolate'}
            onChange={(e) => setViewMode(e.target.checked ? 'isolate' : 'buildUp')}
          />
          Isolate layer range
        </label>
        {viewMode === 'isolate' && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="number"
              min={0}
              max={maxLayer}
              value={isolateStart}
              onChange={(e) => setIsolateRange(Number(e.target.value), isolateEnd)}
              className="w-16 rounded border border-slate-700 bg-slate-800 px-1.5 py-1"
            />
            <span className="text-slate-500">to</span>
            <input
              type="number"
              min={0}
              max={maxLayer}
              value={isolateEnd}
              onChange={(e) => setIsolateRange(isolateStart, Number(e.target.value))}
              className="w-16 rounded border border-slate-700 bg-slate-800 px-1.5 py-1"
            />
          </div>
        )}
      </div>
    </div>
  )
}
