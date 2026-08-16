# DAT Perceptual Ability Test Procedural Generation Engine
## Implementation Specification for AI Coding Agents

**Version:** 1.0  
**Date:** 2026-08-14  
**Primary geometry kernel:** Manifold (`manifold-3d`, WebAssembly/TypeScript)  
**Interactive renderer:** Three.js  
**Static/vector output:** Custom SVG renderer  
**Primary goal:** Generate original, deterministic, automatically solvable and automatically validated DAT Perceptual Ability Test (PAT) questions with explanations.

---

# 1. Executive Summary

Build a procedural DAT PAT generation engine centered on **Manifold as the single 2D/3D geometry foundation**, with **Three.js used for interactive/pictorial rendering** and a **small custom SVG layer** used for exact exam-style line art.

The engine must support all six PAT question families:

1. Apertures / Keyhole
2. View Recognition / TFE
3. Angle Discrimination
4. Paper Folding
5. Cube Counting
6. 3D Form Development

Manifold is the common geometric kernel. Each PAT family has a dedicated semantic solver and validator because the exam rules differ materially across question types.

The architecture must follow this invariant:

```text
Generation
    ↓
Canonical Ground-Truth Model
    ↓
Mathematical Solver
    ↓
Correct Answer
    ↓
Controlled Distractor Generator
    ↓
Automatic Validator
    ↓
Difficulty Scorer
    ↓
Renderer
    ↓
Persist Question Recipe + Metadata + Assets
```

**Never derive ground truth from rendered pixels.** Rendering is the last stage.

The system must be:

- deterministic by seed;
- geometry-first;
- automatically validated;
- modular by PAT question type;
- able to produce SVG;
- capable of interactive Three.js explanations;
- suitable for large-scale batch generation;
- designed to reject ambiguous or degenerate questions automatically;
- capable of retaining semantic provenance from source features to projected lines/silhouettes;
- independent from JSCAD.

---

# 2. Scope

## 2.1 In scope

Implement:

- Manifold initialization and TypeScript wrappers.
- Canonical 2D and 3D geometry types.
- Primitive library.
- Feature/composition library.
- Procedural object grammar.
- Seeded random generation.
- Geometry validation.
- 3D object normalization.
- Projection utilities.
- SVG utilities.
- Three.js conversion/render utilities.
- Question generators.
- Solvers.
- Distractor generators.
- Validators.
- Difficulty metrics.
- Question serialization.
- Batch generation.
- Automated tests.
- Snapshot/golden tests.
- Benchmark tools.
- CLI examples.
- Browser-compatible APIs where practical.

## 2.2 Out of scope for initial implementation

Do not prioritize:

- authentication;
- payments;
- full student LMS;
- production website UX;
- adaptive-learning recommendation algorithms;
- AI-written free-form explanations;
- OCR;
- import of copyrighted DAT question banks;
- matching any proprietary question exactly.

The engine should emit structured explanation facts that an LLM can verbalize later.

---

# 3. Authoritative Technical Choices

## 3.1 Geometry

Use **Manifold** as the single external geometry kernel.

Manifold provides:

- oriented 2-manifold triangle meshes;
- robust Boolean solid operations;
- primitives;
- transforms;
- extrusion;
- revolution;
- slicing;
- 3D-to-2D projection;
- mesh extraction;
- 2D `CrossSection`;
- polygon Boolean operations;
- offsets;
- hull operations;
- browser-capable WASM.

Manifold's `project()` returns a `CrossSection` representing the projected outline of a solid on the XY plane.

## 3.2 Rendering

Use **Three.js** for:

- interactive 3D;
- camera placement;
- orthographic views;
- isometric/pictorial object display;
- WebGL rendering;
- explanations involving rotation/highlighting;
- optional raycaster utilities.

Use a **custom SVG renderer** for canonical test assets:

- polygon silhouettes;
- paths;
- visible edges;
- hidden edges;
- fold lines;
- hole punches;
- angle rays;
- cube diagrams where appropriate;
- 3D nets.

Do not make Three.js `SVGRenderer` the source of mathematical truth.

## 3.3 Language/runtime

Preferred:

```text
TypeScript
Node.js 22+
ESM
pnpm workspace
Vitest
```

Browser builds should be supported for interactive modules, but batch generation should run under Node workers.

---

# 4. Repository Structure

Create a monorepo:

```text
manipat/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── README.md
├── docs/
│   ├── architecture.md
│   ├── geometry-conventions.md
│   ├── question-schema.md
│   ├── validation-rules.md
│   └── difficulty-model.md
│
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── math/
│   │   │   ├── random/
│   │   │   ├── ids/
│   │   │   ├── tolerances/
│   │   │   ├── errors/
│   │   │   └── types/
│   │   └── test/
│   │
│   ├── geometry/
│   │   ├── src/
│   │   │   ├── manifold/
│   │   │   ├── primitives/
│   │   │   ├── features/
│   │   │   ├── transforms/
│   │   │   ├── projection/
│   │   │   ├── mesh/
│   │   │   ├── edges/
│   │   │   ├── topology/
│   │   │   ├── cross-section/
│   │   │   └── validation/
│   │   └── test/
│   │
│   ├── object-generator/
│   │   ├── src/
│   │   │   ├── grammar/
│   │   │   ├── templates/
│   │   │   ├── mutations/
│   │   │   ├── provenance/
│   │   │   └── scoring/
│   │   └── test/
│   │
│   ├── svg/
│   │   ├── src/
│   │   │   ├── document.ts
│   │   │   ├── paths.ts
│   │   │   ├── lines.ts
│   │   │   ├── polygons.ts
│   │   │   ├── markers.ts
│   │   │   ├── normalize.ts
│   │   │   └── styles.ts
│   │   └── test/
│   │
│   ├── renderer-three/
│   │   ├── src/
│   │   │   ├── mesh-adapter.ts
│   │   │   ├── cameras.ts
│   │   │   ├── materials.ts
│   │   │   ├── scene.ts
│   │   │   └── explanations.ts
│   │   └── test/
│   │
│   ├── pat-aperture/
│   │   ├── src/
│   │   │   ├── generator.ts
│   │   │   ├── solver.ts
│   │   │   ├── distractors.ts
│   │   │   ├── validator.ts
│   │   │   ├── difficulty.ts
│   │   │   └── render.ts
│   │   └── test/
│   │
│   ├── pat-view-recognition/
│   │   ├── src/
│   │   │   ├── generator.ts
│   │   │   ├── projector.ts
│   │   │   ├── edge-extractor.ts
│   │   │   ├── hidden-line.ts
│   │   │   ├── segment-merge.ts
│   │   │   ├── solver.ts
│   │   │   ├── distractors.ts
│   │   │   ├── validator.ts
│   │   │   └── render.ts
│   │   └── test/
│   │
│   ├── pat-angle/
│   │   ├── src/
│   │   │   ├── generator.ts
│   │   │   ├── solver.ts
│   │   │   ├── validator.ts
│   │   │   └── render.ts
│   │   └── test/
│   │
│   ├── pat-paper-folding/
│   │   ├── src/
│   │   │   ├── state.ts
│   │   │   ├── fold.ts
│   │   │   ├── punch.ts
│   │   │   ├── unfold.ts
│   │   │   ├── generator.ts
│   │   │   ├── solver.ts
│   │   │   ├── distractors.ts
│   │   │   ├── validator.ts
│   │   │   └── render.ts
│   │   └── test/
│   │
│   ├── pat-cube-counting/
│   │   ├── src/
│   │   │   ├── voxel-grid.ts
│   │   │   ├── generator.ts
│   │   │   ├── solver.ts
│   │   │   ├── validator.ts
│   │   │   └── render.ts
│   │   └── test/
│   │
│   ├── pat-form-development/
│   │   ├── src/
│   │   │   ├── logical-polyhedron.ts
│   │   │   ├── adjacency.ts
│   │   │   ├── unfold.ts
│   │   │   ├── fold-verify.ts
│   │   │   ├── generator.ts
│   │   │   ├── solver.ts
│   │   │   ├── distractors.ts
│   │   │   ├── validator.ts
│   │   │   └── render.ts
│   │   └── test/
│   │
│   ├── question-bank/
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── fingerprints.ts
│   │   │   ├── serialize.ts
│   │   │   ├── duplicate-detection.ts
│   │   │   └── storage.ts
│   │   └── test/
│   │
│   └── cli/
│       └── src/
│           ├── generate.ts
│           ├── validate.ts
│           ├── inspect.ts
│           └── benchmark.ts
│
├── apps/
│   ├── playground/
│   └── benchmark-viewer/
│
└── fixtures/
    ├── geometry/
    ├── questions/
    └── golden-svg/
```

---

# 5. Global Geometry Conventions

Define conventions once. Never allow question modules to improvise axes.

## 5.1 World axes

Use a right-handed coordinate system:

```text
+X = right
+Y = depth/back
+Z = up
```

Canonical orthographic views:

```text
FRONT: view along -Y; image horizontal = +X; image vertical = +Z
TOP:   view along -Z; image horizontal = +X; image vertical = +Y
END:   view along -X; image horizontal = +Y; image vertical = +Z
```

Document whether the end view is right-side or left-side and keep the convention immutable.

Recommended:

```text
END = right-side view, camera located at +X looking toward origin (-X)
```

## 5.2 Units

Use dimensionless model units.

Recommended canonical object envelope:

```text
target longest dimension = 100 units
```

Avoid mixing millimeters, pixels and model units.

SVG normalization later maps model units to a viewBox.

## 5.3 Tolerances

Centralize:

```ts
export const EPS = {
  point: 1e-7,
  length: 1e-6,
  angleRad: 1e-6,
  coplanar: 1e-6,
  collinear: 1e-6,
  area: 1e-8,
  projection: 1e-5,
};
```

Never use arbitrary tolerances scattered throughout question modules.

---

# 6. Determinism

Every generated artifact must be reproducible from:

```text
engineVersion
questionType
templateVersion
templateId
seed
parameters
```

Use a seeded PRNG such as `xoshiro128**`, `xoroshiro`, or an equivalent deterministic implementation owned by the project.

Do not use `Math.random()` in generation code.

Define:

```ts
interface RandomSource {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  float(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  chance(probability: number): boolean;
  fork(namespace: string): RandomSource;
}
```

Forked random streams prevent unrelated generator changes from perturbing all downstream outputs.

Example:

```text
root seed
├── shape
├── orientation
├── distractors
├── style
└── difficulty
```

---

# 7. Canonical Data Contracts

## 7.1 Vectors

```ts
export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

export interface Segment2 {
  a: Vec2;
  b: Vec2;
}

export interface Segment3 {
  a: Vec3;
  b: Vec3;
}
```

## 7.2 Semantic feature provenance

Every object-generation operation should have an ID.

```ts
export interface FeatureProvenance {
  id: string;
  kind:
    | "base"
    | "union"
    | "subtract"
    | "intersect"
    | "hull"
    | "extrude"
    | "revolve"
    | "transform";
  semanticType?: string;
  parentIds: string[];
  params: Record<string, unknown>;
}
```

Examples of `semanticType`:

```text
body
boss
notch
slot
hole
groove
step
wedge
rib
recess
cylindrical-cut
```

## 7.3 Procedural solid recipe

```ts
export interface SolidRecipe {
  id: string;
  version: number;
  seed: string;
  templateId: string;
  operations: GeometryOperation[];
}
```

Use recipes as source of truth rather than storing only triangle meshes.

## 7.4 Generic question

```ts
export type PatQuestionType =
  | "aperture"
  | "view-recognition"
  | "angle"
  | "paper-folding"
  | "cube-counting"
  | "form-development";

export interface PatQuestion<TPrompt, TAnswer, TExplanation> {
  id: string;
  engineVersion: string;
  type: PatQuestionType;
  seed: string;
  templateId: string;
  templateVersion: number;

  prompt: TPrompt;
  choices: TAnswer[];
  correctChoiceIndex: number;

  explanation: TExplanation;

  difficulty: {
    raw: number;
    normalized: number;
    band: 1 | 2 | 3 | 4 | 5;
    components: Record<string, number>;
  };

  validation: {
    passed: boolean;
    checks: ValidationCheck[];
  };

  fingerprints: Record<string, string>;
  metadata: Record<string, unknown>;
}
```

---

# 8. Manifold Wrapper

Create a project-owned wrapper instead of importing Manifold directly throughout the codebase.

Goals:

- isolate API differences;
- simplify initialization;
- centralize disposal/lifecycle rules;
- normalize TypeScript types;
- make testing easier;
- make future kernel replacement technically possible.

Proposed interface:

```ts
export interface GeometryKernel {
  cube(size: Vec3, center?: boolean): SolidHandle;
  cylinder(
    height: number,
    radiusLow: number,
    radiusHigh?: number,
    circularSegments?: number,
    center?: boolean
  ): SolidHandle;

  sphere(radius: number, circularSegments?: number): SolidHandle;

  extrude(
    section: SectionHandle,
    height: number,
    options?: ExtrudeOptions
  ): SolidHandle;

  revolve(
    section: SectionHandle,
    options?: RevolveOptions
  ): SolidHandle;

  union(solids: readonly SolidHandle[]): SolidHandle;
  difference(a: SolidHandle, b: SolidHandle): SolidHandle;
  intersection(a: SolidHandle, b: SolidHandle): SolidHandle;

  translate(solid: SolidHandle, v: Vec3): SolidHandle;
  rotate(solid: SolidHandle, degreesXYZ: Vec3): SolidHandle;
  scale(solid: SolidHandle, scaleXYZ: Vec3): SolidHandle;

  projectXY(solid: SolidHandle): SectionHandle;
  sliceXY(solid: SolidHandle, z: number): SectionHandle;

  getMesh(solid: SolidHandle): CanonicalMesh;
  validate(solid: SolidHandle): GeometryValidationResult;
}
```

Add Manifold-specific operations behind an extension interface where useful.

---

# 9. Primitive Library

## 9.1 Tier 1

Implement first:

- cube;
- cuboid;
- cylinder;
- cone;
- frustum;
- sphere;
- ellipsoid;
- triangular prism;
- regular polygon prism;
- pyramid;
- wedge;
- extruded polygon.

## 9.2 Tier 2

Add:

- half-cylinder;
- quarter-cylinder;
- truncated prism;
- oblique prism;
- chamfer-like block;
- rounded/segmented block where useful;
- T profile;
- L profile;
- U profile;
- stepped block;
- slotted block;
- block with through-hole;
- block with blind recess;
- cylinder with axial/radial cut.

## 9.3 Tier 3

Only after validation:

- polyhedra;
- icosahedron;
- dodecahedron;
- geodesic-like sphere;
- capsule;
- torus sections;
- swept-like constructs;
- compound convex hull shapes.

Curved/high-segment geometry should be used sparingly for exam generation because it increases mesh complexity and often contributes less perceptual value than asymmetric planar/cylindrical features.

---

# 10. Feature Library

Build reusable features applied to base bodies.

```ts
interface FeatureDefinition {
  id: string;
  kind: string;
  operation: "union" | "subtract" | "intersect";
  create(context: FeatureContext): SolidHandle;
  provenance: FeatureProvenance;
}
```

Required features:

### Additive

- rectangular boss;
- cylindrical boss;
- wedge boss;
- rib;
- step;
- secondary cuboid;
- secondary prism;
- secondary cylinder.

### Subtractive

- through-hole;
- blind hole;
- rectangular slot;
- channel;
- notch;
- rectangular pocket;
- cylindrical pocket;
- corner cut;
- wedge cut;
- stepped recess;
- half-cylinder groove.

Feature generators need constraints preventing:

- zero-volume interactions;
- accidental complete removal;
- tangent-only contact;
- microscopic slivers;
- tiny details below render thresholds;
- unintended disconnected solids unless explicitly allowed.

---

# 11. Object Grammar

Use constrained grammar-based procedural generation.

Example:

```text
Object
  := BaseBody
     AdditiveFeature{0..3}
     SubtractiveFeature{0..3}
     OptionalAsymmetryFeature
```

Avoid unconstrained random CSG trees.

Each template specifies:

```ts
interface ObjectTemplate {
  id: string;
  version: number;
  allowedQuestionTypes: PatQuestionType[];
  parameterSchema: ParameterSchema;
  build(ctx: TemplateContext): GeneratedSolid;
  validateLocal?(solid: GeneratedSolid): TemplateValidationResult;
}
```

Initial template families:

1. cuboid + notch;
2. cuboid + wedge;
3. cuboid + cylinder;
4. cuboid − cylindrical hole;
5. cuboid − slot;
6. stepped block;
7. L-shaped extruded solid;
8. T-shaped extruded solid;
9. prism + boss;
10. cuboid + wedge − slot.

Target Phase-1 template count:

```text
10–20 high-quality templates
```

Do not begin with hundreds.

---

# 12. Geometry Validation Pipeline

Run after every generated solid.

Reject if any check fails.

Required checks:

```text
isFiniteGeometry
hasPositiveVolume
hasReasonableBoundingBox
hasNoDimensionBelowThreshold
hasExpectedConnectedComponentCount
hasAcceptableTriangleCount
hasAcceptableAspectRatio
hasNoTinyFeatureRatio
hasProjectionDiversity
hasNoForbiddenSymmetry
```

Example thresholds must be configuration-driven.

```ts
interface GeometryQualityConfig {
  minVolume: number;
  minDimension: number;
  maxDimensionRatio: number;
  maxTriangles: number;
  minFeatureToObjectRatio: number;
}
```

---

# 13. Canonical Object Normalization

Before question generation:

1. compute bounding box;
2. translate geometric center to origin;
3. uniformly scale to target longest dimension;
4. store normalization transform;
5. recalculate quality metrics.

Never normalize independently inside renderers.

---

# 14. Projection System

Implement arbitrary orthographic projection by transforming the object so that the view direction aligns with the XY projection convention, then call Manifold `project()` where silhouette geometry is needed.

General API:

```ts
interface ProjectionFrame {
  viewDirection: Vec3;
  imageRight: Vec3;
  imageUp: Vec3;
}

function projectSilhouette(
  solid: SolidHandle,
  frame: ProjectionFrame
): CanonicalSection2D;
```

Canonical frames:

```ts
FRONT_FRAME
TOP_FRAME
RIGHT_END_FRAME
```

For arbitrary aperture orientation, derive an orthonormal projection frame from a seeded orientation.

---

# 15. SVG Layer

Implement a minimal deterministic SVG writer.

Required primitives:

```ts
svgDocument()
svgGroup()
svgPath()
svgPolygon()
svgPolyline()
svgLine()
svgCircle()
svgText()
```

Every renderer must emit consistent:

- `viewBox`;
- padding;
- stroke width;
- line joins;
- caps;
- fill policy;
- accessibility metadata;
- semantic IDs/data attributes.

Example:

```html
<line
  data-edge-id="edge-17"
  data-source-feature="slot-2"
  class="visible-edge"
  x1="..."
  y1="..."
  x2="..."
  y2="..."
/>
```

Explanation mode should be able to highlight a semantic feature without recomputing geometry.

---

# 16. Apertures / Keyhole

## 16.1 Ground truth

Input:

```text
canonical solid
+
insertion/view orientation
```

Procedure:

1. orient solid;
2. project to XY with Manifold `project()`;
3. normalize CrossSection;
4. canonicalize polygon orientation;
5. remove insignificant micro-segments;
6. compute fingerprint;
7. treat resulting section as correct aperture geometry.

## 16.2 Question rendering

Question object:

- Three.js orthographic camera;
- isometric/pictorial orientation;
- parallel projection;
- minimal shading;
- high-contrast edges;
- neutral background;
- consistent object scale.

Answers:

- SVG silhouettes;
- equal display envelopes;
- equal apparent stroke;
- randomized answer position.

## 16.3 Physical fit model

Implement two modes explicitly.

### Mode A: exact projection silhouette

An opening matches the exact orthographic silhouette of the target orientation.

### Mode B: physical containment

An object projection must be contained inside the aperture.

For initial DAT-style generation, implement **exact/controlled silhouette matching first**.

Containment solver:

```ts
function apertureContains(
  opening: CanonicalSection2D,
  projectedObject: CanonicalSection2D,
  tolerance: number
): boolean;
```

For advanced rotation-about-insertion-axis validation, perform constrained angular search.

## 16.4 Distractors

Distractors must be mutations of the correct silhouette.

Mutation families:

- local width increase/decrease;
- height change;
- notch depth error;
- remove concavity;
- add concavity;
- shift feature;
- mirror feature;
- round/straight substitution;
- incorrect cylindrical projection width;
- wrong projection axis;
- feature omission;
- feature exaggeration.

Each distractor must include structured error metadata.

```ts
interface ApertureDistractorReason {
  type:
    | "too-narrow"
    | "too-wide"
    | "missing-feature"
    | "extra-feature"
    | "wrong-concavity"
    | "wrong-position"
    | "wrong-projection";
  featureId?: string;
}
```

## 16.5 Validator

Reject unless:

- correct opening matches;
- each distractor fails matching/containment;
- no two choices are equivalent within tolerance;
- silhouette is visually meaningful;
- silhouette complexity is within configured range.

## 16.6 Difficulty

Candidate metrics:

```text
concavityCount
vertexCount
silhouetteSymmetry
projectionDepthAmbiguity
featureOcclusion
distractorHausdorffSimilarity
orientationComplexity
smallFeatureRatio
```

---

# 17. View Recognition / TFE

This module is the highest technical risk.

## 17.1 Requirement

Generate exact orthographic line drawings for:

- front;
- top;
- end/right-side;

including line visibility according to the selected DAT rendering convention.

## 17.2 Logical feature edges

Do not use raw triangle edges as drawing edges.

Build logical edges by:

1. retrieving mesh;
2. building triangle adjacency;
3. computing triangle normals;
4. grouping coplanar adjacent triangles into logical faces;
5. extracting boundaries between logical faces;
6. suppressing triangulation diagonals;
7. preserving semantic/provenance information where possible.

Define:

```ts
interface LogicalFace {
  id: string;
  triangleIds: number[];
  normal: Vec3;
  sourceFeatureIds: string[];
}

interface LogicalEdge {
  id: string;
  vertices: Segment3;
  adjacentFaceIds: string[];
  sourceFeatureIds: string[];
  kind: "boundary" | "crease" | "silhouette-candidate";
}
```

## 17.3 Orthographic projection

For each logical 3D edge:

1. transform to view frame;
2. retain depth;
3. project `(x, y, depth)` to 2D;
4. remove zero-length projections.

## 17.4 Hidden-line classification

Preferred robust algorithm:

1. subdivide each candidate edge adaptively;
2. for each sample point, cast/view-test against faces along camera direction;
3. determine whether another surface lies between camera and sample;
4. split edges where visibility changes;
5. mark resulting subsegments visible/hidden.

Potential optimization:

- rasterized depth buffer for initial classification;
- exact geometric/ray tests around transitions.

Implement correctness-first before optimization.

## 17.5 Segment merge

After projection:

- snap close endpoints;
- merge overlapping collinear segments;
- split at intersections;
- resolve duplicates;
- visible line wins over hidden duplicate where convention requires;
- keep feature metadata lists.

## 17.6 Canonical view representation

```ts
interface OrthographicView {
  frame: ProjectionFrame;
  visible: Segment2[];
  hidden: Segment2[];
  bounds: Bounds2;
  fingerprint: string;
}
```

## 17.7 TFE distractor generation

Prefer structural mutations:

- remove one visible line;
- add one plausible visible line;
- convert visible ↔ hidden;
- move feature projection;
- alter line length;
- use one view from nearby incorrect object variant;
- swap projection of a feature;
- omit hole/recess evidence.

Every choice must pass uniqueness checks.

## 17.8 TFE validation

Mandatory:

```text
front/top/end independently canonicalized
no zero-length lines
no duplicate lines
no unexplained triangulation lines
view fingerprints unique where expected
answer uniqueness
render-size threshold
hidden/visible line consistency
```

## 17.9 TFE acceptance benchmark

Create manually verified golden objects:

- cube;
- stepped block;
- through-hole block;
- slotted block;
- wedge;
- cylinder-on-block;
- blind recess;
- compound notch.

For each, store approved front/top/end SVG.

Automated implementation cannot proceed to mass generation until all golden views pass.

---

# 18. Angle Discrimination

No heavy geometry operation is needed, but retain Manifold as the project's sole geometry dependency.

## 18.1 Data model

```ts
interface AngleItem {
  vertex: Vec2;
  rayA: Vec2;
  rayB: Vec2;
  angleDegrees: number;
  rotationDegrees: number;
  rayLengths: readonly [number, number];
}
```

## 18.2 Solver

Compute exact angle using vectors:

```text
θ = acos((a·b)/(|a||b|))
```

Use internal numeric angle as ground truth.

## 18.3 Generation constraints

Vary:

- absolute angle;
- orientation;
- ray length;
- position;
- small angular separation.

Do not accidentally create secondary visual cues strongly correlated with correct ranking.

Avoid:

- consistently longer rays on larger angles;
- identical base orientation across choices;
- systematic ordering.

## 18.4 Difficulty

Use minimum pairwise angular difference.

Initial bands:

```text
easy:   >= 4°
medium: 2–4°
hard:   0.75–2°
expert: < 0.75°
```

These are initial engineering bands and must later be calibrated against actual student response data.

---

# 19. Paper Folding

Represent paper as 2D polygon regions plus explicit layer transformations.

## 19.1 Core state

```ts
interface PaperLayer {
  id: string;
  polygon: Polygon2;
  transformHistory: FoldTransform[];
  depthOrder: number;
  sourceLayerId: string;
}

interface FoldState {
  layers: PaperLayer[];
  punches: Punch[];
  folds: FoldInstruction[];
}
```

## 19.2 Fold

A fold is reflection across a line.

```ts
interface FoldLine {
  point: Vec2;
  unitDirection: Vec2;
}
```

Point reflection:

1. project point onto fold line;
2. compute perpendicular displacement;
3. negate perpendicular displacement.

Implement and heavily property-test.

## 19.3 Splitting

Before reflecting:

- split affected layer polygon at fold line;
- choose moving side;
- reflect moving polygon;
- update layer stack;
- retain transform history.

Use Manifold `CrossSection` operations for polygon Boolean/intersection support where appropriate.

## 19.4 Punch

Punch types initially:

- circular hole;
- optional triangular/square advanced punch later.

A punch affects every layer present under the punch coordinate.

Persist which layer instances were punched.

## 19.5 Unfold

Reverse fold transformations in reverse order.

Each punch image propagates through reflection history.

Ground truth final pattern is computed exactly.

## 19.6 Distractors

Mutation families:

- miss one reflected hole;
- add extra reflection;
- mirror across wrong fold;
- wrong quadrant;
- wrong fold order;
- wrong number of holes;
- wrong symmetry;
- shifted punch.

## 19.7 Validation

Reject if:

- punches lie on ambiguous boundaries;
- hole copies overlap closer than threshold unless intended;
- final answer has symmetry causing duplicate choices;
- fold leaves degenerate layer;
- punch intersects fold line within tolerance;
- multiple choices canonicalize to same result.

---

# 20. Cube Counting

Use a discrete voxel model for truth.

## 20.1 Core model

```ts
type CubeKey = `${number},${number},${number}`;

interface VoxelStructure {
  cubes: Set<CubeKey>;
}
```

Provide:

```ts
has(x, y, z)
add(x, y, z)
remove(x, y, z)
neighbors(x, y, z)
exposedFaceCount(x, y, z)
```

## 20.2 Generation

Generate connected structures.

Potential families:

- stepped tower;
- terraced pyramid;
- bridge;
- asymmetric stack;
- hollow-ish exterior arrangement;
- occluded columns.

Constraint: all cubes must be part of one intended structure.

## 20.3 Solver

For each cube:

```text
painted faces = 6 - occupied orthogonal neighbors
```

If DAT convention assumes all exposed external faces are painted, implement exactly that assumption in the question rules.

Count cubes by:

```text
0 painted faces
1 painted face
2 painted faces
3 painted faces
...
```

## 20.4 3D render geometry

Do not union cubes for truth.

For rendering:

- build one box per voxel;
- preferably Three.js `InstancedMesh`;
- use Manifold only if a derived solid is useful for another operation.

## 20.5 Visibility quality

A generated cube-counting question must be visually inspectable.

Reject structures with:

- excessive hidden cubes;
- projections where stack heights are impossible to infer;
- accidental identical silhouettes from multiple voxel arrangements under the prompt convention.

## 20.6 Explanation

Output structured facts:

```json
{
  "targetPaintedFaces": 2,
  "matchingCubes": [
    {"x": 0, "y": 1, "z": 2},
    {"x": 1, "y": 1, "z": 2}
  ],
  "count": 2
}
```

Three.js explanation can highlight matching cubes.

---

# 21. 3D Form Development

Treat this as a logical polyhedron/topology problem.

## 21.1 Preserve logical faces

Avoid deriving face semantics from arbitrary triangulation whenever possible.

```ts
interface LogicalPolyhedron {
  vertices: Vec3[];
  faces: PolyFace[];
}

interface PolyFace {
  id: string;
  vertexIds: number[];
  label?: string;
  pattern?: FacePattern;
}
```

## 21.2 Build adjacency

Two faces are adjacent when they share a logical edge.

```ts
interface FaceAdjacency {
  faceA: string;
  faceB: string;
  sharedVertexIds: readonly [number, number];
}
```

## 21.3 Net generation

Algorithm:

1. choose root face;
2. build spanning tree over face adjacency graph;
3. place root face in 2D;
4. recursively rotate adjacent faces around shared edges into plane;
5. detect 2D face overlap;
6. reject overlapping nets;
7. canonicalize net.

Generate multiple valid nets if desired.

## 21.4 Fold verification

Given a 2D net:

1. reconstruct adjacency;
2. propagate 3D rotations;
3. verify closure;
4. compare folded logical polyhedron topology;
5. verify face pattern orientation.

## 21.5 Distractors

Create subtle invalid options:

- wrong face adjacency;
- mirrored face pattern;
- rotated face marking;
- net that overlaps when folded;
- correct shape but incorrect marked-face relationship;
- one branch attached to wrong edge.

## 21.6 Validator

Correct answer must uniquely fold to intended target including face markings.

---

# 22. Three.js Rendering

## 22.1 Manifold → Three.js adapter

Implement one converter:

```ts
function manifoldMeshToBufferGeometry(
  mesh: CanonicalMesh
): THREE.BufferGeometry;
```

Responsibilities:

- positions;
- indices;
- normals;
- optional semantic groups;
- bounding box;
- disposal policy.

## 22.2 Cameras

Provide named camera constructors:

```ts
createFrontCamera()
createTopCamera()
createRightEndCamera()
createIsometricOrthographicCamera()
```

Use orthographic projection for exam-like pictorial views unless a specific design decision explicitly requires perspective.

## 22.3 Isometric view

Recommended default view direction:

```text
(1, -1, 1)
```

Normalize and tune after comparing to desired visual style.

No foreshortening due to perspective.

## 22.4 Explanation rendering

Support:

- feature highlighting;
- selected face highlighting;
- edge highlighting;
- cube highlighting;
- rotation animation;
- transparent/ghosted objects;
- overlay of projection plane;
- display of corresponding SVG view.

---

# 23. Projection Fingerprints and Duplicate Detection

Every generated object/question must receive fingerprints.

## 23.1 Canonicalization

For a 2D polygon/segment representation:

1. normalize center;
2. normalize scale;
3. snap coordinates to controlled tolerance;
4. canonicalize polygon direction;
5. canonicalize starting vertex;
6. sort components;
7. serialize deterministically;
8. hash.

## 23.2 Object fingerprints

Compute:

```text
front
top
end
selected oblique silhouettes
mesh/topology signature
feature recipe signature
```

## 23.3 Duplicate rejection

Detect:

- exact duplicates;
- mirror-equivalent items where mirror provides no meaningful distinction;
- rotational equivalents where applicable;
- choices within a question that are effectively identical;
- different seeds producing identical relevant views.

---

# 24. Difficulty Model

Difficulty must be recorded as components, not a single opaque label.

General:

```ts
interface DifficultyScore {
  raw: number;
  normalized: number;
  band: 1 | 2 | 3 | 4 | 5;
  components: Record<string, number>;
}
```

Initial component sets:

### Aperture

- silhouette vertices;
- concavities;
- object depth complexity;
- symmetry;
- distractor similarity;
- feature size;
- orientation complexity.

### TFE

- logical edge count;
- hidden edge count;
- overlapping projected edges;
- occluded feature count;
- line-density;
- cross-view ambiguity;
- distractor edit distance.

### Angle

- minimum angular separation;
- ray-length distractor effect;
- orientation dispersion.

### Paper folding

- fold count;
- layer count;
- punch count;
- reflection count;
- symmetry;
- overlap density.

### Cube counting

- cube count;
- occlusion;
- stack depth;
- hidden supports;
- target class rarity.

### Form development

- face count;
- adjacency branching;
- net compactness;
- pattern orientation complexity;
- distractor topology similarity.

Later calibrate weights using response-time and correctness telemetry.

---

# 25. Automatic Question Validation

Validation is a hard requirement.

A generated question enters the bank only if:

```text
geometry valid
AND solver succeeds
AND exactly one answer is correct
AND distractors are unique
AND render is non-degenerate
AND difficulty is within requested range
AND duplicate check passes
```

Model validators as pure functions where possible.

```ts
interface ValidationCheck {
  id: string;
  passed: boolean;
  severity: "error" | "warning";
  details?: Record<string, unknown>;
}
```

Batch jobs should return rejection reasons for later analysis.

---

# 26. Structured Explanations

Do not hardcode only prose.

Store geometric facts.

Example Aperture:

```json
{
  "type": "aperture",
  "correctChoice": 2,
  "facts": [
    {
      "featureId": "slot-1",
      "effect": "creates-lower-concavity"
    },
    {
      "featureId": "boss-2",
      "effect": "extends-right-boundary"
    }
  ],
  "wrongChoices": {
    "0": {
      "reason": "missing-feature",
      "featureId": "boss-2"
    }
  }
}
```

Example TFE:

```json
{
  "view": "front",
  "edgeId": "edge-21",
  "sourceFeatureId": "cylindrical-cut-1",
  "visibility": "visible"
}
```

This allows future LLM explanations without making the LLM responsible for correctness.

---

# 27. Question Storage

Store recipes and metadata as primary records.

Suggested schema:

```text
question
--------
id
type
engine_version
template_id
template_version
seed
parameters_json
correct_choice
difficulty_raw
difficulty_band
validation_json
fingerprints_json
explanation_json
created_at
```

Assets:

```text
question_asset
--------------
question_id
kind
content_hash
format
storage_uri
```

Possible asset kinds:

```text
prompt-svg
choice-svg
thumbnail
three-mesh
explanation-svg
```

Avoid storing large redundant meshes where regeneration is cheap and deterministic.

---

# 28. CLI

Implement:

```bash
pnpm dat generate --type aperture --count 100 --seed batch-001
pnpm dat generate --type view-recognition --count 50 --difficulty 3
pnpm dat validate ./output/exam.html
pnpm dat inspect <question-id>
pnpm dat benchmark --suite geometry
```

`generate` should output one standalone HTML document with canonical question data, inline SVG assets, answer controls, and print-ready answer/explanation pages.

`inspect` should produce a local HTML artifact showing:

- recipe;
- parameters;
- 3D object;
- choices;
- answer;
- validation results;
- fingerprints;
- difficulty components.

---

# 29. Batch Generation

Generation must support large candidate pools because rejection is expected.

Pipeline:

```text
requested 10,000 accepted questions
        ↓
generate candidate
        ↓
validate
   ┌────┴────┐
 reject    accept
   │          │
metrics     dedupe
              ↓
            persist
```

Track rejection statistics by reason.

Example:

```json
{
  "generated": 50000,
  "accepted": 12300,
  "rejected": {
    "duplicate_projection": 8200,
    "degenerate_feature": 5100,
    "ambiguous_choices": 6100,
    "difficulty_out_of_range": 18300
  }
}
```

This telemetry should guide template tuning.

---

# 29A. Offline CLI Generation Tool

The project must include a fully **offline CLI generator** that can generate a complete PAT set, one or more selected categories, or a specific difficulty band without requiring a browser, cloud API, network connection, or external service. All geometry generation, solving, validation, SVG creation, metadata generation, and local persistence must execute on the user's machine.

## 29A.1 Primary CLI goals

The CLI must support:

- generation of a complete six-category PAT set;
- generation of a single category;
- generation of multiple selected categories;
- question-count control per category;
- global or per-category difficulty selection;
- deterministic seeds;
- output as one self-contained HTML document with inline SVG assets;
- optional Three.js-compatible mesh exports for 3D categories;
- validation-only mode;
- regenerate-by-seed mode;
- local batch generation with no network dependency;
- readable progress and rejection statistics;
- machine-readable exit codes for automation.

The CLI executable should be exposed as:

```bash
dat-pat
```

Development alias:

```bash
pnpm dat
```

## 29A.2 Category identifiers

Use stable identifiers:

```text
aperture
view-recognition
angle
paper-folding
cube-counting
form-development
```

Support aliases for user convenience:

```text
keyhole            -> aperture
tfe                -> view-recognition
angles             -> angle
paper              -> paper-folding
cubes              -> cube-counting
form                -> form-development
```

## 29A.3 Difficulty levels

Expose five stable difficulty levels:

```text
1 = beginner
2 = easy
3 = medium
4 = hard
5 = expert
```

CLI should accept either numeric or named forms:

```bash
--difficulty 3
--difficulty medium
```

Internally retain the continuous difficulty score and component metrics. The CLI band is a target filter, not the complete difficulty model.

Support difficulty ranges:

```bash
--difficulty 2-4
```

and mixed weighted generation:

```bash
--difficulty-mix "1:10,2:20,3:40,4:20,5:10"
```

The difficulty generator must keep generating/rejecting candidates until the requested accepted distribution is achieved or a configured attempt limit is reached.

## 29A.4 Whole-set generation

Implement a command for a complete PAT set:

```bash
dat-pat generate set \
  --seed exam-001 \
  --difficulty 3 \
  --output ./output/exam-001
```

Default full-set category counts should be configuration-driven rather than hardcoded in category modules. Provide a default profile file such as:

```json
{
  "name": "default-full-set",
  "categories": {
    "aperture": 15,
    "view-recognition": 15,
    "angle": 15,
    "paper-folding": 15,
    "cube-counting": 15,
    "form-development": 15
  }
}
```

Allow alternate profiles:

```bash
dat-pat generate set --profile ./profiles/practice-60.json
```

## 29A.5 Single-category generation

Examples:

```bash
dat-pat generate category aperture --count 100 --difficulty 2

dat-pat generate category view-recognition --count 50 --difficulty 4 --seed tfe-hard-01

dat-pat generate category paper-folding --count 200 --difficulty 3-5
```

## 29A.6 Multiple-category generation

Support:

```bash
dat-pat generate categories \
  --categories aperture,view-recognition,cube-counting \
  --count 50 \
  --difficulty 3
```

Support per-category counts:

```bash
dat-pat generate categories \
  --category-count aperture=30 \
  --category-count view-recognition=30 \
  --category-count cube-counting=20
```

Support per-category difficulty overrides:

```bash
dat-pat generate categories \
  --categories aperture,tfe,angle \
  --difficulty 3 \
  --category-difficulty aperture=4 \
  --category-difficulty tfe=5
```

## 29A.7 Output layout

Default offline output artifact:

```text
output/<set-id>.html
```

The embedded manifest must contain:

```text
engine version
CLI version
seed
profile
requested category counts
accepted category counts
difficulty request
difficulty distribution
content format version
```

## 29A.8 Offline-only guarantee

Add an explicit offline mode:

```bash
dat-pat generate set --offline
```

The default generator should already operate offline. `--offline` becomes a strict enforcement switch that:

- disables any optional telemetry;
- prevents HTTP requests;
- fails if a module attempts network access;
- uses only locally installed dependencies and local files;
- writes all output locally.

Add integration tests that run with network disabled.

## 29A.9 CLI configuration file

Support:

```bash
dat-pat generate --config ./dat-pat.config.json
```

Example:

```json
{
  "seed": "practice-bank-v1",
  "output": "./generated/practice-bank-v1.html",
  "difficulty": 3,
  "categories": {
    "aperture": { "count": 100, "difficulty": 3 },
    "view-recognition": { "count": 100, "difficulty": 4 },
    "angle": { "count": 100, "difficulty": 3 },
    "paper-folding": { "count": 100, "difficulty": 3 },
    "cube-counting": { "count": 100, "difficulty": 2 },
    "form-development": { "count": 100, "difficulty": 4 }
  },
  "formats": ["html"],
  "includeExplanations": true,
  "includeMeshes": false,
  "offline": true
}
```

Command-line flags override configuration-file values.

## 29A.10 Additional commands

Implement:

```bash
dat-pat list categories
dat-pat list difficulties
dat-pat list profiles
dat-pat inspect <question-id-or-file>
dat-pat validate <path>
dat-pat regenerate --seed <seed> --type <category> --template <id>
dat-pat benchmark
dat-pat doctor
```

`doctor` verifies:

- Node version;
- Manifold WASM initialization;
- Three.js availability;
- local write permissions;
- deterministic PRNG test vector;
- SVG generation;
- offline operation.

## 29A.11 Progress output

Interactive terminal example:

```text
DAT PAT Generator
Profile: default-full-set
Seed: exam-001
Difficulty: Medium (3)

Aperture          15/15 accepted   21 rejected
View Recognition  15/15 accepted   48 rejected
Angle             15/15 accepted    3 rejected
Paper Folding     15/15 accepted   17 rejected
Cube Counting     15/15 accepted    9 rejected
Form Development  15/15 accepted   26 rejected

90 questions generated
Validation: PASS
Output: ./output/exam-001
```

Also provide:

```bash
--quiet
--json-progress
```

for scripts/agents.

## 29A.12 Exit codes

Use documented exit codes:

```text
0 success
1 invalid CLI arguments
2 configuration error
3 initialization/runtime dependency failure
4 requested generation target not achieved
5 validation failure
6 output/write failure
7 determinism check failure
```

## 29A.13 Acceptance criteria

The offline CLI is complete when all of the following work:

```bash
dat-pat generate set --seed demo --difficulty 3 --offline

dat-pat generate category aperture --count 100 --difficulty 1

dat-pat generate category tfe --count 100 --difficulty 5

dat-pat generate categories --categories aperture,angle,cubes --count 20 --difficulty 2-4

dat-pat validate ./output/demo.html
```

Additional requirements:

- repeated execution with identical version/config/seed produces identical canonical question data and hashes;
- all six categories can be generated without network connectivity;
- difficulty bands are enforced by each category's validator/scorer;
- full-set generation can use one global difficulty or category-specific difficulties;
- CLI can generate tens of thousands of candidates in batch mode;
- rejected candidates never enter the final standalone document;
- generation statistics include accepted/rejected counts by category, difficulty, and rejection reason.


# 30. Performance Strategy

## 30.1 First optimize correctness

Do not prematurely optimize TFE or Boolean operations.

## 30.2 Use workers

Batch generation should use worker threads/processes with separate Manifold WASM contexts where required.

## 30.3 Cache deterministic intermediates

Cache by content hash:

- generated canonical solid recipe;
- canonical mesh;
- projection;
- edge model;
- fingerprints.

## 30.4 Limit mesh complexity

Primitive segmentation should be sufficient for clean display without excessive triangles.

Use configuration by question type.

---

# 31. Testing Strategy

## 31.1 Unit tests

Core:

- vector math;
- matrices;
- reflection;
- projection frames;
- coordinate snapping;
- segment intersection;
- collinearity;
- canonical hashing.

Geometry:

- primitive dimensions;
- Boolean expected volume;
- projection bounds;
- cross-section validity.

## 31.2 Property-based tests

Especially important for procedural systems.

Examples:

```text
same seed ⇒ same question
different fork namespace doesn't perturb sibling stream
reflection twice ⇒ original point
normalize twice ⇒ same normalized geometry
projected silhouette invariant to translation along view axis
cube exposedFaces ∈ [0,6]
fold then exact unfold ⇒ original punch coordinates
```

Use a property-testing library if desired.

## 31.3 Golden SVG tests

Store approved SVGs for:

- canonical apertures;
- canonical TFE views;
- paper-fold sequences;
- form-development nets.

Normalize SVG before diffing.

## 31.4 Solver tests

Every generator test must independently run its validator.

Avoid tests that merely assert "generator returned something."

## 31.5 Fuzzing

Run random seeds continuously:

```text
100k Aperture candidates
100k TFE candidates
100k fold sequences
...
```

Crash, timeout, invalid geometry and ambiguity rates must be recorded.

---

# 32. Benchmarks

Create benchmark suites.

## 32.1 Manifold CSG

Test:

- union;
- difference;
- intersection;
- projection;
- mesh extraction.

Datasets:

- 10 primitives;
- 100 compound templates;
- nested subtraction;
- near-coplanar cases;
- cylinder/block interactions.

Metrics:

```text
ops/sec
P50/P95/P99 latency
peak memory
triangle count
invalid output count
```

## 32.2 TFE

Measure:

```text
mesh→logical faces
edge extraction
visibility classification
segment merge
SVG generation
```

## 32.3 Batch throughput

Target after correctness:

```text
>= tens of accepted simple questions/second/core
```

Do not make a hard SLA until real measurements exist.

---

# 33. Error Handling

Use typed errors.

```ts
class GeometryGenerationError extends Error {}
class DegenerateGeometryError extends Error {}
class AmbiguousQuestionError extends Error {}
class ProjectionError extends Error {}
class ValidationError extends Error {}
```

Candidate-generation errors should normally reject a candidate rather than crash an entire batch.

Systemic errors should stop the worker.

---

# 34. Logging and Diagnostics

Each candidate should optionally emit trace information:

```text
candidateId
seed
templateId
parameters
generation duration
mesh triangles
validation failures
difficulty
fingerprints
```

Support:

```text
DEBUG_PAT_SEED=<seed>
```

to reproduce one failure.

---

# 35. Implementation Phases

## Phase 0 — Foundation

Deliver:

- monorepo;
- TypeScript;
- pnpm;
- Vitest;
- Manifold initialization;
- core vectors;
- seeded PRNG;
- SVG writer;
- Three.js adapter shell.

Acceptance:

```text
Manifold cube renders in Three.js
cube projects to CrossSection
CrossSection exports through custom SVG
same seed produces same serialized output
```

---

## Phase 1 — Aperture MVP

Implement primitives:

- cuboid;
- cylinder;
- wedge;
- prism;
- extruded polygon.

Features:

- union boss;
- notch;
- slot;
- cylindrical hole.

Templates: at least 10.

Implement:

- arbitrary orientation;
- `project()` silhouette;
- SVG answer rendering;
- 4 distractors;
- uniqueness validator;
- difficulty prototype.

Acceptance:

```text
>= 1,000 deterministic candidate generations without crash
>= 95% of accepted questions reproduce byte-equivalent canonical geometry metadata
100% accepted questions have exactly one valid answer
manual review sample demonstrates useful visual variety
```

---

## Phase 2 — Three.js Pictorial Renderer

Implement:

- object adapter;
- orthographic camera;
- isometric view;
- edge overlay;
- fixed framing;
- explanation highlight.

Acceptance:

```text
all Phase-1 objects render consistently
no clipping
consistent apparent scale
rotation/highlighting demo works
```

---

## Phase 3 — TFE MVP

Implement:

- mesh adjacency;
- logical face grouping;
- logical edges;
- front/top/end frames;
- hidden-line classification;
- collinear merging;
- SVG render;
- golden fixtures.

Acceptance:

```text
100% golden objects match expected views
no raw triangle diagonals
no duplicate projected segments
stable output across runs
```

Do not proceed to large-scale TFE generation before this phase is trustworthy.

---

## Phase 4 — TFE Question Generation

Implement:

- TFE templates;
- distractor mutations;
- answer uniqueness;
- view fingerprinting;
- difficulty metrics;
- structured explanation.

Acceptance:

```text
>= 1,000 accepted questions
0 known ambiguous items in automated validation
manual review confirms distractor plausibility
```

---

## Phase 5 — Angle Discrimination

Implement:

- vector generator;
- exact solver;
- SVG;
- randomized ray lengths/orientations;
- difficulty by angular separation;
- anti-cue validator.

Acceptance:

```text
ranking mathematically unique
same-seed determinism
no systematic visual cues in generated distribution
```

---

## Phase 6 — Paper Folding

Implement:

- polygon paper;
- fold lines;
- reflection;
- polygon split;
- layer states;
- punches;
- exact unfolding;
- SVG fold-step rendering;
- distractors.

Acceptance:

```text
reflection property tests pass
fold/unfold round-trip fixtures pass
unique answer validator required
no punch on fold/boundary ambiguity
```

---

## Phase 7 — Cube Counting

Implement:

- voxel model;
- structure templates;
- exposure solver;
- Three.js instanced renderer;
- answer generation;
- visual-quality validator.

Acceptance:

```text
solver verified exhaustively on small grids
all generated structures connected
manual visibility sample acceptable
```

---

## Phase 8 — Form Development

Implement:

- logical polyhedron;
- face adjacency;
- net unfolding;
- overlap detection;
- fold verification;
- markings/patterns;
- distractors.

Acceptance:

```text
cube/prism/pyramid fixtures unfold and refold exactly
invalid nets rejected
answer uniqueness enforced
```

---

## Phase 9 — Unified Question Bank

Implement:

- common schema;
- content hashes;
- fingerprints;
- duplicate detector;
- JSONL export;
- batch workers;
- metrics;
- CLI inspector.

Acceptance:

```text
mixed six-type batch generation works
questions fully reproducible from stored recipe
duplicate checks operate across batches
```

---

# 36. AI Coding Agent Work Rules

The implementation agent must follow these rules.

## 36.1 Before coding

For each phase:

1. inspect current repository;
2. read this specification;
3. identify exact acceptance criteria;
4. write/update tests first for math-heavy components;
5. implement smallest correct vertical slice;
6. run tests;
7. inspect generated artifacts;
8. commit logically grouped changes.

## 36.2 Never invent hidden assumptions

Place ambiguous domain choices into explicit configuration constants.

Examples:

```text
right-side vs left-side END view
hidden-line convention
aperture exact-match vs containment
paper-fold punch boundary policy
cube painting convention
```

## 36.3 No pixel-based correctness

Pixels may be used for visual regression only.

Ground truth must use:

```text
geometry
topology
vectors
polygons
visibility
discrete voxel state
```

## 36.4 Preserve provenance

Whenever feasible, retain source feature IDs through:

```text
recipe
→ solid
→ logical face
→ logical edge
→ projected edge
→ SVG element
→ explanation
```

## 36.5 Reject aggressively

A smaller high-quality accepted bank is preferred over keeping marginal candidates.

## 36.6 Do not silently repair ambiguous questions

If validation detects ambiguity:

```text
reject
record reason
```

Generate a new candidate.

---

# 37. Coding Standards

Use:

- strict TypeScript;
- no `any` except isolated third-party boundary with explanation;
- immutable tuples for vectors where practical;
- pure math functions;
- explicit ownership/disposal of WASM/Three.js objects;
- exhaustive discriminated unions;
- no global mutable RNG;
- no magic tolerances;
- no rendering calls inside solvers.

Each public function should have:

- clear input units/conventions;
- deterministic behavior statement;
- error behavior;
- tests.

---

# 38. Core Invariants

These invariants must remain true.

```text
I1. same recipe + same version = same canonical question

I2. every accepted question has exactly one mathematically valid answer

I3. every accepted question passes geometry and renderability validation

I4. renderer output never determines answer truth

I5. question-type semantics remain isolated from generic geometry kernel

I6. geometric tolerances are centralized

I7. projection axes are globally consistent

I8. raw triangulation edges never appear as semantic TFE edges by default

I9. provenance survives far enough to support structured explanations

I10. duplicate/equivalent choices are rejected
```

---

# 39. Initial API Targets

Example high-level API:

```ts
const engine = await createPatEngine({
  engineVersion: "1.0.0",
});

const question = await engine.generate({
  type: "aperture",
  seed: "example-001",
  difficulty: 3,
});

const result = engine.validate(question);

const assets = await engine.render(question, {
  format: "svg",
});
```

Batch:

```ts
for await (const question of engine.generateBatch({
  type: "view-recognition",
  count: 1000,
  seed: "batch-2026-01",
  difficultyRange: [2, 4],
})) {
  // persist
}
```

---

# 40. First Vertical Slice

The AI agent should begin with this exact implementation target:

```text
Template:
cuboid + rectangular notch + cylindrical boss

Input:
seed

Output:
1. serialized procedural recipe
2. Manifold solid
3. canonical mesh statistics
4. isometric Three.js preview
5. arbitrary orthographic silhouette
6. correct aperture SVG
7. four controlled distractor SVGs
8. automatic uniqueness validation
9. structured explanation JSON
10. deterministic fingerprint
```

This vertical slice validates:

- Manifold;
- 3D primitives;
- Boolean composition;
- seeded randomness;
- projection;
- CrossSection;
- SVG;
- distractors;
- validator;
- provenance;
- Three.js integration.

Do this before implementing the full primitive catalog.

---

# 41. Recommended Initial Object Templates

Implement in this order:

```text
T01 cuboid-notch
T02 cuboid-wedge
T03 cuboid-cylinder-boss
T04 cuboid-through-hole
T05 cuboid-slot
T06 stepped-block
T07 L-prism
T08 T-prism
T09 cuboid-wedge-slot
T10 prism-cylinder-cut
T11 block-half-cylinder-groove
T12 block-two-level-step
```

Each template should specify:

- valid parameter ranges;
- minimum feature sizes;
- allowed feature locations;
- allowed question types;
- known symmetry hazards;
- preferred camera/orientation ranges;
- difficulty tendencies.

---

# 42. Security and Robustness

Although this is geometry generation, treat external recipe input as untrusted.

Apply limits:

```text
max operations
max triangles
max polygon vertices
max recursion depth
max fold count
max voxel grid dimension
max net face count
generation timeout
```

Batch workers should terminate pathological candidates.

---

# 43. Licensing and Content Policy

Generate **original procedural DAT-style material**.

Do not ingest, reproduce or derive questions directly from active/proprietary exam items.

Use official materials to understand:

- question taxonomy;
- test concepts;
- terminology;
- high-level format.

Keep generated object recipes and questions independently authored by the engine.

Review dependency licenses before production distribution.

---

# 44. Source References

Primary technical references to consult during implementation:

- ManifoldCAD JavaScript/WASM User Guide  
  https://manifoldcad.org/docs/jsuser/

- Manifold class documentation (`project`, `slice`, `extrude`, mesh operations)  
  https://manifoldcad.org/docs/jsuser/classes/Manifold.html

- Three.js documentation  
  https://threejs.org/docs/

- Three.js OrthographicCamera  
  https://threejs.org/docs/pages/OrthographicCamera.html

- Three.js EdgesGeometry  
  https://threejs.org/docs/pages/EdgesGeometry.html

- Three.js SVGRenderer  
  https://threejs.org/docs/pages/SVGRenderer.html

- Canadian Dental Association DAT information / candidate guides  
  https://www.cda-adc.ca/en/becoming/dat/

Important implementation principle from the technical references:

```text
Manifold supplies robust 2D/3D geometry.
Three.js supplies interactive visualization.
The PAT engine supplies exam semantics and mathematical correctness.
```

---

# 45. Definition of Done for Version 1

Version 1 is complete when:

- all six PAT generators exist;
- every question is deterministic;
- all generators have automated solvers;
- all generators have automatic uniqueness validators;
- all question types emit SVG;
- 3D-relevant types have Three.js visualization;
- TFE views use logical/visibility-aware edges;
- Paper Folding tracks layers exactly;
- Cube Counting uses discrete voxel truth;
- Form Development verifies folding topology;
- projection/answer fingerprints are stored;
- duplicate detection exists;
- difficulty components are recorded;
- structured explanations exist;
- CLI batch generation works;
- accepted questions can be regenerated exactly;
- test suites and golden fixtures pass;
- batch fuzz tests produce no uncaught geometry crashes;
- candidate rejection telemetry is available.

---

# 46. Recommended Implementation Order

Use this order exactly unless testing reveals a blocking Manifold limitation:

```text
1. Core + Manifold wrapper
2. Deterministic RNG
3. Primitive/feature grammar
4. SVG
5. Aperture vertical slice
6. Three.js visualization
7. Aperture production generator
8. TFE geometry/hidden-line engine
9. TFE production generator
10. Angle
11. Paper Folding
12. Cube Counting
13. Form Development
14. Unified difficulty model
15. Question bank / fingerprints
16. Batch workers
17. Inspector/playground
18. Large-scale fuzzing/benchmarking
```

Aperture is the proof that Manifold can serve as the geometric foundation.  
TFE is the proof that the architecture can support the hardest line-drawing requirement.  
Only after both are correct should the project expand aggressively across the remaining PAT families.
