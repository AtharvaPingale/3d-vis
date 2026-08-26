import type { BoundingBox, GcodeTimeline, LayerRange, MoveType, ParsedGcode } from '../../types/model'
import { classifyMove, mapTypeComment, MOVE_TYPE_ORDER } from './gcodeCommands'

const EXTRUSION_EPSILON = 1e-5
const DEFAULT_FEEDRATE_MM_PER_MIN = 1500
const LAYER_MARKER_RE = /^;LAYER:(-?\d+)/i
const LAYER_CHANGE_RE = /^;LAYER_CHANGE/i
const TYPE_COMMENT_RE = /^;TYPE:(.+)/i

interface ParseState {
  x: number
  y: number
  z: number
  /** Absolute extruder position including any G92 offset — see the G92 handling below. */
  virtualE: number
  eOffset: number
  feedrate: number
  layerIndex: number
  lastZ: number | null
  usingExplicitMarkers: boolean
  typeCategory: MoveType | null
  /** G90/G91 — affects X/Y/Z. Most firmware/slicer combos flip E along with it too
   * (an explicit M82/M83 below overrides that for E specifically). */
  positionRelative: boolean
  extrusionRelative: boolean
}

function parseArgs(rest: string): Record<string, number> {
  const args: Record<string, number> = {}
  const re = /([XYZEF])(-?\d*\.?\d+(?:[eE][+-]?\d+)?)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(rest))) {
    args[match[1]] = Number(match[2])
  }
  return args
}

/**
 * Parses G-code text into:
 *  - `categories`: per-category flat position buffers for the static toolpath
 *    render (one draw call per category), plus `layerRanges` so the viewer
 *    can slice each category down to a layer window with `setDrawRange`.
 *  - `timeline`: a move-by-move chronological record (position, layer,
 *    estimated duration, cumulative extrusion) for playback — the toolhead
 *    marker and live readouts need a single cursor across all categories,
 *    which the per-category buffers can't give since they interleave.
 *
 * Starts in absolute mode (G90) per the vast majority of sliced output, and
 * switches to relative on G91 — needed for the "wipe out / present print"
 * sequences many slicers' end G-code uses. G28 homing is not modeled
 * (assumed to land at the origin), since it's rare mid-print and start
 * G-code typically sets an explicit absolute position immediately after.
 *
 * `onProgress`, if given, is awaited every `progressIntervalLines` lines so
 * a caller wrapping this in a Web Worker can forward progress to the main
 * thread without the parse loop starving the worker's own message pump.
 */
export async function parseGcode(
  text: string,
  onProgress?: (fraction: number) => void | Promise<void>,
): Promise<ParsedGcode> {
  const lines = text.split('\n')
  const totalLines = lines.length
  const progressIntervalLines = Math.max(1, Math.floor(totalLines / 200))

  const buffers: Record<MoveType, number[]> = {
    travel: [],
    firstLayer: [],
    perimeter: [],
    infill: [],
    support: [],
    extrude: [],
  }

  // One boundary snapshot per layer transition: per-category buffer lengths
  // (for layerRanges) and the timeline move count (for layerStartMove).
  const layerCategoryBoundaries: Record<MoveType, number>[] = []
  const layerMoveBoundaries: number[] = []
  let lastRecordedLayer = -1

  const timelinePositions: number[] = []
  const timelineLayerIndex: number[] = []
  const timelineDuration: number[] = []
  const timelineCumulativeDuration: number[] = []
  const timelineCumulativeExtrusion: number[] = []
  let cumulativeExtrusion = 0
  let cumulativeDuration = 0

  const state: ParseState = {
    x: 0,
    y: 0,
    z: 0,
    virtualE: 0,
    eOffset: 0,
    feedrate: DEFAULT_FEEDRATE_MM_PER_MIN,
    layerIndex: -1,
    lastZ: null,
    usingExplicitMarkers: false,
    typeCategory: null,
    positionRelative: false,
    extrusionRelative: false,
  }

  let hasTypeComments = false
  let moveCount = 0

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  const touch = (x: number, y: number, z: number) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i].trim()
    if (line.length === 0) continue

    if (line[0] === ';') {
      const layerMatch = line.match(LAYER_MARKER_RE)
      if (layerMatch) {
        state.layerIndex = Number(layerMatch[1])
        state.usingExplicitMarkers = true
      } else if (LAYER_CHANGE_RE.test(line)) {
        state.layerIndex += 1
        state.usingExplicitMarkers = true
      } else {
        const typeMatch = line.match(TYPE_COMMENT_RE)
        if (typeMatch) {
          hasTypeComments = true
          state.typeCategory = mapTypeComment(typeMatch[1])
        }
      }
      continue
    }

    // Strip inline comments before tokenizing the command itself.
    const commentIdx = line.indexOf(';')
    const command = commentIdx >= 0 ? line.slice(0, commentIdx).trim() : line
    if (command.length === 0) continue

    const code = command.slice(0, command.indexOf(' ') > 0 ? command.indexOf(' ') : undefined)
    const rest = command.slice(code.length)

    if (code === 'G0' || code === 'G1') {
      const args = parseArgs(rest)
      const fromX = state.x
      const fromY = state.y
      const fromZ = state.z

      const toX = args.X === undefined ? state.x : state.positionRelative ? state.x + args.X : args.X
      const toY = args.Y === undefined ? state.y : state.positionRelative ? state.y + args.Y : args.Y
      const toZ = args.Z === undefined ? state.z : state.positionRelative ? state.z + args.Z : args.Z
      if (args.F !== undefined) state.feedrate = args.F

      let eDelta = 0
      if (args.E !== undefined) {
        if (state.extrusionRelative) {
          eDelta = args.E
          state.virtualE += eDelta
        } else {
          const newVirtualE = args.E + state.eOffset
          eDelta = newVirtualE - state.virtualE
          state.virtualE = newVirtualE
        }
      }

      const moved = toX !== fromX || toY !== fromY || toZ !== fromZ
      state.x = toX
      state.y = toY
      state.z = toZ

      if (!state.usingExplicitMarkers && toZ !== state.lastZ) {
        state.layerIndex += 1
        state.lastZ = toZ
      } else if (toZ !== state.lastZ) {
        state.lastZ = toZ
      }

      if (moved) {
        const effectiveLayer = Math.max(state.layerIndex, 0)
        if (effectiveLayer !== lastRecordedLayer) {
          while (layerCategoryBoundaries.length <= effectiveLayer) {
            layerCategoryBoundaries.push({
              travel: buffers.travel.length,
              firstLayer: buffers.firstLayer.length,
              perimeter: buffers.perimeter.length,
              infill: buffers.infill.length,
              support: buffers.support.length,
              extrude: buffers.extrude.length,
            })
            layerMoveBoundaries.push(moveCount)
          }
          lastRecordedLayer = effectiveLayer
        }

        const isExtruding = eDelta > EXTRUSION_EPSILON
        const category = classifyMove(isExtruding, state.layerIndex, state.typeCategory)
        buffers[category].push(fromX, fromY, fromZ, toX, toY, toZ)
        touch(fromX, fromY, fromZ)
        touch(toX, toY, toZ)

        if (eDelta > 0) cumulativeExtrusion += eDelta
        const dx = toX - fromX
        const dy = toY - fromY
        const dz = toZ - fromZ
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        const durationSeconds = state.feedrate > 0 ? distance / (state.feedrate / 60) : 0
        cumulativeDuration += durationSeconds

        timelinePositions.push(toX, toY, toZ)
        timelineLayerIndex.push(effectiveLayer)
        timelineDuration.push(durationSeconds)
        timelineCumulativeDuration.push(cumulativeDuration)
        timelineCumulativeExtrusion.push(cumulativeExtrusion)

        moveCount++
      }
    } else if (code === 'G92') {
      const args = parseArgs(rest)
      if (args.E !== undefined) {
        state.eOffset = state.virtualE - args.E
      }
    } else if (code === 'G90') {
      state.positionRelative = false
      state.extrusionRelative = false
    } else if (code === 'G91') {
      state.positionRelative = true
      state.extrusionRelative = true
    } else if (code === 'M82') {
      state.extrusionRelative = false
    } else if (code === 'M83') {
      state.extrusionRelative = true
    }

    if (i % progressIntervalLines === 0 && onProgress) {
      await onProgress(i / totalLines)
    }
  }

  if (onProgress) await onProgress(1)

  const categories = Object.fromEntries(
    MOVE_TYPE_ORDER.map((type) => [type, Float32Array.from(buffers[type])]),
  ) as Record<MoveType, Float32Array>

  const layerCount = layerMoveBoundaries.length

  const layerRanges = Object.fromEntries(
    MOVE_TYPE_ORDER.map((type) => {
      const ranges: LayerRange[] = []
      for (let l = 0; l < layerCount; l++) {
        const startFloat = layerCategoryBoundaries[l][type]
        const endFloat =
          l + 1 < layerCount ? layerCategoryBoundaries[l + 1][type] : buffers[type].length
        // 3 floats/vertex; each buffer entry is already a multiple of 6 (2 vertices/segment).
        ranges.push({ start: startFloat / 3, count: (endFloat - startFloat) / 3 })
      }
      return [type, ranges]
    }),
  ) as Record<MoveType, LayerRange[]>

  const timeline: GcodeTimeline = {
    positions: Float32Array.from(timelinePositions),
    layerIndex: Int32Array.from(timelineLayerIndex),
    durationSeconds: Float32Array.from(timelineDuration),
    cumulativeDurationSeconds: Float32Array.from(timelineCumulativeDuration),
    cumulativeExtrusion: Float32Array.from(timelineCumulativeExtrusion),
    layerStartMove: Uint32Array.from([...layerMoveBoundaries, moveCount]),
    totalDurationSeconds: cumulativeDuration,
  }

  const empty = moveCount === 0
  const boundingBox: BoundingBox = empty
    ? { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, size: { x: 0, y: 0, z: 0 } }
    : {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
      }

  return {
    categories,
    layerRanges,
    timeline,
    boundingBox,
    layerCount,
    moveCount,
    hasTypeComments,
  }
}
