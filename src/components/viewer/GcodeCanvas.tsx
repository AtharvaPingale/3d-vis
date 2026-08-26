import { Canvas } from '@react-three/fiber'
import { useGcodeStore } from '../../store/gcodeStore'
import { CameraRig } from './CameraRig'
import { PlaybackDriver } from './PlaybackDriver'
import { ToolheadMarker } from './ToolheadMarker'
import { ToolpathMesh } from './ToolpathMesh'

export function GcodeCanvas() {
  const boundingBox = useGcodeStore((s) => s.data?.boundingBox ?? null)
  const fitToViewToken = useGcodeStore((s) => s.fitToViewToken)
  const isPlaying = useGcodeStore((s) => s.isPlaying)

  return (
    <Canvas
      className="!h-full !w-full"
      camera={{ fov: 45, position: [100, 100, 100], up: [0, 0, 1] }}
      // Continuous rendering while playback advances the toolhead each frame;
      // otherwise on-demand, since the scene is static between interactions.
      frameloop={isPlaying ? 'always' : 'demand'}
    >
      <color attach="background" args={['#05070d']} />
      <ToolpathMesh />
      <ToolheadMarker />
      <PlaybackDriver />
      <CameraRig boundingBox={boundingBox} fitToViewToken={fitToViewToken} />
    </Canvas>
  )
}
