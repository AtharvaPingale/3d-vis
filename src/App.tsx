import type { ReactNode } from 'react'
import { Dropzone } from './components/upload/Dropzone'
import { AnalysisPanel } from './components/viewer/AnalysisPanel'
import { Controls } from './components/viewer/Controls'
import { GcodeCanvas } from './components/viewer/GcodeCanvas'
import { GcodeControls } from './components/viewer/GcodeControls'
import { GcodeStatsPanel } from './components/viewer/GcodeStatsPanel'
import { LegendColorKey } from './components/viewer/LegendColorKey'
import { PlaybackBar } from './components/viewer/PlaybackBar'
import { SceneCanvas } from './components/viewer/SceneCanvas'
import { StatsPanel } from './components/viewer/StatsPanel'
import { loadSampleGcode, loadSampleModel } from './lib/loadSampleModel'
import { useGcodeStore } from './store/gcodeStore'
import { useViewerStore } from './store/viewerStore'

function UploadScreen() {
  const stlStatus = useViewerStore((s) => s.status)
  const stlError = useViewerStore((s) => s.error)
  const stlFileName = useViewerStore((s) => s.fileName)

  const gcodeStatus = useGcodeStore((s) => s.status)
  const gcodeError = useGcodeStore((s) => s.error)
  const gcodeFileName = useGcodeStore((s) => s.fileName)
  const gcodeProgress = useGcodeStore((s) => s.progress)

  const isLoading = stlStatus === 'loading' || gcodeStatus === 'loading'
  const loadingFileName = stlStatus === 'loading' ? stlFileName : gcodeFileName
  const error = stlStatus === 'error' ? stlError : gcodeStatus === 'error' ? gcodeError : null

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4 sm:p-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">3D Print Viewer</h1>
        <p className="mt-1 text-sm text-slate-400 sm:text-base">
          Drop an STL to view and measure it, or a sliced G-code file to see its color-coded
          toolpath — all in your browser.
        </p>
      </div>
      <Dropzone />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={loadSampleModel}
          disabled={isLoading}
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Try the sample model (STL)
        </button>
        <button
          onClick={loadSampleGcode}
          disabled={isLoading}
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Try the sample toolpath (G-code)
        </button>
      </div>
      {isLoading && (
        <div className="flex w-full max-w-xl flex-col items-center gap-1.5">
          <p className="text-sm text-slate-400">
            Parsing {loadingFileName}
            {gcodeStatus === 'loading' && gcodeProgress > 0
              ? ` (${Math.round(gcodeProgress * 100)}%)…`
              : '…'}
          </p>
          {gcodeStatus === 'loading' && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-500 transition-[width]"
                style={{ width: `${Math.round(gcodeProgress * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}
      {error && <p className="max-w-xl text-center text-sm text-red-400">{error}</p>}
    </div>
  )
}

// Shared shell for both viewer screens: canvas + sidebar. Stacked
// (canvas on top, sidebar below and scrollable) below the `lg` breakpoint;
// side-by-side with a fixed-width sidebar above it, matching how much
// screen real estate a mouse-and-keyboard session actually has.
function ViewerLayout({ canvas, sidebar }: { canvas: ReactNode; sidebar: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 lg:flex-row">
      <div className="min-h-[45vh] w-full shrink-0 overflow-hidden rounded-xl border border-slate-800 lg:h-auto lg:min-h-0 lg:flex-1">
        {canvas}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:w-72 lg:flex-none">
        {sidebar}
      </div>
    </div>
  )
}

function StlViewerScreen() {
  return (
    <ViewerLayout
      canvas={<SceneCanvas />}
      sidebar={
        <>
          <StatsPanel />
          <AnalysisPanel />
          <Controls />
        </>
      }
    />
  )
}

function GcodeViewerScreen() {
  return (
    <ViewerLayout
      canvas={<GcodeCanvas />}
      sidebar={
        <>
          <GcodeStatsPanel />
          <PlaybackBar />
          <LegendColorKey />
          <GcodeControls />
        </>
      }
    />
  )
}

function App() {
  const stlReady = useViewerStore((s) => s.status === 'ready')
  const gcodeReady = useGcodeStore((s) => s.status === 'ready')

  let screen = <UploadScreen />
  if (gcodeReady) screen = <GcodeViewerScreen />
  else if (stlReady) screen = <StlViewerScreen />

  // h-dvh (dynamic viewport height) rather than h-screen — on mobile, 100vh
  // includes the space behind the browser's address bar, which causes the
  // page to overflow/jump as that chrome shows and hides on scroll.
  return <div className="h-dvh w-screen bg-slate-950 text-slate-100">{screen}</div>
}

export default App
