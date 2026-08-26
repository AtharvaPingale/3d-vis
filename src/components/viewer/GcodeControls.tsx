import { useGcodeStore } from '../../store/gcodeStore'

export function GcodeControls() {
  const requestFitToView = useGcodeStore((s) => s.requestFitToView)
  const reset = useGcodeStore((s) => s.reset)

  return (
    <div className="flex gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <button
        onClick={requestFitToView}
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
      >
        Fit to view
      </button>
      <button
        onClick={reset}
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
      >
        Load another file
      </button>
    </div>
  )
}
