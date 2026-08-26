import type { StlAnalysis } from '../../types/model'

/**
 * three.js's modern color-managed pipeline treats raw values written into a
 * geometry `color` attribute as already being in *linear* color space — but
 * hex colors like Tailwind's `#eab308` are sRGB-encoded (the same space as
 * CSS/PNG/every color picker). Writing sRGB bytes/255 straight into the
 * attribute renders visibly washed out/wrong, so every heatmap color is
 * converted to linear once here before use.
 */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function srgbHexToLinear(r: number, g: number, b: number): [number, number, number] {
  return [srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)]
}

const OK_COLOR = srgbHexToLinear(148, 163, 184) // slate-400
const OVERHANG_LOW_COLOR = srgbHexToLinear(234, 179, 8) // yellow-500
const OVERHANG_HIGH_COLOR = srgbHexToLinear(239, 68, 68) // red-500

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Computes volume, surface area, center of mass, and overhang classification
 * in a single pass over the triangles. Volume/area/COM assume a closed,
 * consistently-wound manifold mesh (the standard STL convention — outward
 * normals, CCW winding viewed from outside); a non-manifold or inside-out
 * mesh will still produce a number, just not a physically meaningful one.
 *
 * Volume and center of mass use the signed-tetrahedron-from-origin method:
 * each triangle (v0,v1,v2) forms a tetrahedron with the origin, contributing
 * a signed volume of dot(v0, v1×v2)/6 and a centroid of (v0+v1+v2)/4; summing
 * (and origin-independence falls out because the mesh is closed) gives the
 * true solid volume and volume-weighted center of mass.
 */
export function analyzeStl(
  positions: Float32Array,
  normals: Float32Array,
  overhangThresholdDegrees: number,
): StlAnalysis {
  const triangleCount = positions.length / 9
  const overhangColors = new Float32Array(positions.length)

  let volumeSum = 0
  let areaSum = 0
  let overhangAreaSum = 0
  let comX = 0
  let comY = 0
  let comZ = 0

  for (let t = 0; t < triangleCount; t++) {
    const o = t * 9
    const v0x = positions[o]
    const v0y = positions[o + 1]
    const v0z = positions[o + 2]
    const v1x = positions[o + 3]
    const v1y = positions[o + 4]
    const v1z = positions[o + 5]
    const v2x = positions[o + 6]
    const v2y = positions[o + 7]
    const v2z = positions[o + 8]

    // Signed tetrahedron volume with the origin: dot(v0, v1 x v2) / 6.
    const crossX = v1y * v2z - v1z * v2y
    const crossY = v1z * v2x - v1x * v2z
    const crossZ = v1x * v2y - v1y * v2x
    const signedVol = (v0x * crossX + v0y * crossY + v0z * crossZ) / 6

    volumeSum += signedVol
    comX += ((v0x + v1x + v2x) / 4) * signedVol
    comY += ((v0y + v1y + v2y) / 4) * signedVol
    comZ += ((v0z + v1z + v2z) / 4) * signedVol

    // Triangle area = 0.5 * |edge1 x edge2|.
    const e1x = v1x - v0x
    const e1y = v1y - v0y
    const e1z = v1z - v0z
    const e2x = v2x - v0x
    const e2y = v2y - v0y
    const e2z = v2z - v0z
    const nx0 = e1y * e2z - e1z * e2y
    const ny0 = e1z * e2x - e1x * e2z
    const nz0 = e1x * e2y - e1y * e2x
    const area = 0.5 * Math.sqrt(nx0 * nx0 + ny0 * ny0 + nz0 * nz0)
    areaSum += area

    // Overhang tilt from the file's face normal (defensively re-normalized —
    // not every slicer/exporter guarantees unit-length STL normals).
    let nx = normals[o]
    let ny = normals[o + 1]
    let nz = normals[o + 2]
    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    nx /= nLen
    ny /= nLen
    nz /= nLen

    let color = OK_COLOR
    if (nz < 0) {
      const tiltDeg = (Math.asin(Math.min(1, -nz)) * 180) / Math.PI
      if (tiltDeg > overhangThresholdDegrees) {
        overhangAreaSum += area
        const severity = Math.min(
          1,
          (tiltDeg - overhangThresholdDegrees) / (90 - overhangThresholdDegrees || 1),
        )
        color = [
          lerp(OVERHANG_LOW_COLOR[0], OVERHANG_HIGH_COLOR[0], severity),
          lerp(OVERHANG_LOW_COLOR[1], OVERHANG_HIGH_COLOR[1], severity),
          lerp(OVERHANG_LOW_COLOR[2], OVERHANG_HIGH_COLOR[2], severity),
        ]
      }
    }
    for (let v = 0; v < 3; v++) {
      overhangColors[o + v * 3] = color[0]
      overhangColors[o + v * 3 + 1] = color[1]
      overhangColors[o + v * 3 + 2] = color[2]
    }
  }

  const volumeMm3 = Math.abs(volumeSum)
  const centerOfMass =
    Math.abs(volumeSum) > 1e-9
      ? { x: comX / volumeSum, y: comY / volumeSum, z: comZ / volumeSum }
      : { x: 0, y: 0, z: 0 }

  return {
    volumeMm3,
    surfaceAreaMm2: areaSum,
    centerOfMass,
    overhangThresholdDegrees,
    overhangAreaFraction: areaSum > 0 ? overhangAreaSum / areaSum : 0,
    overhangColors,
  }
}
