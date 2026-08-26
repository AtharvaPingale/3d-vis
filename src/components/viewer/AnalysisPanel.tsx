import { useMemo } from 'react'
import { analyzeStl } from '../../lib/analysis/stlAnalysis'
import { useViewerStore } from '../../store/viewerStore'

function fmt(n: number, digits = 2): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function AnalysisPanel() {
  const model = useViewerStore((s) => s.model)
  const overhangThreshold = useViewerStore((s) => s.overhangThreshold)
  const setOverhangThreshold = useViewerStore((s) => s.setOverhangThreshold)
  const showOverhangHeatmap = useViewerStore((s) => s.showOverhangHeatmap)
  const toggleOverhangHeatmap = useViewerStore((s) => s.toggleOverhangHeatmap)

  // Recomputed here too (ModelMesh does its own, for the heatmap colors) —
  // cheap enough (~10ms on a 225k-triangle mesh) that duplicating it is
  // simpler than threading the result through the store.
  const analysis = useMemo(() => {
    if (!model) return null
    return analyzeStl(model.positions, model.normals, overhangThreshold)
  }, [model, overhangThreshold])

  if (!model || !analysis) return null

  const rows: [string, string][] = [
    ['Volume', `${fmt(analysis.volumeMm3 / 1000)} cm³`],
    ['Surface area', `${fmt(analysis.surfaceAreaMm2 / 100)} cm²`],
    [
      'Center of mass',
      `${fmt(analysis.centerOfMass.x, 1)}, ${fmt(analysis.centerOfMass.y, 1)}, ${fmt(analysis.centerOfMass.z, 1)}`,
    ],
    ['Overhang area', `${fmt(analysis.overhangAreaFraction * 100, 1)}%`],
  ]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
      <div className="font-medium text-slate-400">Analysis</div>
      <div className="flex flex-col gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-slate-400">{label}</span>
            <span className="text-right font-mono text-slate-100">{value}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-800 pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">Overhang threshold</span>
          <span className="font-mono text-xs text-slate-300">{overhangThreshold}°</span>
        </div>
        <input
          type="range"
          min={10}
          max={80}
          step={1}
          value={overhangThreshold}
          onChange={(e) => setOverhangThreshold(Number(e.target.value))}
          className="w-full"
        />
        <button
          onClick={toggleOverhangHeatmap}
          className={`mt-2 w-full rounded-md px-3 py-1.5 text-sm transition-colors ${
            showOverhangHeatmap
              ? 'bg-sky-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {showOverhangHeatmap ? 'Hide overhang heatmap' : 'Show overhang heatmap'}
        </button>
        {showOverhangHeatmap && (
          <p className="mt-1.5 text-xs text-slate-500">
            Yellow → red marks faces steeper than {overhangThreshold}° from vertical. Overrides
            shading while active.
          </p>
        )}
      </div>
    </div>
  )
}
