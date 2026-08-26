import { useGcodeStore } from '../../store/gcodeStore'

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function GcodeStatsPanel() {
  const data = useGcodeStore((s) => s.data)
  const fileName = useGcodeStore((s) => s.fileName)

  if (!data) return null

  const { size } = data.boundingBox

  const rows: [string, string][] = [
    ['File', fileName ?? '—'],
    ['Print size (X×Y×Z)', `${fmt(size.x)} × ${fmt(size.y)} × ${fmt(size.z)} mm`],
    ['Layers', fmt(data.layerCount)],
    ['Moves', fmt(data.moveCount)],
    ['Type comments', data.hasTypeComments ? 'Yes' : 'Not found'],
  ]

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
      <div className="mb-1 font-medium text-slate-400">Toolpath stats</div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <span className="text-slate-400">{label}</span>
          <span className="text-right font-mono text-slate-100">{value}</span>
        </div>
      ))}
    </div>
  )
}
