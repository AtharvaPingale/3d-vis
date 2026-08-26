import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { BoundingBox } from '../../types/model'

interface CameraRigProps {
  boundingBox: BoundingBox | null
  /** Bump this to re-frame the camera on demand (e.g. a "fit to view" button). */
  fitToViewToken: number
}

/** Repositions the camera to frame `boundingBox`, on change and whenever `fitToViewToken` bumps. */
export function CameraRig({ boundingBox, fitToViewToken }: CameraRigProps) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    if (!boundingBox) return
    const { min, max, size } = boundingBox
    const center = new THREE.Vector3(
      (min.x + max.x) / 2,
      (min.y + max.y) / 2,
      (min.z + max.z) / 2,
    )
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const distance = maxDim * 1.8

    // STL/G-code data is Z-up (print height), not three.js's default Y-up —
    // without this, OrbitControls orbits around the wrong axis and the model
    // renders tipped on its side.
    camera.up.set(0, 0, 1)
    camera.position.set(
      center.x + distance,
      center.y + distance,
      center.z + distance * 0.8,
    )
    camera.lookAt(center)
    camera.near = maxDim / 100
    camera.far = maxDim * 50
    camera.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundingBox, fitToViewToken])

  return <OrbitControls ref={controlsRef} makeDefault />
}
