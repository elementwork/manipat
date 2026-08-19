# ManipAT Interactive Runtime

ManipAT keeps the canonical printable PAT exam separate from interactive learning/debugging views.

The same persisted question data can now drive two interactive delivery modes:

- **Development / debug viewer** — localhost ES-module server for coding and browser inspection.
- **Portable viewer** — one self-contained interactive HTML file that can be opened directly from the filesystem.

Neither mode is answer truth. Solvers, validators, canonical geometry/state models, and printable SVGs remain authoritative.

See [`PORTABLE_VIEWER.md`](PORTABLE_VIEWER.md) for the portable packaging internals.

## 1. Supported categories

| Category | Interactive runtime | Runtime source |
|---|---|---|
| Aperture / Keyhole | Three.js 3D | deterministic template + seed → normalized Manifold mesh |
| View Recognition / TFE | Three.js 3D | deterministic template + seed → normalized Manifold mesh |
| Paper Folding / Hole Punching | guided SVG + animation | persisted discrete fold/layer state |
| Cube Counting | Three.js voxels | persisted cube coordinates |
| Form Development | Three.js folded solid | persisted logical polyhedron |
| Angle Discrimination | canonical SVG only | intrinsically 2D angle geometry |

Paper Punching is intentionally interactive without being forced into Three.js. Its overview, forward folds, reverse-unfold states and animation are derived from the canonical discrete fold model.

## 2. Generate a source exam

```bash
pnpm build
pnpm dat generate set \
  --seed runtime-demo \
  --offline \
  --output ./output/runtime-demo.html
```

The generated exam remains static and script-free.

## 3. Development / debug viewer

Start the localhost runtime:

```bash
pnpm dat:view ./output/runtime-demo.html
```

or explicitly:

```bash
pnpm dat:view:dev ./output/runtime-demo.html
```

Open:

```text
http://127.0.0.1:4173/
```

The server exposes the compiled runtime and Three.js as ordinary modules:

```text
/runtime/*
/vendor/three/*
/vendor/three/addons/*
```

This is the preferred mode while changing renderer code because browser DevTools can inspect real source modules and module requests.

### Selection

With no filter, every supported interactive question in the input is loaded in exam order.

```bash
pnpm dat:view ./output/runtime-demo.html --category aperture
pnpm dat:view ./output/runtime-demo.html --category tfe
pnpm dat:view ./output/runtime-demo.html --category paper
pnpm dat:view ./output/runtime-demo.html --category cubes
pnpm dat:view ./output/runtime-demo.html --category form
```

Exact question:

```bash
pnpm dat:view ./output/runtime-demo.html --question-id <question-id>
```

Alternative port:

```bash
pnpm dat:view ./output/runtime-demo.html --port 4180
```

Reconstruction-only check:

```bash
pnpm dat:view ./output/runtime-demo.html --dry-run
```

`--dry-run` is intentionally a development/CI contract and does not create WebGL.

## 4. Portable viewer

Create a single-file interactive companion:

```bash
pnpm dat:view:portable ./output/runtime-demo.html
```

Default output:

```text
./output/runtime-demo.interactive.html
```

Open that file directly in a browser. No local server is required after generation.

Custom output:

```bash
pnpm dat:view:portable ./output/runtime-demo.html \
  --output ./output/runtime-demo-shareable.html
```

Selection works the same way:

```bash
pnpm dat:view:portable ./output/runtime-demo.html --category paper
pnpm dat:view:portable ./output/runtime-demo.html --question-id <question-id>
```

The portable file embeds:

- selected runtime payloads;
- compiled ManipAT browser runtime modules;
- Three.js;
- OrbitControls;
- import-map metadata;
- viewer HTML/CSS/UI.

It does not use a CDN or fetch `/runtime` / `/vendor/three` files.

## 5. 3D viewer controls

For mesh/voxel questions the browser host supports:

- drag: orbit/rotate;
- wheel or pinch: zoom;
- right-drag / two-finger drag: pan;
- **3D**: isometric orthographic view;
- **Front**: canonical front view;
- **Top**: canonical top view;
- **End**: canonical right-end view;
- **Target view** when defined;
- **Reset**;
- **Auto rotate**;
- **Ghost / hidden lines**;
- **Surface**;
- **Edges**;
- **Color Code** on semantic mesh questions;
- **Show explanation** when the payload contains highlight data.

Capabilities are reported by the question viewer so the shell hides controls that are not meaningful for the current payload.

### Depth readability

Front/Top/End remain orthographic to match PAT semantics. The default 3D camera is also isometric/orthographic.

Depth cues therefore come from:

- directional key/fill lighting;
- reduced ambient wash;
- neutral surface material;
- depth-only occlusion pass in Ghost mode;
- solid visible edges;
- dashed hidden edges.

Color Code is optional learning assistance and is never answer truth.

## 6. Paper Punching interactive workspace

Paper Punching uses one split workspace:

```text
┌─────────────────────────────┬─────────────────────────────┐
│ All steps                   │ Interactive walkthrough     │
│ static overview             │ current fold/unfold state   │
│ forward + reverse solution  │ Prev / Next / Play / Pause  │
│                             │ 0.5× / 1× / 2×              │
└─────────────────────────────┴─────────────────────────────┘
```

The automatic sequence is:

```text
original
→ forward fold 1 ... last fold
→ punch
→ reverse unfold 1 ... solved
→ rewind
→ original
```

Forward animation uses the canonical clipped moving/stationary paper polygons and fold axis. Reverse animation reuses the same transition in the opposite direction. Rewind reverses already-defined transitions; it is not a second solver.

Reverse explanation endpoints retain:

- dark existing holes;
- coral newly exposed holes;
- dashed gray prior stacked positions;
- dashed blue fold axis;
- layer and hole counts.

## 7. Runtime architecture

### Runtime payloads

`@manipat/renderer-three` exports JSON-safe payloads for mesh and voxel questions.

```text
RuntimeVisualizationPayload
├── mesh
│   ├── serialized CanonicalMesh
│   ├── camera presets
│   ├── optional target orientation/view
│   └── optional feature highlights
└── voxels
    ├── cube center positions
    ├── camera presets
    └── optional highlighted cube indices
```

Paper Punching uses a CLI-owned guided payload containing canonical step SVGs, reverse-unfold states, punch-layer information and fold-animation polygons.

### Question adapter

`createQuestionRuntimeViewer(container, payload)` converts one 3D payload into a category-appropriate Three.js scene.

Mesh path:

```text
CanonicalMesh
  → BufferGeometry
  → neutral/semantic surface
  → depth-only occluder
  → visible edge pass
  → dashed hidden-edge pass
  → orthographic camera
  → optional highlight mesh
```

Voxel path uses `InstancedMesh` and keeps exposed cube-face boundaries so individual cube seams remain visible.

### Browser host

`createInteractiveRuntimeViewer(container, scene, camera)` owns:

- `WebGLRenderer`;
- `OrbitControls`;
- responsive orthographic framing;
- DPR capping;
- `ResizeObserver` / resize fallback;
- render loop;
- camera presets;
- reset/auto-rotate;
- browser/GPU disposal.

The shell owns exam-level navigation and recreates/disposes a single question viewer as the user moves through the exam.

## 8. Deterministic reconstruction

### Aperture

The persisted question contains seed/template/recipe/orientation information. Runtime reconstruction resolves the template and recreates the same procedural source solid and normalization used during generation.

### TFE

TFE uses the same deterministic reconstruction path. Camera conventions match the mathematical projection layer:

```text
FRONT: camera at +Y looking toward origin → view direction -Y
TOP:   camera at +Z looking toward origin → view direction -Z
END:   camera at +X looking toward origin → right-end view
```

### Cube Counting

The persisted question already contains every cube coordinate. The viewer constructs instanced cubes and maps explanation cubes to instance indices.

### Form Development

The persisted logical polyhedron contains vertices and polygonal faces. Faces are triangulated, outward winding is normalized, and semantic face IDs are retained for explanation highlighting.

### Paper Punching

The persisted fold program and layer state determine every forward/reverse state. Animation is a derived visualization of those exact fold operations.

## 9. Why the printable exam stays static

Do not merge the interactive runtime into the canonical `generate` HTML.

The printable artifact has stronger requirements:

- deterministic page breaks;
- stable SVG line art;
- no JavaScript dependency for rendering;
- no WebGL requirement;
- reliable Print / Save as PDF;
- embedded canonical question data.

Portable interactivity is therefore generated as a **separate sibling `.interactive.html` companion**, not by mutating the scored exam artifact.

## 10. Browser integration API

Application code can use the renderer package directly:

```ts
import {
  createQuestionRuntimeViewer,
  type RuntimeVisualizationPayload,
} from "@manipat/renderer-three";

const viewer = createQuestionRuntimeViewer(container, payload);
viewer.setViewPreset("isometric");
viewer.setAutoRotate(false);

// later
viewer.dispose();
```

Lower-level scene ownership:

```ts
import { createInteractiveRuntimeViewer } from "@manipat/renderer-three";

const runtime = createInteractiveRuntimeViewer(container, scene, camera);
runtime.setViewPreset("front");
```

## 11. Resource ownership

`QuestionRuntimeViewer.dispose()` tears down its owned browser/GPU resources and category-specific geometry/materials.

The low-level runtime does not dispose arbitrary caller-owned scene contents. This prevents double disposal and keeps mathematical geometry ownership separate from WebGL lifecycle ownership.

## 12. Testing

Node/Vitest verifies:

- mesh serialization/deserialization;
- logical-polyhedron conversion;
- semantic surface/hidden-line state;
- voxel highlighting and cube-edge controls;
- browser environment guards;
- persisted-question → runtime payload reconstruction;
- Paper Punching guided states/animation payloads;
- portable module-graph closure;
- portable removal of server-only module URLs;
- portable file writing/default naming.

GitHub Actions additionally runs the full 90-question offline smoke set and difficulty-5 smoke sets for every PAT category.

### Manual browser review

For interactive changes, compare both transports:

```bash
pnpm dat:view:dev ./output/runtime-demo.html
pnpm dat:view:portable ./output/runtime-demo.html
```

Verify:

- WebGL startup;
- orbit/pan/zoom;
- resize;
- navigation/filtering;
- camera presets and target view;
- Color Code/Ghost/Surface/Edges;
- Cube seams/highlighting;
- Paper forward/reverse/rewind sequence;
- Form Development;
- disposal/reload behavior.

For the portable file, also verify that it opens directly from disk and does not request runtime JavaScript over the network.

## 13. Next improvements

High-value follow-ups remain:

1. TFE split-view explanation;
2. Aperture projection animation;
3. optional perspective exploration camera;
4. Form Development fold animation;
5. Cube painted-face coloring;
6. stronger semantic feature provenance through CSG;
7. browser WebGL E2E coverage;
8. embedding the reusable runtime in the future student practice application.
