# ManipAT Design and Implementation

**Status:** current-state architecture and engineering record  
**Runtime:** TypeScript / Node.js 22+ / ESM / pnpm workspace  
**3D geometry:** Manifold (`manifold-3d`)  
**Canonical exam rendering:** deterministic custom SVG  
**Interactive rendering:** Three.js  
**Primary artifacts:** canonical printable exam, development/debug viewer, portable study exam

This document describes the **current executable architecture**. Historical planning material remains under [`docs/dev/`](dev/); operational instructions live in [`USER_GUIDE.md`](USER_GUIDE.md). If documentation and code disagree, code and tests are authoritative.

---

# 1. Core Principle

ManipAT is a deterministic, geometry-first generator for all six DAT Perceptual Ability Test families:

1. Apertures / Keyhole
2. View Recognition / TFE
3. Angle Discrimination
4. Paper Folding / Hole Punching
5. Cube Counting
6. Spatial Relations / Form Development

The central invariant is:

> **Rendered pixels never determine answer truth.**

Every accepted item follows this pipeline:

```text
seed + requested difficulty
            ↓
canonical geometry/state model
            ↓
category solver
            ↓
correct answer
            ↓
controlled distractors
            ↓
independent validator
            ↓
structured explanation + metadata
            ↓
canonical SVG / optional interactive visualization
```

The same canonical question object feeds printing, validation, explanations, and interactive learning views. There is no separate answer database for the study UI.

---

# 2. Architectural Invariants

## 2.1 Ground truth precedes rendering

Bad architecture:

```text
render → inspect pixels → infer answer
```

ManipAT:

```text
model → solve → validate → render
```

This separation applies to silhouettes, TFE hidden lines, fold reflections, painted cube faces, and net/fold topology.

## 2.2 Exactly one correct answer

Generators construct candidate answers, but validators independently confirm uniqueness. A generator cannot make a bad question acceptable merely by assigning a `correctChoiceIndex`.

## 2.3 Deterministic randomness

All procedural choices originate from seeded random sources. `Math.random()` is not part of the generation contract. Subsystems use deterministic namespace forks so implementation changes in one branch of generation do not unnecessarily perturb unrelated choices.

## 2.4 Explicit resource ownership

Manifold objects own WebAssembly resources. Temporary geometry uses explicit disposal / `using`. Three.js runtime objects similarly dispose geometries, materials, overlays, and viewers when replaced.

## 2.5 Offline means no hidden network dependency

Generation supports `--offline`, which installs a rejecting `fetch` guard. Canonical HTML embeds its assets. Portable study output embeds the browser runtime, Three.js, OrbitControls, payloads, and study UI into one HTML file.

## 2.6 Mathematical validity and visual quality are separate acceptance layers

A question may validate mathematically yet still be poor practice material because of line clutter, clipped features, misleading fold grammar, nearly identical distractors, or print overflow. Fixed-seed visual review remains part of the engineering process.

---

# 3. Repository Architecture

```text
packages/core                  deterministic PRNG, math, serialization, shared types
packages/geometry              Manifold wrapper, topology, projection, silhouettes
packages/object-generator      procedural 3D template registry and provenance
packages/svg                   deterministic SVG primitives
packages/renderer-three        runtime Three.js scenes, cameras, overlays, browser viewer
packages/pat-aperture          Aperture generator/solver/validator/rendering/runtime rebuild
packages/pat-view-recognition  TFE generator/solver/validator/rendering/runtime rebuild
packages/pat-angle             Angle generator/solver/validator/rendering
packages/pat-paper-folding     fold-state truth, visual panels, solver, renderer, animation transitions
packages/pat-cube-counting     supported voxel structures, solver, SVG and runtime data
packages/pat-form-development  polyhedra, nets, solver, SVG and runtime geometry
packages/question-bank         unified engine, batch/workers, persistence, exam HTML, solutions
packages/cli                   generation CLI, dev viewer, portable packer, study-exam augmentation
```

## 3.1 `@manipat/core`

Provides vector/math primitives, tolerance values, seeded Xoshiro128** randomness, deterministic `fork(namespace)`, canonical serialization, fingerprints, and shared question/validation envelopes.

## 3.2 `@manipat/geometry`

Owns Manifold-backed solids/sections and geometry-independent operations:

- primitives and CSG;
- transforms and normalization;
- canonical mesh extraction;
- logical topology;
- orthographic projection;
- cross-sections/silhouettes;
- geometry-quality validation.

## 3.3 `@manipat/object-generator`

Defines reusable procedural solid templates for Aperture/TFE. Templates return geometry plus recipe/provenance information so semantic features can survive into explanation and visualization layers.

## 3.4 `@manipat/renderer-three`

Provides the browser/runtime learning renderer, including:

- canonical mesh → `BufferGeometry` conversion;
- orthographic/isometric cameras aligned to ManipAT coordinates;
- OrbitControls;
- Surface / Edges / Ghost controls;
- hidden dashed edges where applicable;
- semantic Color Code overlays;
- voxel instancing and cube highlighting;
- runtime question viewer lifecycle/disposal.

Three.js never participates in answer determination.

## 3.5 `@manipat/question-bank`

Unifies all category packages and owns:

- `PatEngine` dispatch;
- batch scheduling and duplicate rejection;
- exact difficulty quotas;
- worker orchestration;
- persistence and embedded exam JSON;
- canonical exam HTML;
- printable Answer Key / full solution augmentation;
- human-readable category explanation rendering.

## 3.6 `@manipat/cli`

Owns the user-facing workflows:

```text
generate
validate
inspect
regenerate
benchmark
doctor
list
```

and the two interactive delivery commands:

```text
dat:view / dat:view:dev
dat:view:portable
```

---

# 4. Canonical Coordinate and Projection Model

Canonical 3D axes:

```text
+X right
+Y depth/back
+Z up
```

TFE frames are explicit data rather than ad-hoc camera rotations.

Front:

```text
viewDirection = [0,-1,0]
imageRight    = [1,0,0]
imageUp       = [0,0,1]
```

Top:

```text
viewDirection = [0,0,-1]
imageRight    = [1,0,0]
imageUp       = [0,1,0]
```

Right end:

```text
viewDirection = [-1,0,0]
imageRight    = [0,1,0]
imageUp       = [0,0,1]
```

The Three.js camera presets use the same frame convention so interactive views correspond to canonical SVG/TFE truth.

---

# 5. Logical Topology and Orthographic Rendering

Raw CSG meshes are triangulated and cannot be drawn directly as PAT engineering line art. ManipAT reconstructs logical topology before rendering.

Key steps:

1. extract valid nondegenerate triangles;
2. build adjacency and logical faces;
3. suppress nonsemantic triangulation/facet seams using crease/silhouette logic;
4. classify logical-edge visibility by projected occlusion tests;
5. refine visible/hidden transitions with binary search;
6. merge connected collinear fragments;
7. remove hidden duplicates already covered by visible strokes.

For hard models, exact ray/triangle visibility is accelerated with a projected triangle AABB grid. The acceleration reduces candidate intersections without weakening the final visibility test.

---

# 6. Category Designs

## 6.1 Aperture / Keyhole

Truth is the exact 2D orthographic silhouette of a canonical 3D solid in the chosen target orientation.

The generator:

- instantiates a deterministic object template;
- validates and normalizes the solid;
- evaluates principal projections;
- chooses a projection according to requested complexity;
- renders a fixed pictorial/isometric prompt;
- constructs plausible silhouette mutations;
- validates that exactly one choice matches the target.

Hard bands select richer multi-feature models rather than merely making distractors cosmetically harder.

Runtime learning can reconstruct the canonical mesh from stored recipe/template provenance. Semantic Color Code is educational only. Whole connected surface patches are classified so triangulation does not create half-triangle artifacts; protrusion coloring requires feature provenance rather than a broad geometric guess.

## 6.2 View Recognition / TFE

Truth consists of strict Front/Top/Right-End orthographic views of one solid. Visible edges are solid; occluded edges are dashed.

The generator computes all views first and then selects a missing view with sufficient information for the requested difficulty. Distractors are coherent whole-view misconceptions rather than arbitrary dangling line edits.

Runtime learning reconstructs the same 3D object and provides 3D, Front, Top, End, Target View, Color Code, Ghost, Surface, and Edges controls where applicable.

## 6.3 Angle Discrimination

Truth is purely 2D mathematical angle magnitude. Four angles are rendered with randomized orientation/ray lengths; the solver ranks their measured magnitudes. Distractors are plausible neighboring-order mistakes.

Angle intentionally has no 3D interactive hint in the portable study exam.

## 6.4 Paper Folding / Hole Punching

Truth is a layered discrete fold state, not a 3D CSG solid.

The current model tracks a 4×4 source sheet, fold transforms, layer identity/order, punch penetration, and reverse-unfold propagation. Folds include horizontal, vertical, and diagonal families subject to effectiveness/bounds checks.

The scored SVG renderer keeps the original sheet as a dashed reference and preserves folded panel boundaries rather than collapsing the state into a convex hull.

The learning runtime is a unified Paper workspace:

```text
left:  All Steps overview
right: Interactive walkthrough
       Previous step / Next step
       Play / Pause
       0.5× / 1× / 2×
```

The canonical timeline is:

```text
original sheet
→ forward fold 1 … last fold
→ punch
→ reverse-unfold 1 … solved state
→ rewind to start
```

Forward/reverse motion uses fold-axis geometry derived from the canonical visual-panel transitions. The current `1×` rate is intentionally slower than the original prototype for teaching clarity.

## 6.5 Cube Counting

Truth is a sparse supported voxel structure. No floating cubes are permitted. The solver counts exposed painted faces under the convention that all exposed faces except the resting bottom face are painted.

Multiple questions may share one figure. Batch scheduling understands grouped output so exact difficulty quotas are not overshot.

Runtime learning provides instanced cubes plus Surface, Edges and Ghost/hidden-line controls. Edge geometry represents exposed cube-face seams rather than a Boolean-union shell, preserving individual-cube readability.

## 6.6 Form Development / Spatial Relations

Truth combines an explicit logical polyhedron, a valid non-overlapping planar net, face patterns, chirality, and folded geometry.

Net construction searches deterministic attachment alternatives and rejects overlap. Folded answer rendering uses winding-independent outward normals and depth along the `[1,1,1]` isometric view axis. Distractors use meaningful dimensional/geometry mutations with source and pairwise separation constraints.

Runtime learning reconstructs the folded solid from indexed polygon data.

---

# 7. Unified Question, Explanation and Answer Model

Every accepted category-specific question is part of `AnyPatQuestion` and conceptually contains:

```text
id
engineVersion
type
seed
templateId / templateVersion
prompt
choices
correctChoiceIndex
explanation
difficulty
validation
fingerprints
metadata
```

The `explanation` structure remains category-specific. The solution renderer converts these canonical structures into human-readable study material:

- Aperture: projection facts and distractor failure reasons;
- TFE: missing view, dimension correspondences, mutation reasons;
- Angle: measured degrees and ranking;
- Paper: reverse-unfold order, punch depth/layers, final hole positions;
- Cube: matching cube coordinates/count;
- Form Development: marked faces, adjacency and chirality/folding constraints.

Answers/explanations in both printable and portable-study output come from these fields. They are not inferred from SVG.

---

# 8. Batch Generation, Difficulty and Workers

`generateBatch()` turns category requests into exact accepted counts.

For each category it:

1. resolves difficulty scheduling;
2. derives deterministic candidate seeds;
3. generates candidates/groups;
4. validates independently;
5. rejects duplicates;
6. records rejection telemetry;
7. stops only at the exact target or raises a target error.

Weighted mixes are converted to exact integer quotas with largest-remainder allocation. Cube groups are capped by the remaining quota of the selected difficulty band.

Worker mode runs category batches in independent worker threads, each with its own engine/Manifold context. A worker is considered successful only after both a result message and a clean exit; a clean exit without data is an error rather than a silent hang.

Difficulty bands remain engineering heuristics, not psychometric calibration. Each category changes actual source/problem parameters, and accepted questions retain component metrics for future empirical calibration.

---

# 9. Artifact Model

ManipAT deliberately has three complementary surfaces.

## 9.1 Canonical printable exam

Generated by:

```bash
pnpm dat generate ...
```

Contains:

- cover page;
- section directions;
- deterministic question layouts;
- canonical SVG prompt/choices;
- Cube shared figures;
- blank Answer Sheet;
- embedded `manipat-exam-data` JSON;
- Letter portrait print CSS;
- no external web assets.

The canonical exam is authoritative for scored presentation and printing/PDF.

### Printable solution modes

Generation supports:

```text
--solutions none   default; no correct-answer appendix
--solutions key    append compact Answer Key
--solutions full   append Answer Key + detailed category explanations
```

`--include-explanations` remains a backward-compatible alias for `--solutions full`. Config files may use `solutions: "none" | "key" | "full"`; legacy `includeExplanations: true` maps to full.

Solutions are appended after the blank Answer Sheet so the question section remains exam-like.

### Answer Sheet print contract

For normal PAT-size exams up to 90 questions, the Answer Sheet receives a print-only single-page class. Print CSS fixes it to one Letter page and uses tighter row/gap metrics than screen display to absorb browser print-layout rounding. Custom sets above 90 questions are not force-clipped; they are allowed to flow.

## 9.2 Development/debug viewer

Commands:

```bash
pnpm dat:view exam.html
pnpm dat:view:dev exam.html
```

This intentionally starts a localhost server and serves ordinary ES modules under `/runtime/*`, `/vendor/three/*`, and `/vendor/three/addons/*`. It is optimized for DevTools, source inspection, and rapid browser/runtime development.

## 9.3 Portable study exam

Command:

```bash
pnpm dat:view:portable exam.html
```

Default output:

```text
exam.interactive.html
```

The portable artifact starts from the original canonical exam HTML—it does **not** replace it with a viewer-only page. It preserves the entire exam and adds screen-only Study Tools.

Study Tools provide:

- global question selector;
- Previous/Next;
- Check Answer;
- Show Explanation;
- Interactive Hint / Explore in 3D;
- Explore folding for Paper Punching.

The interactive hint is collapsed by default because it can materially simplify the perceptual task.

Only one all-in-one interactive viewer is embedded and reused. The study shell sends the selected question ID to that viewer; it does not create one WebGL context per exam question.

`--category` and `--question-id` on `dat:view:portable` restrict which items receive interactive runtime payloads. They do not delete the original exam pages, answers, or explanations.

Angle retains answer/explanation support but intentionally has no 3D hint.

---

# 10. Portable Module Packaging

The portable packer embeds the same compiled runtime used by the development viewer; it does not maintain a second renderer implementation and does not add a separate bundler dependency.

Packaging steps:

1. locate compiled `@manipat/renderer-three`;
2. start at `question-viewer.js`;
3. recursively discover ES-module dependencies;
4. include Three.js and OrbitControls from the installed dependency;
5. rewrite relative imports to deterministic synthetic specifiers;
6. encode modules as `data:text/javascript;base64,...` URLs;
7. create an inline import map;
8. embed the all-in-one viewer HTML into the study exam as iframe `srcdoc` content.

Unexpected bare/external dependencies are rejected instead of falling back to the network.

This solves the `file://` problem without requiring a local server after generation. The output can be opened directly from Finder/Explorer while preserving the normal server-based dev workflow.

---

# 11. Printing and Screen/Print Separation

Canonical exam pages are fixed to Letter portrait with deterministic section page breaks. Browser screen layout uses shadows/margins for page visualization; `@media print` removes those decorations and applies exact physical dimensions.

Portable Study Tools are explicitly hidden under `@media print`, including:

- floating Study Tools launcher;
- side drawer/backdrop;
- interactive hint modal/iframe.

The original canonical exam remains preferred for authoritative printing. Portable output should nevertheless print the same underlying exam content without study controls.

The Answer Sheet uses a compact print-only layout for ≤90 questions so Chrome/Safari/Firefox print rounding does not spill the last rows onto a second page.

---

# 12. Security and Trust Boundaries

Generated ManipAT question IDs/data are controlled, but persisted/imported files may be untrusted.

Current protections include:

- embedded JSON is parsed, never executed;
- `<`, `>`, `&` are escaped before JSON is placed in script elements;
- visible HTML strings and attribute values are escaped;
- imported IDs are sanitized before filesystem use by `inspect`;
- portable module packaging accepts only known runtime-relative/Three module classes;
- unexpected external module specifiers fail closed;
- offline generation requires no HTTP access;
- no `eval`/`Function` is needed for the study/runtime path.

---

# 13. Testing and CI Contract

The repository uses strict TypeScript and zero-warning ESLint plus deterministic unit/fuzz/regression tests. Exact test counts are intentionally not documented here because they change frequently.

High-value coverage includes:

- high-volume seeded generation across all six categories;
- projection/logical-topology regressions;
- solver/validator consistency;
- exact difficulty quotas/group scheduling;
- worker lifecycle behavior;
- serialization/persistence/determinism;
- Three.js runtime controls and reconstruction;
- Paper overview/fold transition/timeline behavior;
- semantic surface classification;
- portable ES-module graph closure;
- printable solution modes;
- portable Study Tools shell.

The permanent Verify workflow runs:

```text
frozen pnpm install
build
zero-warning lint
unit/fuzz tests
full 90-question offline generation
printable --solutions full smoke
portable 90-question study-exam smoke
hard-band smoke for all six categories
artifact upload
```

The portable smoke asserts that the study artifact retains the original Answer Sheet and embedded canonical question data, contains Study Tools, and no longer references development-server runtime imports.

CI cannot fully validate real browser WebGL or physical printer pagination, so manual browser/print review remains required for UI/print changes.

---

# 14. Engineering Lessons Preserved in the Current Design

Several implementation failures directly shaped current invariants:

- **Raw triangulation is not engineering line art.** Logical topology and semantic/crease filtering are required.
- **Exact visibility can be accelerated without approximation.** Projected broad-phase indexing was preferable to weakening ray tests.
- **Sampling needs transition refinement.** Shared binary-refined visibility boundaries eliminated small visible/hidden gaps.
- **Distractors should model coherent misconceptions.** Arbitrary local TFE line surgery produced invalid-looking drawings.
- **Paper visual layers matter.** Convex-hull rendering erased fold grammar even when the mathematical state was correct.
- **Painter depth and face winding cannot be assumed.** Form Development needed outward-normal reconstruction and correct `[1,1,1]` depth.
- **Grouped generators affect schedulers.** Exact difficulty quotas must understand Cube Counting groups.
- **A clean worker exit is not enough.** Parent orchestration requires returned data.
- **Canonical artifacts must exclude wall-clock identity.** Reproducibility metadata and job telemetry are separate concerns.
- **Interactive learning must not become answer truth.** Runtime cues, Ghost, Color Code and fold animation are explanatory overlays only.
- **Portable interactivity should augment the exam, not replace it.** The current study artifact keeps the real question/choice pages primary.

---

# 15. Current Limitations

- Difficulty bands are engineering heuristics, not empirically calibrated item-response difficulty.
- Printable PDF is produced through browser Print/Save as PDF; there is no native PDF command.
- Full browser screenshot/print visual regression is not yet automated.
- Persisted mesh output remains intentionally disabled.
- Paper truth uses a 4×4 discrete layer model rather than general origami geometry.
- Surface semantics are improving but some non-provenance decisions still rely on geometric heuristics.
- The portable study exam is an offline learning artifact, not an LMS/account/analytics system.
- Real WebGL behavior and printer pagination still require browser acceptance tests/manual inspection.

---

# 16. High-Value Next Work

## P0 — Browser/print visual regression

Use a deterministic Chromium/Playwright environment to:

- open fixed-seed canonical and portable artifacts;
- capture representative question pages;
- validate exact Letter page count/layout;
- verify the 90-question Answer Sheet remains one printed page;
- exercise Study Tools and interactive overlays;
- produce image/PDF diff artifacts.

## P0 — Expand hard-model diversity

Continue adding semantically distinct Aperture/TFE/Form templates while tracking template/projection/distractor distribution.

## P0 — Empirical difficulty calibration

Retain current component metrics but eventually fit geometry/state features to real response correctness/time.

## P1 — Stronger semantic surface provenance

Propagate planar/cylindrical/conical/chamfer/Boolean-boundary surface identity from procedural construction into both TFE line extraction and interactive Color Code.

## P1 — Richer Paper learning explanations

Extend layer-order and reverse-reflection explanations while keeping scored diagram grammar separate from instructional graphics.

## P1 — Public programmatic API contract

Document/version supported APIs for engine generation, batch generation, validation, persistence, solution rendering and runtime payload reconstruction.

## P2 — Native PDF

Add only after browser print visual regression can prove layout equivalence.

## P2 — Study platform layer

Timed practice, answer recording, analytics, spaced review and adaptive scheduling belong above the deterministic generator rather than inside category solvers.

---

# 17. Rules for Future Changes

## Geometry / solver

- add a fixed failing seed before fixing a geometry bug;
- never change truth merely to simplify rendering;
- preserve explicit ownership/disposal;
- validate tolerance/degenerate cases.

## Distractors

- model coherent misconceptions;
- enforce uniqueness and set-level separation;
- do not make difficulty purely cosmetic.

## Rendering / print

- inspect at actual print size;
- preserve hidden-line semantics and closures;
- keep study/runtime aids outside answer truth;
- verify page fit, especially Answer Sheet and solution appendices;
- keep screen-only controls out of print.

## Portable runtime

- reuse the shared runtime rather than fork behavior;
- reject unexpected module dependencies instead of adding implicit network access;
- keep the canonical exam intact;
- keep interactive hints optional/collapsed by default.

## Persistence / security

- keep canonical content deterministic;
- version schemas;
- escape imported strings at HTML boundaries;
- sanitize filesystem-derived names.

---

# 18. Final Design Principle

ManipAT should continue to evolve by strengthening separate layers rather than allowing one layer to compensate for defects in another:

> **Generate a canonical model that can be solved exactly, validate it independently, render it faithfully, and add learning aids only after truth is fixed.**

That rule now applies not only to question generation, but also to printable answers, explanations, the development viewer, and the portable study exam.
