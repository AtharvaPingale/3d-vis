import { useMemo } from 'react'
import * as THREE from 'three'
import { analyzeStl } from '../../lib/analysis/stlAnalysis'
import { getMatcapTexture } from '../../lib/matcapTexture'
import { useViewerStore } from '../../store/viewerStore'

/** Renders the parsed STL as a mesh, reacting to shading mode, color, clip plane, and overhang heatmap. */
export function ModelMesh() {
  const model = useViewerStore((s) => s.model)
  const shadingMode = useViewerStore((s) => s.shadingMode)
  const meshColor = useViewerStore((s) => s.meshColor)
  const matcapPreset = useViewerStore((s) => s.matcapPreset)
  const clipAxis = useViewerStore((s) => s.clipAxis)
  const clipPosition = useViewerStore((s) => s.clipPosition)
  const showOverhangHeatmap = useViewerStore((s) => s.showOverhangHeatmap)
  const overhangThreshold = useViewerStore((s) => s.overhangThreshold)

  // Rebuilt (not mutated in an effect) whenever the heatmap toggle/threshold
  // changes, so the color attribute is always present-or-absent in the same
  // render pass as the material that needs it — no gap where a `vertexColors`
  // material could get drawn a frame before the attribute exists.
  const geometry = useMemo(() => {
    if (!model) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(model.positions, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(model.normals, 3))
    if (showOverhangHeatmap) {
      const { overhangColors } = analyzeStl(model.positions, model.normals, overhangThreshold)
      geo.setAttribute('color', new THREE.BufferAttribute(overhangColors, 3))
    }
    return geo
  }, [model, showOverhangHeatmap, overhangThreshold])

  const clippingPlanes = useMemo(() => {
    if (!clipAxis || !model) return []
    const { min, max } = model.boundingBox
    const axisMin = min[clipAxis]
    const axisMax = max[clipAxis]
    const constant = axisMin + (axisMax - axisMin) * clipPosition

    const normal = new THREE.Vector3(
      clipAxis === 'x' ? -1 : 0,
      clipAxis === 'y' ? -1 : 0,
      clipAxis === 'z' ? -1 : 0,
    )
    // With an inward-facing (negative) normal, geometry below `constant` along the
    // axis stays visible and everything above it is clipped away.
    return [new THREE.Plane(normal, constant)]
  }, [clipAxis, clipPosition, model])

  if (!geometry) return null

  if (showOverhangHeatmap) {
    // Unlit on purpose: a heatmap should show its true severity color from
    // any angle/light setup, not get modulated by scene lighting.
    return (
      <mesh geometry={geometry}>
        <meshBasicMaterial vertexColors clippingPlanes={clippingPlanes} side={THREE.DoubleSide} />
      </mesh>
    )
  }

  return (
    <mesh geometry={geometry}>
      {shadingMode === 'matcap' ? (
        <meshMatcapMaterial
          matcap={getMatcapTexture(matcapPreset)}
          color={meshColor}
          clippingPlanes={clippingPlanes}
          clipShadows
          side={THREE.DoubleSide}
        />
      ) : (
        <meshStandardMaterial
          color={meshColor}
          clippingPlanes={clippingPlanes}
          clipShadows
          side={THREE.DoubleSide}
          roughness={0.6}
          metalness={0.1}
        />
      )}
    </mesh>
  )
}
