import type { BoundingBox, ParsedSTL } from '../../types/model'

/**
 * Parses an STL file (binary or ASCII) into flat typed arrays ready for
 * THREE.BufferGeometry, plus basic measurements.
 *
 * Runs on whatever thread calls it — intended to be invoked from within
 * `stlParser.worker.ts` so large files never block the main thread.
 */
export function parseSTL(buffer: ArrayBuffer): ParsedSTL {
  if (isBinarySTL(buffer)) {
    return parseBinarySTL(buffer)
  }
  return parseAsciiSTL(buffer)
}

/**
 * Binary STL: 80-byte header, 4-byte uint32 triangle count, then
 * 50 bytes per triangle (12 bytes normal + 3x12 bytes vertices + 2 byte
 * attribute byte count). ASCII STL starts with the literal text "solid ",
 * but some binary files also start with "solid " in their header, so we
 * additionally validate the file length matches the binary layout.
 */
function isBinarySTL(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false

  const view = new DataView(buffer)
  const triangleCount = view.getUint32(80, true)
  const expectedLength = 84 + triangleCount * 50
  if (expectedLength === buffer.byteLength) return true

  // Doesn't match binary layout — check if it looks like ASCII text.
  const headerBytes = new Uint8Array(buffer, 0, Math.min(512, buffer.byteLength))
  const header = new TextDecoder('ascii').decode(headerBytes)
  return !header.includes('solid')
}

function parseBinarySTL(buffer: ArrayBuffer): ParsedSTL {
  const view = new DataView(buffer)
  const triangleCount = view.getUint32(80, true)

  const positions = new Float32Array(triangleCount * 9)
  const normals = new Float32Array(triangleCount * 9)

  let offset = 84
  for (let i = 0; i < triangleCount; i++) {
    const nx = view.getFloat32(offset, true)
    const ny = view.getFloat32(offset + 4, true)
    const nz = view.getFloat32(offset + 8, true)
    offset += 12

    for (let v = 0; v < 3; v++) {
      const posIndex = i * 9 + v * 3
      positions[posIndex] = view.getFloat32(offset, true)
      positions[posIndex + 1] = view.getFloat32(offset + 4, true)
      positions[posIndex + 2] = view.getFloat32(offset + 8, true)
      normals[posIndex] = nx
      normals[posIndex + 1] = ny
      normals[posIndex + 2] = nz
      offset += 12
    }

    offset += 2 // skip attribute byte count
  }

  return {
    positions,
    normals,
    triangleCount,
    vertexCount: triangleCount * 3,
    boundingBox: computeBoundingBox(positions),
    format: 'binary',
  }
}

const ASCII_FLOAT_RE = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g

function parseAsciiSTL(buffer: ArrayBuffer): ParsedSTL {
  const text = new TextDecoder('utf-8').decode(buffer)

  const positionsList: number[] = []
  const normalsList: number[] = []

  let currentNormal: [number, number, number] = [0, 0, 0]
  const lines = text.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith('facet normal')) {
      const nums = line.match(ASCII_FLOAT_RE)
      if (nums && nums.length >= 3) {
        currentNormal = [Number(nums[0]), Number(nums[1]), Number(nums[2])]
      }
    } else if (line.startsWith('vertex')) {
      const nums = line.match(ASCII_FLOAT_RE)
      if (nums && nums.length >= 3) {
        positionsList.push(Number(nums[0]), Number(nums[1]), Number(nums[2]))
        normalsList.push(...currentNormal)
      }
    }
  }

  const positions = new Float32Array(positionsList)
  const normals = new Float32Array(normalsList)
  const vertexCount = positions.length / 3

  return {
    positions,
    normals,
    triangleCount: Math.floor(vertexCount / 3),
    vertexCount,
    boundingBox: computeBoundingBox(positions),
    format: 'ascii',
  }
}

function computeBoundingBox(positions: Float32Array): BoundingBox {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }

  // Empty geometry — avoid returning Infinity into consumers.
  if (positions.length === 0) {
    minX = minY = minZ = maxX = maxY = maxZ = 0
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
  }
}
