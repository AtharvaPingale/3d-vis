/** Axis-aligned bounding box in model units (mm, assumed). */
export interface BoundingBox {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
}

/** Result of parsing an STL file into renderable, measured geometry. */
export interface ParsedSTL {
  /** Flat Float32Array of vertex positions, 3 floats per vertex, ready for BufferGeometry. */
  positions: Float32Array
  /** Flat Float32Array of per-vertex normals, same layout as positions. */
  normals: Float32Array
  triangleCount: number
  vertexCount: number
  boundingBox: BoundingBox
  format: 'binary' | 'ascii'
}

export type ShadingMode = 'solid' | 'matcap'

export type MatcapPreset = 'clay' | 'metal' | 'plastic' | 'ceramic'

export type ClipAxis = 'x' | 'y' | 'z' | null

/**
 * Move color classification, in priority order (see gcodeCommands.ts):
 * non-extruding moves are always 'travel'; extruding moves on the first
 * layer are always 'firstLayer' regardless of slicer type comments;
 * otherwise a recognized `;TYPE:` comment gives perimeter/infill/support;
 * anything extruding with no recognized type falls back to 'extrude'.
 */
export type MoveType =
  | 'travel'
  | 'firstLayer'
  | 'perimeter'
  | 'infill'
  | 'support'
  | 'extrude'

/** Vertex-index range (for THREE's `geometry.setDrawRange`) covering one layer within a category's buffer. */
export interface LayerRange {
  start: number
  count: number
}

/**
 * Move-level data in original file order, for playback: the toolhead marker
 * and live readouts (Phase 2b) need a single chronological cursor, which the
 * per-category buffers below can't give since they interleave categories.
 * Deliberately separate from `categories` — those stay layer-range-sliceable
 * per category for the (cheaper, coarser) layer scrubber/isolation view.
 */
export interface GcodeTimeline {
  /** Endpoint ("to") position of each move, in file order, 3 floats per move. */
  positions: Float32Array
  /** Layer index of each move (negative/pre-first-layer moves clamped to 0). */
  layerIndex: Int32Array
  /** Estimated duration of each move in seconds (segment length / feedrate). */
  durationSeconds: Float32Array
  /** Running sum of durationSeconds up to and including this move — O(1) elapsed-time lookups. */
  cumulativeDurationSeconds: Float32Array
  /** Total filament extruded so far, mm, at this move's endpoint (retractions don't reduce it). */
  cumulativeExtrusion: Float32Array
  /** Move index of each layer's first move; length layerCount + 1, last entry = moveCount. */
  layerStartMove: Uint32Array
  totalDurationSeconds: number
}

/** Result of parsing a G-code file into renderable toolpath segments. */
export interface ParsedGcode {
  /**
   * Flat Float32Array of line-segment endpoints per category, 3 floats per
   * point, 2 points per move (from -> to). One category = one draw call.
   */
  categories: Record<MoveType, Float32Array>
  /** Per category, one LayerRange per layer — always contiguous since layers only advance forward. */
  layerRanges: Record<MoveType, LayerRange[]>
  timeline: GcodeTimeline
  boundingBox: BoundingBox
  layerCount: number
  moveCount: number
  /** False when no `;TYPE:` comments were found — perimeter/infill/support stay empty. */
  hasTypeComments: boolean
}

/**
 * Geometric analysis of a parsed STL. "Overhang" here means: the face's
 * downward tilt from vertical, in degrees — 0° is a straight vertical wall
 * (never an overhang), 90° is a flat horizontal underside (worst case).
 * Upward-facing faces are never flagged. A face is an overhang when this
 * tilt exceeds `overhangThresholdDegrees` (the common slicer-UI framing:
 * "the max angle a wall can lean before it needs support").
 */
export interface StlAnalysis {
  volumeMm3: number
  surfaceAreaMm2: number
  centerOfMass: { x: number; y: number; z: number }
  overhangThresholdDegrees: number
  /** Fraction (0–1) of total surface area classified as an overhang. */
  overhangAreaFraction: number
  /** Per-vertex RGB, 3 floats per vertex, for a heatmap material (flat per-triangle since STL normals are per-face). */
  overhangColors: Float32Array
}

