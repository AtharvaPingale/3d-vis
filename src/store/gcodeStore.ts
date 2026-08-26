import { create } from 'zustand'
import type { MoveType, ParsedGcode } from '../types/model'
import { MOVE_TYPE_ORDER } from '../lib/parsers/gcodeCommands'

export type GcodeLoadStatus = 'idle' | 'loading' | 'error' | 'ready'
export type ViewMode = 'buildUp' | 'isolate'

function allVisible(): Record<MoveType, boolean> {
  return Object.fromEntries(MOVE_TYPE_ORDER.map((t) => [t, true])) as Record<MoveType, boolean>
}

interface GcodeState {
  status: GcodeLoadStatus
  error: string | null
  fileName: string | null
  /** 0–1 while status is 'loading'. */
  progress: number
  data: ParsedGcode | null

  categoryVisible: Record<MoveType, boolean>

  // Playback / scrubbing — `currentMoveIndex` is the authoritative cursor
  // (drives the toolhead marker + live readouts); `currentLayer` derives
  // from it via `data.timeline.layerIndex` wherever it's needed for display.
  currentMoveIndex: number
  isPlaying: boolean
  /** Playback speed multiplier, 0.5–10. */
  speed: number

  viewMode: ViewMode
  /** Layer window shown in 'isolate' mode, inclusive. */
  isolateStart: number
  isolateEnd: number

  fitToViewToken: number

  setLoading: (fileName: string) => void
  setProgress: (fraction: number) => void
  setData: (data: ParsedGcode) => void
  setError: (message: string) => void
  reset: () => void

  toggleCategory: (type: MoveType) => void
  requestFitToView: () => void

  setCurrentMoveIndex: (index: number) => void
  setCurrentLayer: (layer: number) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
  setSpeed: (speed: number) => void
  stepLayer: (delta: number) => void

  setViewMode: (mode: ViewMode) => void
  setIsolateRange: (start: number, end: number) => void
}

export const useGcodeStore = create<GcodeState>((set, get) => ({
  status: 'idle',
  error: null,
  fileName: null,
  progress: 0,
  data: null,

  categoryVisible: allVisible(),

  currentMoveIndex: 0,
  isPlaying: false,
  speed: 1,

  viewMode: 'buildUp',
  isolateStart: 0,
  isolateEnd: 0,

  fitToViewToken: 0,

  setLoading: (fileName) =>
    set({ status: 'loading', fileName, error: null, data: null, progress: 0 }),
  setProgress: (progress) => set({ progress }),
  setData: (data) =>
    set({
      status: 'ready',
      data,
      currentMoveIndex: 0,
      isPlaying: false,
      viewMode: 'buildUp',
      isolateStart: 0,
      isolateEnd: Math.max(data.layerCount - 1, 0),
    }),
  setError: (message) => set({ status: 'error', error: message }),
  reset: () =>
    set({
      status: 'idle',
      error: null,
      fileName: null,
      data: null,
      progress: 0,
      categoryVisible: allVisible(),
      currentMoveIndex: 0,
      isPlaying: false,
      viewMode: 'buildUp',
      isolateStart: 0,
      isolateEnd: 0,
    }),

  toggleCategory: (type) =>
    set((s) => ({ categoryVisible: { ...s.categoryVisible, [type]: !s.categoryVisible[type] } })),
  requestFitToView: () => set((s) => ({ fitToViewToken: s.fitToViewToken + 1 })),

  setCurrentMoveIndex: (index) => {
    const { data } = get()
    if (!data) return
    const clamped = Math.max(0, Math.min(index, Math.max(data.moveCount - 1, 0)))
    set({ currentMoveIndex: clamped })
  },
  setCurrentLayer: (layer) => {
    const { data } = get()
    if (!data) return
    const clampedLayer = Math.max(0, Math.min(layer, data.layerCount - 1))
    get().setCurrentMoveIndex(data.timeline.layerStartMove[clampedLayer] ?? 0)
  },
  play: () => {
    const { data, currentMoveIndex } = get()
    // Restart from the beginning if playback had reached the end.
    if (data && currentMoveIndex >= data.moveCount - 1) {
      set({ currentMoveIndex: 0 })
    }
    set({ isPlaying: true })
  },
  pause: () => set({ isPlaying: false }),
  togglePlay: () => (get().isPlaying ? get().pause() : get().play()),
  setSpeed: (speed) => set({ speed: Math.max(0.5, Math.min(speed, 10)) }),
  stepLayer: (delta) => {
    const { data } = get()
    if (!data) return
    const currentLayer = data.timeline.layerIndex[get().currentMoveIndex] ?? 0
    set({ isPlaying: false })
    get().setCurrentLayer(currentLayer + delta)
  },

  setViewMode: (viewMode) => set({ viewMode }),
  setIsolateRange: (start, end) => {
    const { data } = get()
    const maxLayer = data ? Math.max(data.layerCount - 1, 0) : 0
    const s = Math.max(0, Math.min(start, maxLayer))
    const e = Math.max(s, Math.min(end, maxLayer))
    set({ isolateStart: s, isolateEnd: e })
  },
}))
