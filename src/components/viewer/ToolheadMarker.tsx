import { useMemo } from 'react'
import { useGcodeStore } from '../../store/gcodeStore'

/** Small marker at the toolhead's current position, sized relative to the print. */
export function ToolheadMarker() {
  const data = useGcodeStore((s) => s.data)
  const currentMoveIndex = useGcodeStore((s) => s.currentMoveIndex)

  const radius = useMemo(() => {
    if (!data) return 1
    const { size } = data.boundingBox
    return Math.max(Math.max(size.x, size.y, size.z) * 0.012, 0.3)
  }, [data])

  if (!data || data.moveCount === 0) return null

  const i = currentMoveIndex * 3
  const positions = data.timeline.positions
  const x = positions[i]
  const y = positions[i + 1]
  const z = positions[i + 2]
  if (x === undefined) return null

  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial color="#f97316" />
    </mesh>
  )
}
