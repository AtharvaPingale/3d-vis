import { create } from 'zustand'
import type { ClipAxis, MatcapPreset, ParsedSTL, ShadingMode } from '../types/model'

export type LoadStatus = 'idle' | 'loading' | 'error' | 'ready'

const DEFAULT_LIGHTING = {
  ambientIntensity: 0.6,
  keyLightIntensity: 1.2,
  fillLightIntensity: 0.3,
  keyLightAzimuth: 45,
}

interface ViewerState {
  status: LoadStatus
  error: string | null
  fileName: string | null
  model: ParsedSTL | null

  shadingMode: ShadingMode
  meshColor: string
  matcapPreset: MatcapPreset

  clipAxis: ClipAxis
  /** 0–1, position of the clip plane along clipAxis relative to the bounding box. */
  clipPosition: number

  /** Bumped whenever "fit to view" is requested; consumers watch this to re-frame the camera. */
  fitToViewToken: number

  overhangThreshold: number
  showOverhangHeatmap: boolean

  ambientIntensity: number
  keyLightIntensity: number
  fillLightIntensity: number
  /** Degrees, 0–360 — rotates the key light (and the fill light, opposite it) around the model. */
  keyLightAzimuth: number

  setLoading: (fileName: string) => void
  setModel: (model: ParsedSTL) => void
  setError: (message: string) => void
  reset: () => void

  setShadingMode: (mode: ShadingMode) => void
  setMeshColor: (color: string) => void
  setMatcapPreset: (preset: MatcapPreset) => void
  setClipAxis: (axis: ClipAxis) => void
  setClipPosition: (position: number) => void
  requestFitToView: () => void

  setOverhangThreshold: (degrees: number) => void
  toggleOverhangHeatmap: () => void

  setAmbientIntensity: (intensity: number) => void
  setKeyLightIntensity: (intensity: number) => void
  setFillLightIntensity: (intensity: number) => void
  setKeyLightAzimuth: (degrees: number) => void
  resetLighting: () => void
}

export const useViewerStore = create<ViewerState>((set) => ({
  status: 'idle',
  error: null,
  fileName: null,
  model: null,

  shadingMode: 'solid',
  meshColor: '#4f9dff',
  matcapPreset: 'clay',

  clipAxis: null,
  clipPosition: 0.5,

  fitToViewToken: 0,

  overhangThreshold: 45,
  showOverhangHeatmap: false,

  ...DEFAULT_LIGHTING,

  setLoading: (fileName) =>
    set({ status: 'loading', fileName, error: null, model: null }),
  setModel: (model) => set({ status: 'ready', model }),
  setError: (message) => set({ status: 'error', error: message }),
  reset: () =>
    set({ status: 'idle', error: null, fileName: null, model: null, showOverhangHeatmap: false }),

  setShadingMode: (shadingMode) => set({ shadingMode }),
  setMeshColor: (meshColor) => set({ meshColor }),
  setMatcapPreset: (matcapPreset) => set({ matcapPreset }),
  setClipAxis: (clipAxis) => set({ clipAxis }),
  setClipPosition: (clipPosition) => set({ clipPosition }),
  requestFitToView: () =>
    set((s) => ({ fitToViewToken: s.fitToViewToken + 1 })),

  setOverhangThreshold: (overhangThreshold) => set({ overhangThreshold }),
  toggleOverhangHeatmap: () => set((s) => ({ showOverhangHeatmap: !s.showOverhangHeatmap })),

  setAmbientIntensity: (ambientIntensity) => set({ ambientIntensity }),
  setKeyLightIntensity: (keyLightIntensity) => set({ keyLightIntensity }),
  setFillLightIntensity: (fillLightIntensity) => set({ fillLightIntensity }),
  setKeyLightAzimuth: (keyLightAzimuth) => set({ keyLightAzimuth }),
  resetLighting: () => set(DEFAULT_LIGHTING),
}))
