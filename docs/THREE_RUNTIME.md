# ManipAT Interactive Three.js Runtime

ManipAT uses Three.js for **interactive/runtime visualization** while keeping custom SVG as the canonical printable exam renderer.

The two render paths have different jobs:

- **SVG exam rendering** is deterministic, static, printable, accessible, and contains no external runtime dependencies.
- **Three.js runtime rendering** is exploratory and explanatory: students/developers can rotate, pan, zoom, browse questions, switch orthographic views, inspect hidden geometry, and reveal selected explanation geometry.

Rendered pixels are never used as answer truth in either path.

## 1. Supported PAT Categories

| Category | Three.js runtime | Runtime source |
|---|---|---|
| Aperture / Keyhole | Yes | deterministic template + seed → normalized Manifold mesh |
| View Recognition / TFE | Yes | deterministic template + seed → normalized Manifold mesh |
| Cube Counting | Yes | persisted voxel coordinates |
| Form Development | Yes | persisted logical polyhedron |
| Angle Discrimination | No | intrinsically 2D; canonical SVG is appropriate |
| Paper Folding | No | scored diagrams are 2D fold-state panels; canonical SVG is appropriate |

Do not force Angle or Paper Folding into Three.js merely for architectural uniformity. Their semantic truth models are 2D/discrete and the SVG renderer is the correct runtime representation.

## 2. Quick Start

Build the workspace and generate a PAT set:

```bash
pnpm build
pnpm dat generate set \
  --seed runtime-demo \
  --offline \
  --output ./output/runtime-demo.html
```

Start the interactive viewer:

```bash
pnpm dat:view ./output/runtime-demo.html
```

With no filter, the command reconstructs every supported 3D question in the input and serves a local browser at:

```text
http://127.0.0.1:4173/
```

Use the browser's category selector, Previous/Next buttons, or question selector to move through the loaded 3D items. The viewer is intentionally localhost-only by default.

`--category` is optional. It pre-filters the loaded runtime set when you only want one category:

```bash
pnpm dat:view ./output/runtime-demo.html --category aperture
pnpm dat:view ./output/runtime-demo.html --category tfe
pnpm dat:view ./output/runtime-demo.html --category cubes
pnpm dat:view ./output/runtime-demo.html --category form
```

Select an exact question when debugging a specific item:

```bash
pnpm dat:view ./output/runtime-demo.html --question-id <question-id>
```

Use another port:

```bash
pnpm dat:view ./output/runtime-demo.html --port 4180
```

Verify reconstruction without starting a server/WebGL context:

```bash
pnpm dat:view ./output/runtime-demo.html --dry-run
pnpm dat:view ./output/runtime-demo.html --category aperture --dry-run
```

`--dry-run` reports the number and summaries of all selected runtime payloads and is the CI-friendly contract test for persisted-question → Three.js reconstruction.

## 3. Viewer Controls

The runtime host supports mouse and touch input through Three.js `OrbitControls`:

- drag: orbit/rotate camera;
- wheel or pinch: zoom;
- right-drag / two-finger drag: pan;
- **3D**: isometric orthographic view;
- **Front**: canonical front view;
- **Top**: canonical top view;
- **End**: canonical right-side end view;
- **Target view**: scored/important view when the category defines one;
- **Reset**: restore the original object orientation and camera;
- **Auto rotate**: continuously orbit the object;
- **Ghost / hidden lines**: make the surface translucent while preserving solid visible edges and rendering occluded edges with a scaled dashed hidden-line pattern;
- **Surface**: toggle solid surfaces;
- **Edges**: toggle both visible and hidden edge overlays;
- **Show explanation**: reveal category-specific highlighted geometry when available;
- **Category filter**: switch among all loaded 3D categories;
- **Previous / Next / question selector**: browse the selected runtime question set without restarting the CLI server.

Capabilities are reported by the runtime controller, so a host application should hide controls that are not meaningful for a given payload.

### Depth readability

The 3D runtime intentionally keeps Front/Top/End orthographic because those views must match PAT projection semantics exactly. The default 3D view is also isometric/orthographic, so it does not use perspective foreshortening as a depth cue.

To keep holes and recesses readable despite that constraint, mesh scenes use:

- lower ambient wash than the original renderer;
- directional key/fill lighting to separate walls, recesses, and blind-hole bottoms;
- a slightly less diffuse neutral material;
- a depth-only occlusion pre-pass in Ghost mode;
- solid visible edges plus dashed hidden edges.

This makes a through-hole and a blind/bottomed hole easier to distinguish without changing the canonical geometry or orthographic view conventions.

## 4. Architecture

The browser runtime is split into three layers.

### 4.1 Runtime payload

`@manipat/renderer-three` exports JSON-safe payload types:

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

Canonical meshes use ordinary number arrays when serialized and are restored to `Float32Array` / `Uint32Array` in the browser.

### 4.2 Question adapter

`createQuestionRuntimeViewer(container, payload)` converts one payload into a category-appropriate Three.js scene.

Mesh payloads reuse the existing `PictorialPreview` infrastructure:

```text
CanonicalMesh
  → BufferGeometry
  → shaded surface
  → depth-only occluder
  → visible EdgesGeometry pass
  → dashed hidden EdgesGeometry pass
  → orthographic camera
  → optional highlight mesh
```

Voxel payloads use `InstancedMesh` rather than one mesh per cube. Per-instance colors provide explanation highlighting without rebuilding geometry.

### 4.3 Browser host

`createInteractiveRuntimeViewer(container, scene, camera)` owns only browser/runtime resources:

- `WebGLRenderer`;
- `OrbitControls`;
- responsive orthographic framing;
- device-pixel-ratio capping;
- `ResizeObserver` / window-resize fallback;
- render loop;
- camera presets;
- reset/auto-rotate;
- renderer/control/canvas disposal.

The CLI browser shell owns the exam-level payload set and disposes/recreates a question viewer as the user navigates. The lower-level renderer remains a single-question component, which keeps it reusable for future study-app screens.

The caller continues to own the mathematical scene contents. This ownership boundary prevents WebGL lifecycle concerns from leaking into geometry generation.

## 5. Deterministic Reconstruction

### Aperture

A persisted Aperture question already contains:

- `seed`;
- `templateId`;
- template version;
- solid recipe;
- target orientation.

The runtime resolves `templateId` through the object-template registry, recreates the same `parameters` PRNG fork, instantiates the same procedural solid, and applies the same normalization used during question generation.

The result is the canonical source object, not a mesh guessed from the SVG.

### TFE

TFE uses the same deterministic reconstruction path. Front/top/end buttons use the same axis convention as the mathematical projection layer:

```text
FRONT: camera along -Y
TOP:   camera along -Z / viewer camera at +Z
END:   right-side view, camera at +X looking toward origin
```

The **Target view** control selects the scored missing orthographic view.

### Cube Counting

Cube Counting needs no geometric regeneration. The persisted question contains every voxel coordinate. The runtime creates one `InstancedMesh` and maps `explanation.matchingCubes` back to instance indices for answer highlighting.

### Form Development

The persisted prompt contains the complete logical polyhedron: vertices and polygonal faces.

The runtime triangulates each face as a fan and records each face as a mesh feature group. Because generated/legacy polyhedra may not share consistent winding, face orientation is corrected outward using:

```text
face normal · (face center - solid center)
```

A negative result reverses the polygon before triangulation.

Marked explanation faces can therefore be highlighted by semantic face ID rather than by screen coordinates.

## 6. Why the Printable Exam Is Still Static

Do not inject Three.js into `generate set` output.

The printable HTML has stronger requirements:

- one portable file;
- deterministic page breaks;
- no network requirement;
- no JavaScript dependency for rendering;
- browser Print / Save as PDF fidelity;
- embedded canonical question data;
- stable SVG line art.

The interactive viewer is a separate runtime surface consuming the same canonical question data. This avoids compromising print fidelity in order to gain interactivity.

## 7. Browser Integration API

A future ManipAT web/mobile frontend can bypass the CLI server entirely and use the package API directly:

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

For lower-level applications that already own a Three.js `Scene` and `OrthographicCamera`:

```ts
import { createInteractiveRuntimeViewer } from "@manipat/renderer-three";

const runtime = createInteractiveRuntimeViewer(container, scene, camera);
runtime.setViewPreset("front");
```

## 8. Resource Ownership

Interactive WebGL code must dispose GPU resources deliberately.

`QuestionRuntimeViewer.dispose()` disposes:

- browser runtime / OrbitControls;
- WebGL renderer context;
- canvas;
- owned surface/edge/hidden-edge/highlight geometries and materials;
- owned voxel geometry/materials.

The low-level `InteractiveRuntimeViewer` does **not** dispose arbitrary caller-owned scene objects.

This mirrors the geometry package's explicit ownership rules and prevents double-disposal.

## 9. Testing Strategy

Node/Vitest cannot provide a real browser WebGL surface, so verification is split by layer.

### Pure/runtime-model tests

Test under Node:

- mesh serialization/deserialization;
- logical-polyhedron triangulation;
- face feature groups;
- voxel highlighting;
- ghost hidden-edge material/state behavior;
- invalid index rejection;
- browser-environment guardrails.

### End-to-end reconstruction

The CLI integration test generates a deterministic six-category exam and verifies that unfiltered `--dry-run` reconstructs all four 3D categories. It also verifies each category filter individually:

- Aperture;
- TFE;
- Cube Counting;
- Form Development.

This proves persisted question data can become valid runtime payloads without requiring WebGL.

### Browser visual testing

For visual/interaction changes, run locally in a real browser and inspect at minimum:

- desktop mouse orbit/pan/zoom;
- mobile/touch orbit/pinch/pan;
- resize behavior;
- question navigation/filtering;
- all camera presets;
- target-view alignment;
- hole/recess depth readability;
- Ghost visible-vs-hidden line treatment;
- surface/edge toggles;
- explanation highlights;
- disposal/reload behavior.

A future Playwright/WebGL smoke suite is a useful follow-up once the repository adopts browser E2E infrastructure.

## 10. Future Improvements

Highest-value next steps:

1. **Split-view TFE explanation** — synchronized 3D model plus front/top/end SVG diagrams.
2. **Aperture projection animation** — animate object alignment into the scored aperture and display the resulting silhouette plane.
3. **Perspective exploration mode** — optional perspective camera for depth intuition while retaining orthographic Front/Top/End as canonical PAT views.
4. **Form Development fold animation** — animate net faces through hinge transforms into the folded solid.
5. **Cube face coloring** — highlight individual painted/exposed faces, not only matching cubes.
6. **Feature provenance highlights** — retain semantic Manifold feature groups through normalization so Aperture/TFE explanation facts can light up exact source features.
7. **Browser E2E** — Playwright tests for WebGL startup, OrbitControls, resize, navigation, and control state.
8. **Application integration** — embed the reusable runtime controller in the eventual student practice UI rather than relying on the development CLI server.
