import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MOVE_TYPE_COLORS, MOVE_TYPE_ORDER } from '../../lib/parsers/gcodeCommands'
import { useGcodeStore } from '../../store/gcodeStore'
import type { MoveType } from '../../types/model'

/**
 * Renders the parsed toolpath as one THREE.LineSegments per move category —
 * a single draw call per category rather than per segment, per PLAN.md's
 * performance guidance. Toggling a category in the legend flips `visible`;
 * the layer scrubber/isolation range instead adjusts each geometry's
 * `drawRange`, which is cheap (no re-upload) since layer ranges are
 * precomputed, contiguous slices of the same static buffer.
 */
export function ToolpathMesh() {
  const data = useGcodeStore((s) => s.data)
  const categoryVisible = useGcodeStore((s) => s.categoryVisible)
  const currentMoveIndex = useGcodeStore((s) => s.currentMoveIndex)
  const viewMode = useGcodeStore((s) => s.viewMode)
  const isolateStart = useGcodeStore((s) => s.isolateStart)
  const isolateEnd = useGcodeStore((s) => s.isolateEnd)

  const geometries = useMemo(() => {
    if (!data) return null
    const result: Partial<Record<MoveType, THREE.BufferGeometry>> = {}
    for (const type of MOVE_TYPE_ORDER) {
      const positions = data.categories[type]
      if (positions.length === 0) continue
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      result[type] = geo
    }
    return result
  }, [data])

  const currentLayer = data ? (data.timeline.layerIndex[currentMoveIndex] ?? 0) : 0

  useEffect(() => {
    if (!data || !geometries) return
    const [loLayer, hiLayer] =
      viewMode === 'isolate' ? [isolateStart, isolateEnd] : [0, currentLayer]

    for (const type of MOVE_TYPE_ORDER) {
      const geo = geometries[type]
      if (!geo) continue
      const ranges = data.layerRanges[type]
      if (ranges.length === 0) {
        geo.setDrawRange(0, 0)
        continue
      }
      const lo = ranges[Math.max(0, Math.min(loLayer, ranges.length - 1))]
      const hi = ranges[Math.max(0, Math.min(hiLayer, ranges.length - 1))]
      geo.setDrawRange(lo.start, hi.start + hi.count - lo.start)
    }
  }, [data, geometries, viewMode, isolateStart, isolateEnd, currentLayer])

  if (!geometries) return null

  return (
    <group>
      {MOVE_TYPE_ORDER.map((type) => {
        const geo = geometries[type]
        if (!geo) return null
        return (
          <lineSegments key={type} geometry={geo} visible={categoryVisible[type]}>
            <lineBasicMaterial color={MOVE_TYPE_COLORS[type]} />
          </lineSegments>
        )
      })}
    </group>
  )
}
