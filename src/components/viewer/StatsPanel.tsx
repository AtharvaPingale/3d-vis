import { useViewerStore } from '../../store/viewerStore'

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function StatsPanel() {
  const model = useViewerStore((s) => s.model)
  const fileName = useViewerStore((s) => s.fileName)

  if (!model) return null

  const { size } = model.boundingBox

  const rows: [string, string][] = [
    ['File', fileName ?? '—'],
    ['Format', model.format],
    ['Dimensions (X×Y×Z)', `${fmt(size.x)} × ${fmt(size.y)} × ${fmt(size.z)} mm`],
    ['Triangles', fmt(model.triangleCount)],
    ['Vertices', fmt(model.vertexCount)],
  ]

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
      <div className="mb-1 font-medium text-slate-400">Model stats</div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <span className="text-slate-400">{label}</span>
          <span className="text-right font-mono text-slate-100">{value}</span>
        </div>
      ))}
    </div>
  )
}
