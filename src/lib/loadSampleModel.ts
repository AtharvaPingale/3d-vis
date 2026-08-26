import { parseGcodeBuffer } from './gcodeWorkerClient'
import { parseStlBuffer } from './stlWorkerClient'
import { useGcodeStore } from '../store/gcodeStore'
import { useViewerStore } from '../store/viewerStore'

export const SAMPLE_STL_URL = '/models/3DBenchy.stl'
export const SAMPLE_STL_NAME = '3DBenchy.stl'

export const SAMPLE_GCODE_URL = '/models/CE3_3DBenchy.gcode'
export const SAMPLE_GCODE_NAME = 'CE3_3DBenchy.gcode'

/**
 * Fetches and parses the bundled sample STL, driving the same store
 * transitions a drag & drop upload would (loading -> ready/error). Meant to
 * be called directly from a click handler rather than an effect, so there's
 * no mount/unmount race to guard against.
 */
export async function loadSampleModel() {
  const { setLoading, setModel, setError } = useViewerStore.getState()
  setLoading(SAMPLE_STL_NAME)
  try {
    const res = await fetch(SAMPLE_STL_URL)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const buffer = await res.arrayBuffer()
    const parsed = await parseStlBuffer(buffer)
    setModel(parsed)
  } catch (err) {
    setError(
      err instanceof Error
        ? `Failed to load sample model: ${err.message}`
        : 'Failed to load sample model.',
    )
  }
}

/** Same as `loadSampleModel`, for the bundled sample G-code toolpath. */
export async function loadSampleGcode() {
  const { setLoading, setProgress, setData, setError } = useGcodeStore.getState()
  setLoading(SAMPLE_GCODE_NAME)
  try {
    const res = await fetch(SAMPLE_GCODE_URL)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const buffer = await res.arrayBuffer()
    const parsed = await parseGcodeBuffer(buffer, setProgress)
    setData(parsed)
  } catch (err) {
    setError(
      err instanceof Error
        ? `Failed to load sample G-code: ${err.message}`
        : 'Failed to load sample G-code.',
    )
  }
}
