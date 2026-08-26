import { useFrame } from '@react-three/fiber'
import { lowerBound } from '../../lib/binarySearch'
import { useGcodeStore } from '../../store/gcodeStore'

/**
 * Whole print plays out over this many real seconds at 1x, regardless of
 * the print's actual estimated duration — nobody's watching a real-time
 * 79-minute animation. Playback is still duration-weighted (a slow,
 * short move still takes proportionally longer on screen than a long,
 * fast one), just compressed into a watchable window.
 */
const PLAYBACK_BASE_SECONDS = 45

/**
 * No visual output — lives inside the Canvas purely to get a `useFrame`
 * tick, and advances the store's `currentMoveIndex` while playing. Reads
 * the store imperatively (`getState()`) each tick rather than via the
 * reactive hook, since useFrame runs outside React's render cycle.
 */
export function PlaybackDriver() {
  useFrame((_, delta) => {
    const { data, isPlaying, speed, currentMoveIndex, setCurrentMoveIndex, pause } =
      useGcodeStore.getState()
    if (!isPlaying || !data || data.moveCount === 0) return

    const { cumulativeDurationSeconds, totalDurationSeconds } = data.timeline
    const elapsedNow = cumulativeDurationSeconds[currentMoveIndex] ?? 0
    const timeScale = totalDurationSeconds / PLAYBACK_BASE_SECONDS || 1
    const nextElapsed = elapsedNow + delta * speed * timeScale

    if (nextElapsed >= totalDurationSeconds) {
      setCurrentMoveIndex(data.moveCount - 1)
      pause()
      return
    }

    const nextIndex = lowerBound(cumulativeDurationSeconds, nextElapsed)
    if (nextIndex !== currentMoveIndex) setCurrentMoveIndex(nextIndex)
  })

  return null
}
