import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { useViewerStore } from '../../store/viewerStore'
import { CameraRig } from './CameraRig'
import { ModelMesh } from './ModelMesh'

const KEY_LIGHT_RADIUS = 70
const KEY_LIGHT_HEIGHT = 80
const FILL_LIGHT_HEIGHT = -20

export function SceneCanvas() {
  const boundingBox = useViewerStore((s) => s.model?.boundingBox ?? null)
  const fitToViewToken = useViewerStore((s) => s.fitToViewToken)

  const ambientIntensity = useViewerStore((s) => s.ambientIntensity)
  const keyLightIntensity = useViewerStore((s) => s.keyLightIntensity)
  const fillLightIntensity = useViewerStore((s) => s.fillLightIntensity)
  const keyLightAzimuth = useViewerStore((s) => s.keyLightAzimuth)

  // Fill light sits opposite the key light so it reads as a soft counter-fill
  // rather than a second key, regardless of which way the key is rotated.
  // Z is up here (see CameraRig), so "azimuth" rotates across X/Y and the
  // light's elevation is its Z coordinate — not Y, which is horizontal now.
  const [keyPos, fillPos] = useMemo<[
    [number, number, number],
    [number, number, number],
  ]>(() => {
    const rad = (keyLightAzimuth * Math.PI) / 180
    const kx = Math.cos(rad) * KEY_LIGHT_RADIUS
    const ky = Math.sin(rad) * KEY_LIGHT_RADIUS
    return [
      [kx, ky, KEY_LIGHT_HEIGHT],
      [-kx, -ky, FILL_LIGHT_HEIGHT],
    ]
  }, [keyLightAzimuth])

  return (
    <Canvas
      className="!h-full !w-full"
      camera={{ fov: 45, position: [100, 100, 100], up: [0, 0, 1] }}
      gl={{ localClippingEnabled: true }}
      frameloop="demand"
    >
      <color attach="background" args={['#0b1120']} />
      {/* position marks the "sky" direction for the gradient — Z-up here, matching the scene. */}
      <hemisphereLight position={[0, 0, 1]} intensity={ambientIntensity} groundColor="#1e293b" />
      <directionalLight position={keyPos} intensity={keyLightIntensity} castShadow />
      <directionalLight position={fillPos} intensity={fillLightIntensity} />
      <ModelMesh />
      <CameraRig boundingBox={boundingBox} fitToViewToken={fitToViewToken} />
    </Canvas>
  )
}
