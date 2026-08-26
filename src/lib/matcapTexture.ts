import * as THREE from 'three'
import type { MatcapPreset } from '../types/model'

/**
 * A matcap encodes lighting as a sphere viewed head-on: sampling it by the
 * model's screen-space normal fakes lighting cheaply and consistently,
 * independent of the scene's actual lights. Each preset here is generated
 * on a canvas at runtime (rather than bundling/fetching image assets) by
 * layering a few radial gradients over a base tone.
 */
interface MatcapConfig {
  /** Base fill tone the highlight/rim gradients are layered over. */
  base: string
  /** Peak opacity of the primary highlight, and how far it spreads (0–1 of canvas size). */
  highlight: { opacity: number; radius: number; color: string }
  /** A second, tighter hotspot for a sharper specular glint (metal/plastic). Omit for a matte look. */
  specular?: { opacity: number; radius: number; color: string }
  /** How dark the rim gets at the very edge of the sphere. */
  rimOpacity: number
}

const MATCAP_CONFIGS: Record<MatcapPreset, MatcapConfig> = {
  clay: {
    base: '#8a8a8a',
    highlight: { opacity: 0.95, radius: 0.55, color: '255,255,255' },
    rimOpacity: 0.55,
  },
  metal: {
    base: '#4d525c',
    highlight: { opacity: 0.55, radius: 0.6, color: '210,220,235' },
    specular: { opacity: 1, radius: 0.12, color: '255,255,255' },
    rimOpacity: 0.75,
  },
  plastic: {
    base: '#7fa8c9',
    highlight: { opacity: 0.85, radius: 0.5, color: '255,255,255' },
    specular: { opacity: 0.95, radius: 0.08, color: '255,255,255' },
    rimOpacity: 0.35,
  },
  ceramic: {
    base: '#e8e4da',
    highlight: { opacity: 0.6, radius: 0.65, color: '255,255,255' },
    specular: { opacity: 0.9, radius: 0.06, color: '255,255,255' },
    rimOpacity: 0.2,
  },
}

function renderMatcap(config: MatcapConfig, size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Base fill (the material's `color` prop multiplies this).
  ctx.fillStyle = config.base
  ctx.fillRect(0, 0, size, size)

  // Soft highlight, offset toward the upper-left like a key light.
  const cx = size * 0.35
  const cy = size * 0.32
  const highlight = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * config.highlight.radius)
  highlight.addColorStop(0, `rgba(${config.highlight.color},${config.highlight.opacity})`)
  highlight.addColorStop(0.4, `rgba(${config.highlight.color},${config.highlight.opacity * 0.35})`)
  highlight.addColorStop(1, `rgba(${config.highlight.color},0)`)
  ctx.fillStyle = highlight
  ctx.fillRect(0, 0, size, size)

  // Tight specular glint for shinier materials (metal, plastic, ceramic).
  if (config.specular) {
    const spec = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * config.specular.radius)
    spec.addColorStop(0, `rgba(${config.specular.color},${config.specular.opacity})`)
    spec.addColorStop(1, `rgba(${config.specular.color},0)`)
    ctx.fillStyle = spec
    ctx.fillRect(0, 0, size, size)
  }

  // Darker rim toward the edge of the sphere, where matcap normals point away from camera.
  const rim = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.32,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  )
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, `rgba(0,0,0,${config.rimOpacity})`)
  ctx.fillStyle = rim
  ctx.fillRect(0, 0, size, size)

  return canvas
}

const cache = new Map<MatcapPreset, THREE.CanvasTexture>()

/** Lazily builds and caches one texture per preset — same instance reused across meshes. */
export function getMatcapTexture(preset: MatcapPreset): THREE.CanvasTexture {
  let texture = cache.get(preset)
  if (!texture) {
    texture = new THREE.CanvasTexture(renderMatcap(MATCAP_CONFIGS[preset]))
    texture.colorSpace = THREE.SRGBColorSpace
    cache.set(preset, texture)
  }
  return texture
}
