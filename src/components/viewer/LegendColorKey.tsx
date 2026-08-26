import { MOVE_TYPE_COLORS, MOVE_TYPE_LABELS, MOVE_TYPE_ORDER } from '../../lib/parsers/gcodeCommands'
import { useGcodeStore } from '../../store/gcodeStore'

/** Legend + visibility toggles for each move category present in the parsed file. */
export function LegendColorKey() {
  const data = useGcodeStore((s) => s.data)
  const categoryVisible = useGcodeStore((s) => s.categoryVisible)
  const toggleCategory = useGcodeStore((s) => s.toggleCategory)

  if (!data) return null

  const presentTypes = MOVE_TYPE_ORDER.filter((type) => data.categories[type].length > 0)

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
      <div className="mb-1 font-medium text-slate-400">Legend</div>
      {presentTypes.map((type) => {
        const visible = categoryVisible[type]
        return (
          <button
            key={type}
            onClick={() => toggleCategory(type)}
            className={`flex items-center gap-2 rounded-md px-1.5 py-2 text-left transition-colors hover:bg-slate-800 ${
              visible ? '' : 'opacity-40'
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: MOVE_TYPE_COLORS[type] }}
            />
            <span className="flex-1">{MOVE_TYPE_LABELS[type]}</span>
          </button>
        )
      })}
      {!data.hasTypeComments && (
        <p className="mt-1 text-xs text-slate-500">
          No slicer type comments found — showing travel vs. extrusion only.
        </p>
      )}
    </div>
  )
}
