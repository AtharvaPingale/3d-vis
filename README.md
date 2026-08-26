# 3D Print Viewer

A browser-based STL and G-code viewer with print analysis — upload a 3D
model or a sliced print file and get an interactive, color-coded view of it.
Parsing and rendering all happen client-side; nothing you drop in ever
leaves the browser.

**[Try the sample files](#getting-started)** — the app ships with a bundled
STL and G-code (both a real sliced [3DBenchy](https://www.3dbenchy.com/)) so
you can try it with one click, no file of your own required.

## Features

### STL viewer
- Drag-and-drop upload (binary and ASCII STL), with size/format validation
- Parsing runs in a Web Worker so large files never freeze the tab
- Orbit/pan/zoom camera, auto-framed to the model
- Solid and matcap shading (four procedurally-generated matcap materials:
  clay, metal, plastic, ceramic — no bundled image assets)
- Single-axis clipping plane with a draggable slider
- Adjustable scene lighting (ambient/key/fill intensity, key light rotation)
- **Analysis**: volume, surface area, and center of mass (via a
  volume-weighted tetrahedron decomposition, not naive vertex averaging),
  plus overhang detection with a toggleable yellow→red heatmap and an
  adjustable angle threshold

### G-code / toolpath viewer
- Tokenizes `G0`/`G1`/`G92` moves, absolute *and* relative (`G90`/`G91`,
  `M82`/`M83`) positioning, layer-change comments (Cura `;LAYER:`,
  PrusaSlicer/SuperSlicer `;LAYER_CHANGE`), and a Z-height fallback when
  neither is present
- Color-coded by move type: travel, first layer, perimeter/wall, infill,
  support — falls back gracefully to travel/extrusion-only when the file
  has no `;TYPE:` comments
- Layer scrubber with build-up or isolated-range (`layers 40–60`) view modes
- Playback with play/pause, step-by-layer, and a 0.5×–10× speed control —
  duration-weighted (a slow move takes proportionally longer on screen) but
  time-compressed so a real print doesn't take its real ~hour+ to watch
- Animated toolhead marker with live X/Y/Z, extrusion, and elapsed/remaining
  time readouts
- Parsing runs in a Web Worker with progress reporting

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL, then either drag a `.stl`/`.gcode` file onto the
dropzone or click one of the "Try the sample" buttons.

Other scripts:

```bash
npm run build    # typecheck + production build to dist/
npm run preview  # serve the production build locally
npm run lint     # oxlint
```

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Vite + React (TypeScript) |
| 3D rendering | React Three Fiber + drei, on top of Three.js |
| State | Zustand |
| Parsing | Hand-written STL and G-code parsers, run in Web Workers via Comlink |
| Styling | Tailwind CSS v4 |
| File handling | Browser File API + react-dropzone |

No backend or database — everything, including the sample files, is a
static asset served alongside the app.

## Project structure

```
src/
├── components/
│   ├── upload/       Dropzone (routes .stl vs .gcode by extension)
│   └── viewer/        Canvas, mesh/toolpath renderers, camera, all UI panels
├── lib/
│   ├── parsers/         STL and G-code tokenizers + move classification —
│   │                    build renderable typed-array buffers directly,
│   │                    no separate geometry-construction step
│   ├── analysis/        STL geometric analysis (volume/area/COM/overhangs)
│   ├── workers/         Web Worker entry points (Comlink.expose)
│   └── *WorkerClient.ts Comlink-wrapped singleton worker handles
├── store/              Zustand stores (STL viewer state, G-code/playback state)
└── types/model.ts       Shared types for parsed data
```

## Known limitations

- **G-code timing is an estimate**, not a real slicer's — it's `distance /
  feedrate` per move with no acceleration/jerk modeling, so it tends to run
  faster than a slicer's own printed time estimate.
- **G28 homing** isn't modeled during G-code parsing (assumed to land at the
  machine origin) — rare mid-print, and start G-code almost always sets an
  explicit absolute position immediately after anyway.
- **Very large G-code files** (100k+ moves) parse in a single synchronous
  pass inside the worker — off the main thread, so the UI stays responsive,
  but not yet chunked/incrementally streamed. Untested against a real
  50–200MB file.
- **Thin-wall detection and an overall printability score** (both planned)
  aren't implemented.
- STL volume/area/center-of-mass assume a closed, consistently-wound
  manifold mesh — the standard STL convention. A non-manifold or
  inside-out mesh will still produce a number, just not a meaningful one.

See [PLAN.md](PLAN.md) for the full project plan, phase-by-phase status, and
the reasoning behind various architecture decisions.
