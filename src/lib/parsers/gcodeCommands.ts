import type { MoveType } from '../../types/model'

/** Display order and hex colors for each move category, per PLAN.md's color coding. */
export const MOVE_TYPE_ORDER: MoveType[] = [
  'firstLayer',
  'perimeter',
  'infill',
  'support',
  'extrude',
  'travel',
]

export const MOVE_TYPE_COLORS: Record<MoveType, string> = {
  travel: '#38bdf8', // blue
  firstLayer: '#a855f7', // purple
  perimeter: '#22c55e', // green
  infill: '#eab308', // yellow
  support: '#ef4444', // red
  extrude: '#e2e8f0', // neutral fallback for unrecognized/unlabeled extrusion
}

export const MOVE_TYPE_LABELS: Record<MoveType, string> = {
  travel: 'Travel',
  firstLayer: 'First layer',
  perimeter: 'Perimeter / wall',
  infill: 'Infill',
  support: 'Support',
  extrude: 'Extrusion (unlabeled)',
}

/**
 * Maps a slicer's `;TYPE:` comment value to our category. Covers the Cura
 * and PrusaSlicer/SuperSlicer conventions called out in PLAN.md; anything
 * else (skirt, brim, prime tower, custom) is left unmapped so it falls
 * back to the generic 'extrude' category rather than a wrong label.
 */
const TYPE_COMMENT_MAP: Record<string, MoveType> = {
  'WALL-OUTER': 'perimeter',
  'WALL-INNER': 'perimeter',
  WALL: 'perimeter',
  PERIMETER: 'perimeter',
  'EXTERNAL PERIMETER': 'perimeter',
  FILL: 'infill',
  INFILL: 'infill',
  SKIN: 'infill',
  'TOP-SKIN': 'infill',
  'BOTTOM-SKIN': 'infill',
  'SOLID-INFILL': 'infill',
  'TOP-SOLID-INFILL': 'infill',
  SUPPORT: 'support',
  'SUPPORT-INTERFACE': 'support',
  'SUPPORT MATERIAL': 'support',
  'SUPPORT MATERIAL INTERFACE': 'support',
}

/** Returns the mapped category for a `;TYPE:<value>` comment, or null if unrecognized. */
export function mapTypeComment(rawType: string): MoveType | null {
  return TYPE_COMMENT_MAP[rawType.trim().toUpperCase()] ?? null
}

/**
 * Classifies one move given whether it extrudes, its layer index, and the
 * most recently seen `;TYPE:` category (if any). See MoveType's doc comment
 * for the priority order.
 */
export function classifyMove(
  isExtruding: boolean,
  layerIndex: number,
  typeCategory: MoveType | null,
): MoveType {
  if (!isExtruding) return 'travel'
  if (layerIndex <= 0) return 'firstLayer'
  return typeCategory ?? 'extrude'
}
