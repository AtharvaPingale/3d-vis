# 3D Print Viewer — Project Plan

A browser-based STL/G-code visualization and analysis tool. Upload a 3D model or a sliced print file, get an interactive viewer, and (eventually) a full print-analysis report — all running client-side.

---

## 1. Goals

- Build a portfolio-grade web app that demonstrates Three.js/WebGL, file parsing, geometry processing, Web Workers, and real product-level UI polish.
- Ship in three increasing phases (MVP → G-code playback → analysis dashboard) so there's always a demoable version.
- Keep parsing client-side for privacy and to avoid backend costs — no file ever needs to leave the browser for the core experience.
- Make the G-code toolpath playback the centerpiece demo feature.

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Vite + React (SPA, no SSR) | No routing/data-fetching complexity that would justify Next.js; Vite's dev server and HMR are noticeably better for a canvas-heavy app you're iterating on constantly |
| 3D rendering | React Three Fiber + drei | Wraps Three.js idiomatically in React |
| Core 3D engine | Three.js | STLLoader, BufferGeometry, OrbitControls |
| State | Zustand | Lightweight, avoids prop-drilling for viewer state (layer index, playback, colors) |
| Forms | react-hook-form | Used in Phase 3 for the analysis-settings forms (filament density/diameter, overhang angle threshold, unit preferences) |
| Parsing | Custom parsers in TypeScript | STL (binary + ASCII), G-code tokenizer |
| Heavy compute | Web Workers (Comlink) | G-code parsing, geometry decimation, analysis stats |
| Styling | Tailwind CSS | Fast iteration, consistent design tokens; keeps UI chrome from visually competing with the 3D viewer |
| File handling | Browser File API + `react-dropzone` | Drag & drop |
| Testing | Vitest + Playwright | Unit tests for parsers, e2e for upload → render flow |
| Deployment | Vercel or Netlify (static SPA) | Zero-config static hosting, no server runtime needed |

No backend/database required for MVP or V2. Optional lightweight backend (or serverless functions) only if you add save/share links in V3.

### Stack options considered and set aside

- **Nx monorepo** — earns its complexity when multiple apps/libs need to share code. This is a single app with nothing to share yet; adding Nx now is structural overhead with no payoff. Revisit only if this becomes part of a suite of portfolio tools sharing components.
- **Redux Toolkit** — the app's shared state (current layer, playback status, color-category visibility, selected file) is a small, single-owner tree with no cross-cutting async flows — the case Zustand handles with far less boilerplate. Redux would make sense if the app grows saved sessions, undo/redo history, or state shared across many independent feature areas.
- **MUI** — usable, but a component library tends to read as a generic admin panel unless the theme is heavily overridden, which fights the goal of the 3D viewer being the visual centerpiece. Tailwind + custom components keeps the UI chrome out of the way. Reasonable to swap in if theming time is available or if matching a work stack for practice reps matters more than this project's specific look.
- **i18n** — no real audience need for a technical portfolio piece aimed at English-speaking reviewers/recruiters; the setup overhead (react-i18next, locale files, switcher) isn't paid back here.

## 3. Architecture Overview

```
Vite React App
 ├── src/
 │    ├── main.tsx
 │    ├── App.tsx                  (routes: upload screen ↔ viewer screen via react-router or simple state)
 ├── components/
 │    ├── upload/Dropzone.tsx
 │    ├── viewer/SceneCanvas.tsx   (R3F <Canvas>)
 │    ├── viewer/ModelMesh.tsx     (STL render)
 │    ├── viewer/ToolpathMesh.tsx  (G-code render)
 │    ├── viewer/Controls.tsx      (orbit, shading mode, clipping plane)
 │    ├── viewer/PlaybackBar.tsx   (layer scrub, play/pause, speed)
 │    ├── viewer/StatsPanel.tsx    (dimensions, layer count, etc.)
 │    └── viewer/LegendColorKey.tsx
 ├── lib/
 │    ├── parsers/stlParser.ts
 │    ├── parsers/gcodeParser.ts
 │    ├── parsers/gcodeCommands.ts   (command classification: travel/perimeter/infill/support/first-layer)
 │    ├── geometry/toolpathToBufferGeometry.ts
 │    ├── geometry/boundingBox.ts
 │    ├── analysis/stlAnalysis.ts    (volume, surface area, overhangs, thin walls)
 │    ├── analysis/gcodeAnalysis.ts  (filament use, time estimate, retractions)
 │    └── workers/
 │         ├── stlParser.worker.ts
 │         ├── gcodeParser.worker.ts
 │         └── analysis.worker.ts
 ├── store/
 │    ├── viewerStore.ts            (zustand: STL model, shading/color/clip state)
 │    └── gcodeStore.ts             (zustand: parsed toolpath, category visibility, load status)
 └── types/
      └── model.ts                  (ParsedSTL, ParsedGcode, Toolpath, LayerRange, MoveType enum)
```

### Data flow (G-code path)

```
File (drag/drop)
  → File API (ArrayBuffer/text stream)
  → postMessage to Web Worker
  → gcodeParser.worker.ts tokenizes lines (G0/G1/G28/M104/etc.)
  → normalized Move[] { from, to, e, feedrate, type, layer }
  → grouped by layer → LayerData[]
  → main thread receives compact typed arrays (Float32Array for positions)
  → toolpathToBufferGeometry builds THREE.BufferGeometry with per-vertex color attribute
  → R3F renders via <lineSegments> or instanced segments
  → PlaybackBar drives a "draw range" / vertex count reveal for scrubbing
```

Using typed arrays and transferable objects when passing data out of the worker avoids structured-clone overhead on large files.

## 4. Phase Breakdown

### Phase 1 — MVP: STL Viewer
**Goal:** Upload an STL, see it, measure it.

- [ ] Project scaffold: Vite + React + Tailwind + R3F set up, deployed to Vercel from day one (empty shell)
- [ ] Drag & drop upload (`.stl` only), basic file validation (size limit, extension/magic-byte check)
- [ ] Binary STL parser (most common); ASCII STL parser as fallback, run in a Web Worker via Comlink so large files never block the main thread; UI shows a loading state while parsing
- [ ] Render mesh with `STLLoader` equivalent → `THREE.BufferGeometry`
- [ ] Orbit / pan / zoom via `OrbitControls` (drei's `<OrbitControls>`)
- [x] Shading modes: solid (MeshStandardMaterial), matcap option (wireframe dropped — matcap covers the "inspect the form" need better for this app)
- [ ] Compute + display: bounding box (X/Y/Z mm), triangle count, vertex count
- [ ] "Fit model to view" / reset camera button
- [ ] Basic material/color picker for the mesh
- [x] Lighting controls (not in the original plan, added ad hoc): ambient/key/fill intensity sliders + key light azimuth rotation, in Controls.tsx. No effect under Matcap shading (lighting-independent by design) — noted in the UI itself.
- [ ] Simple clipping plane (single axis-aligned plane, draggable slider) using `THREE.Plane` + `renderer.clippingPlanes`
- [ ] Empty/loading/error states for upload
- [x] Responsive layout — viewer screens stack (canvas on top, sidebar below and independently scrollable) below the `lg` breakpoint instead of the fixed sidebar-beside-canvas desktop layout; root uses `h-dvh` instead of `h-screen` to avoid mobile browser-chrome viewport jumps; chip/toggle buttons sized up for touch. Not tested on a real device/emulator (no browser available in this sandbox) — worth a manual check.

**Definition of done:** Can drop any reasonably-formed STL and get a clean, navigable, measured 3D view deployed at a public URL.

### Phase 2a — G-code Parsing + Static Colored Render
**Goal:** Upload sliced G-code, see the full toolpath rendered and color-coded, statically.

- [x] G-code tokenizer: parse `G0/G1` moves, `G92`, extrusion (`E`), feedrate (`F` parsed but unused until Phase 3 speed analysis), layer-change comments (Cura `;LAYER:`, PrusaSlicer/SuperSlicer `;LAYER_CHANGE`) plus a fallback Z-height-increase heuristic when neither marker is present. Assumes absolute positioning/extrusion (G90) — G91 relative mode isn't modeled.
- [x] Move classification heuristic (color coding), verified against a hand-traced synthetic file:
  - 🟦 Travel (no extrusion, G0 or G1 with E delta ≈ 0)
  - 🟣 First layer (layer index 0) — takes priority over type-based coloring, confirmed by test
  - 🟢 Perimeter/wall (`;TYPE:WALL-OUTER`/`WALL-INNER`/`PERIMETER` etc.)
  - 🟡 Infill (`;TYPE:FILL`/`SKIN`/`SOLID-INFILL` etc.)
  - 🔴 Support (`;TYPE:SUPPORT`/`SUPPORT-INTERFACE` etc.)
  - Fallback: no `;TYPE:` comments → only travel/first-layer/extrude populate, UI notes this in the legend
- [x] Move parsing runs in a Web Worker (Comlink); UI shows a percentage readout + visual progress bar during parsing
- [x] Build per-**category** (not per-layer) geometry buffers, one flat position array per move type — deviates from the original per-vertex-color plan: coloring is uniform per category (one material per category) rather than per-vertex, which is simpler and is what actually earns the "one draw call per category" performance win called out in section 6. Per-layer buffers are deferred to Phase 2b, which needs them for scrubbing anyway.
- [x] Toolpath rendering as line segments, full print rendered at once
- [x] Color legend UI (toggle categories on/off); categories with zero moves (e.g. perimeter/infill/support when no `;TYPE:` comments exist) are hidden rather than shown disabled
- [~] Handle large files without freezing: parsing runs in a worker (never blocks the main thread) with periodic progress callbacks, but is still a single synchronous pass over a plain-array buffer — no chunking or incremental geometry upload yet. Untested against a real 50–200MB file; revisit if that turns out to actually stall on large inputs.

**Definition of done:** Drop a real sliced G-code file and see the entire toolpath rendered with correct color-coded moves — a complete, demoable checkpoint even if playback isn't built yet.

### Phase 2b — Layer Scrubbing + Playback
**Goal:** Turn the static render into an interactive, animated build-up of the print.

- [x] Layer scrubber: slider + numeric readout (`Layer 42 / 128`)
- [x] Layer range isolation: "show layers 40–60 only" — a checkbox switches the toolpath's `drawRange` between build-up (0..current) and an explicit `[start, end]` window
- [x] Playback controls: play/pause, step forward/back (by layer), speed multiplier buttons (0.5x/1x/2x/5x/10x)
- [x] Animated toolhead marker (small sphere) that moves along the path in sync with playback
- [x] Live readouts during playback: current X/Y/Z, cumulative extrusion (mm), elapsed/estimated-remaining time
- [~] Debounce: not needed in the way originally imagined — the scrubber drives `drawRange` on an already-built static buffer (no re-parse, no geometry rebuild), so redundant slider events are cheap. Did **not** implement literal per-move-per-vertex-color playback; see the architecture note below.

**Architecture note (deviation from PLAN's original data flow):** playback needed move-level chronological data (position/layer/timing per move) that Phase 2a's per-*category* buffers can't give, since categories interleave in time. Rather than rebuild the per-category renderer, the parser now also emits a separate lightweight `timeline` (flat position/layer/duration/cumulative-extrusion arrays, one entry per move, ~2MB for a 120k-move file) purely for the playback cursor, toolhead marker, and live readouts. The static category buffers stay as they were and are sliced per-layer via precomputed `layerRanges` + `THREE.BufferGeometry.setDrawRange` — cheap, no re-upload per scrub. Playback advances a duration-weighted virtual clock (whole print always plays over ~45 real seconds at 1x, scaled by speed) rather than real-time, since the actual estimated print time (an hour-plus) isn't watchable. Verified end-to-end against the real Benchy G-code file (240 layers, ~119k moves): timeline lengths, cumulative sums, and layer-range contiguity all cross-checked exactly.

**Definition of done:** Scrub the timeline, hit play, and watch the toolhead trace the print in sync with a working progress readout.

### Phase 3 — Print Analysis Dashboard
**Goal:** Turn the viewer into a lightweight analysis tool sitting alongside the 3D view.

STL analysis:
- [x] Volume (signed tetrahedron volume sum over triangles) — verified against the real Benchy STL: 15.55 cm³, matching published 3DBenchy specs
- [x] Surface area (sum of triangle areas)
- [x] Center of mass (volume-weighted tetrahedron centroids, not naive vertex averaging) — verified: Y ≈ 0, correctly reflecting Benchy's left-right symmetry
- [x] Overhang detection (tilt-from-vertical past a configurable threshold, default 45°) — visualize as a heatmap overlay on the mesh (yellow → red by severity, toggleable, overrides shading mode while active). Note: this project's own angle convention is documented in code (`StlAnalysis` doc comment in types/model.ts) rather than matched to one specific slicer's exact definition — conventions vary across tools.
- [ ] Thin-wall detection (approximate — raycast-based wall thickness sampling, flag regions below a threshold) — **deferred**, flagged in the original plan review as the riskiest, most open-ended item in this phase; not started
- [ ] "Approximate printability" score/summary combining the above with plain-language warnings — **deferred**, depends on thin-wall detection + the warnings panel below

G-code analysis:
- [ ] Filament usage (length + estimated weight/cost given a filament density/diameter input)
- [ ] Print duration estimate (sum of segment_time = distance/feedrate, plus fixed overhead per travel/retraction)
- [ ] Travel distance vs. print distance ratio
- [ ] Retraction count and average retraction distance
- [ ] Extrusion statistics (min/max/avg flow rate)
- [ ] Temperature changes over time (parse `M104`/`M109`/`M140`/`M190`, plot as a timeline)
- [ ] Speed analysis (feedrate histogram / per-layer average speed chart)
- [ ] Tool change count (for multi-material files, `T0`/`T1`...)

Dashboard UI:
- [ ] Charts via a lightweight charting lib (recharts) for temperature/speed timelines
- [ ] Warnings panel (overhangs, thin walls, excessive retractions, long travel ratio) with severity levels
- [ ] Export report as PDF or shareable static page (stretch goal)

**Definition of done:** Upload → Analyze → Visualize is a real, coherent flow with a report that reads like something an engineer would actually want before hitting print.

## 5. Stretch Goals (post-V3)

- [ ] `.obj` and `.3mf` support for the STL-viewer side
- [ ] Extruded-tube toolpath rendering (instead of line segments) for a more "real" filament look
- [ ] Multi-file comparison (compare two G-code exports of the same model, e.g. different slicer settings)
- [ ] Shareable session links (would require minimal backend storage — S3 + presigned URLs, or just base64 the parsed summary into a URL for small files)
- [ ] Support/rack detection improvements using proper mesh analysis (e.g. via a WASM-compiled geometry library) instead of heuristic sampling
- [ ] Dark/light theme, accessibility pass, keyboard shortcuts for playback

## 6. Performance Considerations

- Parse in Web Workers; never block the main thread on files >5MB.
- Use typed arrays + `Transferable` objects (or `SharedArrayBuffer` if COOP/COEP headers are set up) to move data out of workers cheaply.
- For very large G-code files (100k+ moves), consider level-of-detail: render every Nth move at low zoom, full detail when zoomed in, or decimate travel moves more aggressively than extrusion moves.
- Use `THREE.BufferGeometry` with a single draw call per color category rather than one draw call per segment.
- Debounce the layer/playback slider so scrubbing doesn't trigger excessive re-renders.
- Consider `react-three-fiber`'s `frameloop="demand"` mode when idle (not playing) to avoid unnecessary re-renders.

## 7. Open Questions / Decisions to Revisit

- Slicer comment format coverage: start with Cura + PrusaSlicer/SuperSlicer conventions; note in UI when type-based coloring isn't available (fallback to travel/extrusion only).
- Do file size limits need enforcing client-side (e.g. warn above 250MB) to avoid crashing the tab?
- Whether V3's "shareable report" needs any backend at all, or can stay fully static/local.
- Print time estimate accuracy — acknowledge in UI that it's an approximation (real slicers account for acceleration/jerk which this won't model initially).

## 8. Suggested Build Order (concrete next steps)

1. Scaffold repo, deploy empty Vite + React shell to Vercel.
2. Build binary STL parser + basic R3F scene with a hardcoded test file.
3. Wire up drag & drop → parser → scene.
4. Add measurements panel + shading mode toggle.
5. Ship Phase 1, get it in the portfolio, move to Phase 2a.
6. Build G-code tokenizer as a standalone module with unit tests before touching rendering.
7. Move tokenizer into a Web Worker (Comlink) once correctness is verified on the main thread.
8. Build layer grouping + basic (uncolored) toolpath render.
9. Add color classification, then ship Phase 2a as a demoable checkpoint.
10. Add layer scrubbing, playback controls, and the toolhead marker (Phase 2b).
11. Ship Phase 2b as the headline portfolio demo.
12. Layer in STL analysis metrics, then G-code analysis metrics, then the dashboard UI.