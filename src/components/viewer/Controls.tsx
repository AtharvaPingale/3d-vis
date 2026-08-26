import type { ClipAxis, MatcapPreset, ShadingMode } from '../../types/model'
import { useViewerStore } from '../../store/viewerStore'

const SHADING_MODES: { value: ShadingMode; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'matcap', label: 'Matcap' },
]

const MATCAP_PRESETS: { value: MatcapPreset; label: string }[] = [
  { value: 'clay', label: 'Clay' },
  { value: 'metal', label: 'Metal' },
  { value: 'plastic', label: 'Plastic' },
  { value: 'ceramic', label: 'Ceramic' },
]

const CLIP_AXES: { value: ClipAxis; label: string }[] = [
  { value: null, label: 'Off' },
  { value: 'x', label: 'X' },
  { value: 'y', label: 'Y' },
  { value: 'z', label: 'Z' },
]

export function Controls() {
  const shadingMode = useViewerStore((s) => s.shadingMode)
  const setShadingMode = useViewerStore((s) => s.setShadingMode)
  const meshColor = useViewerStore((s) => s.meshColor)
  const setMeshColor = useViewerStore((s) => s.setMeshColor)
  const matcapPreset = useViewerStore((s) => s.matcapPreset)
  const setMatcapPreset = useViewerStore((s) => s.setMatcapPreset)
  const clipAxis = useViewerStore((s) => s.clipAxis)
  const setClipAxis = useViewerStore((s) => s.setClipAxis)
  const clipPosition = useViewerStore((s) => s.clipPosition)
  const setClipPosition = useViewerStore((s) => s.setClipPosition)
  const requestFitToView = useViewerStore((s) => s.requestFitToView)
  const reset = useViewerStore((s) => s.reset)

  const ambientIntensity = useViewerStore((s) => s.ambientIntensity)
  const setAmbientIntensity = useViewerStore((s) => s.setAmbientIntensity)
  const keyLightIntensity = useViewerStore((s) => s.keyLightIntensity)
  const setKeyLightIntensity = useViewerStore((s) => s.setKeyLightIntensity)
  const fillLightIntensity = useViewerStore((s) => s.fillLightIntensity)
  const setFillLightIntensity = useViewerStore((s) => s.setFillLightIntensity)
  const keyLightAzimuth = useViewerStore((s) => s.keyLightAzimuth)
  const setKeyLightAzimuth = useViewerStore((s) => s.setKeyLightAzimuth)
  const resetLighting = useViewerStore((s) => s.resetLighting)

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
      <div>
        <div className="mb-1.5 font-medium text-slate-400">Shading</div>
        <div className="flex gap-1">
          {SHADING_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setShadingMode(m.value)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                shadingMode === m.value
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {shadingMode === 'matcap' && (
        <div>
          <div className="mb-1.5 font-medium text-slate-400">Material</div>
          <div className="flex flex-wrap gap-1">
            {MATCAP_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setMatcapPreset(p.value)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  matcapPreset === p.value
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 font-medium text-slate-400">Color</div>
        <input
          type="color"
          value={meshColor}
          onChange={(e) => setMeshColor(e.target.value)}
          className="h-8 w-16 cursor-pointer rounded border border-slate-700 bg-transparent"
        />
      </div>

      <div>
        <div className="mb-1.5 font-medium text-slate-400">Clip plane</div>
        <div className="mb-2 flex gap-1">
          {CLIP_AXES.map((a) => (
            <button
              key={a.label}
              onClick={() => setClipAxis(a.value)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                clipAxis === a.value
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        {clipAxis && (
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={clipPosition}
            onChange={(e) => setClipPosition(Number(e.target.value))}
            className="w-full"
          />
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-medium text-slate-400">Lighting</span>
          <button
            onClick={resetLighting}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Reset
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-12 shrink-0">Ambient</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={ambientIntensity}
              onChange={(e) => setAmbientIntensity(Number(e.target.value))}
              className="flex-1"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-12 shrink-0">Key</span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.05}
              value={keyLightIntensity}
              onChange={(e) => setKeyLightIntensity(Number(e.target.value))}
              className="flex-1"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-12 shrink-0">Fill</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={fillLightIntensity}
              onChange={(e) => setFillLightIntensity(Number(e.target.value))}
              className="flex-1"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-12 shrink-0">Angle</span>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={keyLightAzimuth}
              onChange={(e) => setKeyLightAzimuth(Number(e.target.value))}
              className="flex-1"
            />
          </label>
        </div>
        {shadingMode === 'matcap' && (
          <p className="mt-1.5 text-xs text-slate-500">
            Matcap shading is lighting-independent — these won't have a visible effect until you
            switch to Solid.
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={requestFitToView}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-slate-200 hover:bg-slate-700"
        >
          Fit to view
        </button>
        <button
          onClick={reset}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-slate-200 hover:bg-slate-700"
        >
          Load another file
        </button>
      </div>
    </div>
  )
}
