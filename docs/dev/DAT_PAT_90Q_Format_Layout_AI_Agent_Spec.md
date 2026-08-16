# DAT Perceptual Ability Test (PAT) — Full 90-Question Exam Generation, Format & Layout Specification

**Document type:** AI-agent implementation specification  
**Target exam:** ADA Dental Admission Test (DAT) — Perceptual Ability Test  
**Research date:** 2026-08-16  
**Primary authority:** ADA 2026 Candidate Guide + ADA Perceptual Ability Test Section Instructions  
**Secondary references:** BohrPrep and Erudition PAT pages supplied in `links.md`  
**Purpose:** Define the content contract, visual grammar, page layout, item sequence, answer-choice conventions, validation rules, full-set assembly rules, and QA requirements for generating an original 90-question PAT mock exam.

---

# 0. Executive Build Contract

The generator must produce a **90-item, 60-minute PAT mock exam** composed of six 15-item blocks in this order:

| Question range | Official ADA category | Common prep name | Items | Choices/item |
|---:|---|---|---:|---:|
| 1–15 | Apertures | Keyholes | 15 | 5 (A–E) |
| 16–30 | View Recognition | Top-Front-End / TFE | 15 | 4 (A–D) |
| 31–45 | Angle Discrimination | Angle Ranking | 15 | 4 (A–D) |
| 46–60 | Paper Folding | Hole Punching | 15 | 5 (A–E) |
| 61–75 | Cube Counting | Cube Counting | 15 | 5 (A–E) |
| 76–90 | Spatial Relations / 3D Form Development | Pattern Folding | 15 | 4 (A–D) |

**Exam time:** 60 minutes total.  
**Average time budget:** 40 seconds/item.  
**Delivery:** computer-based; one item at a time.  
**Artwork:** vector-first SVG.  
**Correct answers:** exactly one per item.  
**Generation:** deterministic from seed + generator versions.  
**IP policy:** create original geometry and artwork; do not reproduce, trace, or regenerate copyrighted ADA/prep-provider questions.

The full mock should imitate **question type, rules, information density, line conventions, and answer layout**, while retaining an independent visual identity.

---

# 1. Source Hierarchy

Use this priority order whenever sources differ:

1. **Current ADA Candidate Guide**
2. **Current ADA PAT Section Instructions**
3. Current ADA DAT web pages
4. Current specialized PAT prep sources
5. Older prep-source guidance
6. Generator-specific decisions in this document

The ADA Candidate Guide current at research time states that the PAT contains **90 items** and six subtests. It also states that the PAT receives **60 minutes**, and computer-delivered test items are presented **one at a time**.

The ADA PAT instruction document defines the visual and behavioral rules for all six PAT categories.

Secondary sources are used to infer:
- stable item ordering;
- common terminology;
- common distractor families;
- common presentation patterns;
- prep-oriented difficulty characteristics.

When a secondary source conflicts with ADA material, the ADA rule wins.

---

# 2. Source-Derived PAT Taxonomy

Canonical internal enum:

```ts
export type PatCategory =
  | "APERTURES"
  | "VIEW_RECOGNITION"
  | "ANGLE_DISCRIMINATION"
  | "PAPER_FOLDING"
  | "CUBE_COUNTING"
  | "SPATIAL_RELATIONS";
```

Accepted aliases:

```ts
const PAT_ALIASES = {
  APERTURES: [
    "aperture",
    "apertures",
    "keyhole",
    "keyholes",
    "KH"
  ],

  VIEW_RECOGNITION: [
    "view recognition",
    "top-front-end",
    "top front end",
    "TFE"
  ],

  ANGLE_DISCRIMINATION: [
    "angle discrimination",
    "angle ranking",
    "AR"
  ],

  PAPER_FOLDING: [
    "paper folding",
    "hole punching",
    "hole punch",
    "HP"
  ],

  CUBE_COUNTING: [
    "cube counting",
    "CC"
  ],

  SPATIAL_RELATIONS: [
    "spatial relations",
    "3D form development",
    "three-dimensional form development",
    "pattern folding",
    "PF"
  ]
};
```

Use **official ADA labels** in formal exam metadata.

The UI may show a familiar alias in secondary text:

```text
Apertures · Keyholes
View Recognition · TFE
Angle Discrimination · Angle Ranking
Paper Folding · Hole Punching
Cube Counting
Spatial Relations · Pattern Folding
```

---

# 3. Full Exam Manifest

Canonical full-set manifest:

```json
{
  "examType": "DAT_PAT_MOCK",
  "version": "1.0",
  "timeLimitSeconds": 3600,
  "questionCount": 90,
  "delivery": "ONE_ITEM_AT_A_TIME",
  "sections": [
    {
      "category": "APERTURES",
      "start": 1,
      "end": 15,
      "count": 15,
      "choiceCount": 5
    },
    {
      "category": "VIEW_RECOGNITION",
      "start": 16,
      "end": 30,
      "count": 15,
      "choiceCount": 4
    },
    {
      "category": "ANGLE_DISCRIMINATION",
      "start": 31,
      "end": 45,
      "count": 15,
      "choiceCount": 4
    },
    {
      "category": "PAPER_FOLDING",
      "start": 46,
      "end": 60,
      "count": 15,
      "choiceCount": 5
    },
    {
      "category": "CUBE_COUNTING",
      "start": 61,
      "end": 75,
      "count": 15,
      "choiceCount": 5
    },
    {
      "category": "SPATIAL_RELATIONS",
      "start": 76,
      "end": 90,
      "count": 15,
      "choiceCount": 4
    }
  ]
}
```

## 3.1 Source discrepancy handling

One Erudition overview line labels the last block as `75–90`, creating a one-item overlap with Cube Counting. The dedicated Erudition Pattern Folding page states `76–90`. A 90-item exam with six 15-item groups mathematically requires `76–90`.

The generator must use:

```text
61–75  Cube Counting
76–90  Spatial Relations / Pattern Folding
```

---

# 4. Exam Shell vs. Development Showcase

Two distinct layouts must exist.

## 4.1 Exam Mode

Faithful behavior:

```text
ONE QUESTION
     ↓
answer choices
     ↓
navigation / timer
```

Only one item is displayed in the primary question viewport.

## 4.2 Category Showcase / QA Mode

Development-only route:

```text
/showcase/pat
```

Displays one representative example from each of the six categories on a single page.

Purpose:
- renderer QA;
- visual regression testing;
- rapid comparison;
- design review;
- debugging;
- screenshot documentation.

The showcase page is **not** an assertion that the real DAT displays all six categories simultaneously.

---

# 5. Global Exam UI Layout

Recommended desktop shell:

```text
┌──────────────────────────────────────────────────────────────┐
│ Perceptual Ability Test          Question 18 of 90   47:22  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    QUESTION CONTENT                           │
│                                                              │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                      ANSWER CHOICES                           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Previous            Mark / Review                  Next      │
└──────────────────────────────────────────────────────────────┘
```

Important distinction:

- `90 items`, `60 minutes`, and `one item at a time` are source-backed exam properties.
- Exact navigation-button labels and chrome are implementation choices unless verified against the current Prometric tutorial.

Do not claim a custom mock interface is an exact Prometric clone.

---

# 6. Global Rendering Rules

## 6.1 Output format

Primary:

```text
SVG
```

Fallback exports:

```text
PNG @ 2×
PNG @ 3×
PDF for print packs
```

SVG is canonical.

---

## 6.2 Visual style

Question artwork should use:

```text
background: white
geometry stroke: near-black
answer cell background: white or very light neutral
visible line: solid
hidden line: dotted/dashed only where category requires
fill: white/light neutral unless shading is part of the problem
```

Avoid decorative color in scored question graphics.

Color may be used in:
- explanations;
- debug overlays;
- instructor mode;
- review UI.

---

## 6.3 Stroke hierarchy

Suggested normalized units:

```ts
const PAT_STROKES = {
  outer: 2.0,
  structural: 1.8,
  foldSolid: 1.8,
  hidden: 1.5,
  foldGhost: 1.5,
  answerFrame: 1.2,
  debug: 1.0
};
```

All values scale uniformly with `viewBox`.

---

## 6.4 Minimum visual differences

The generator must ensure distractors differ visibly at target display size.

Recommended minimum QA thresholds:

```text
minimum relevant line displacement: 5 px
minimum relevant length difference: 6 px
minimum angular difference display displacement: 4 px at arm endpoint
minimum hole-center displacement: 8 px
minimum distinct feature gap: 5 px
```

These are generator QA thresholds, not official DAT specifications.

---

# 7. Responsive Layout Contract

Primary question design canvas:

```text
logical width: 1200
logical height: 720
```

SVG:

```html
<svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid meet">
```

Desktop recommended content width:

```text
900–1200 CSS px
```

Mobile:

```text
question artwork width: 100%
answers may wrap only where format permits
horizontal scrolling: prohibited for scored content
```

All labels must remain legible at approximately `360 CSS px` viewport width.

For dense TFE / Pattern Folding graphics, allow:
- full-width illustration area;
- answers beneath the stem rather than forcing a desktop row.

---

# 8. Answer-Choice Layout Matrix

| Category | Answer count | Preferred desktop layout | Mobile layout |
|---|---:|---|---|
| Apertures | 5 | object + A–E horizontal row | object above, 2/3-row answer grid |
| View Recognition | 4 | TFE diagram + A–D row | diagram above, 2×2 |
| Angle Discrimination | 4 | angles top + text answers below/side | angles top + 4 stacked choices |
| Paper Folding | 5 | folds top + A–E row | folds top + answer grid |
| Cube Counting | 5 | cube figure left + text choices right | figure above + choices below |
| Spatial Relations | 4 | net left + A–D row/right | net above + 2×2 |

Never alter logical choice labels during responsive rearrangement.

---

# 9. Question Record — Common Schema

```ts
interface PatQuestionBase {
  id: string;
  examId: string;

  globalIndex: number;       // 1..90
  category: PatCategory;
  categoryIndex: number;     // 1..15

  seed: number;

  difficulty: {
    label: "EASY" | "MEDIUM" | "HARD";
    score: number;           // 0..1
    metrics: Record<string, number>;
  };

  prompt: string | null;

  choiceCount: 4 | 5;
  choices: PatChoice[];
  correctChoice: "A" | "B" | "C" | "D" | "E";

  assets: {
    questionSvg: string;
    explanationSvgs?: string[];
  };

  validation: {
    status: "ACCEPTED" | "REJECTED";
    validators: ValidationRecord[];
  };

  versions: {
    generator: string;
    renderer: string;
    validator: string;
    grammar: string;
  };

  provenance: {
    originalGeneratedContent: true;
    sourceQuestionCopied: false;
  };
}
```

---

# 10. Full-Set Difficulty Blueprint

The ADA sources define the test format; they do not publish a required easy/medium/hard count for each 15-item block.

Use this **generator design target**:

```text
4 Easy
7 Medium
4 Hard
```

per category.

Total mock:

```text
24 Easy
42 Medium
24 Hard
```

Shuffle difficulty within each 15-item block.

Constraints:

```text
no more than 3 consecutive same difficulty labels
first item of a block should not be among the hardest 10%
last item need not be hard
avoid obvious linear easy→hard ramps
```

---

# 11. Full-Set Randomization Rules

Randomize:

```text
correct answer letter
object parameters
camera orientation within allowed grammar
feature locations
distractor mutation types
angle orientation
fold direction
punch location
cube structure
pattern face markings
```

Preserve:

```text
category order
global question numbering
choice count by category
official geometric rules
technical line conventions
```

Answer key balancing target per 15-item block:

### Five-choice categories

Approximate:

```text
A: 3
B: 3
C: 3
D: 3
E: 3
```

### Four-choice categories

Approximate:

```text
A: 3–4
B: 3–4
C: 3–4
D: 3–4
```

Avoid visible answer-letter patterns.

---

# 12. Category 1 — Apertures

## 12.1 Item range

```text
1–15
```

## 12.2 Source-defined task

Display:
- one three-dimensional object;
- five aperture outlines.

Candidate chooses the aperture through which the object can pass completely on a straight path after choosing an initial orientation.

Core rules:
- object may be rotated before insertion;
- object stays fixed in orientation during passage;
- aperture matches an appropriate external outline;
- object and aperture use the same scale;
- hidden geometry has no arbitrary irregularities;
- symmetric hidden indentations are treated symmetrically;
- exactly one answer is correct.

---

## 12.3 Canonical layout

Desktop:

```text
┌─────────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│             │         │         │         │         │         │
│  3D OBJECT  │    A    │    B    │    C    │    D    │    E    │
│             │         │         │         │         │         │
└─────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

Preferred ratios:

```text
object panel: 1.25× answer panel width
each answer panel: equal width
vertical alignment: centered
labels A–E below aperture
```

---

## 12.4 Question artwork

3D object:
- pictorial/axonometric view;
- no perspective distortion required for generator;
- black structural edges;
- clear silhouette;
- avoid excessive hidden line clutter.

Aperture:
- 2D outline only;
- no internal technical edges unless required by the chosen specification;
- consistent scale relative to source object.

---

## 12.5 Generator kernel

```text
JSCAD GeometryKernel3D
+
custom axonometric SVG renderer
+
JSCAD/custom orthographic projection
+
aperture fit validator
```

---

## 12.6 Distractor families

Required rotation across a 15-item block:

```text
wrong overall shape
correct family, too small
wrong width
wrong height
protrusion omitted
protrusion misplaced
notch omitted
notch misplaced
wrong slope
wrong relative proportions
mirror-like trap
plausible wrong projection
```

Avoid five answers that differ by only one tiny pixel-scale feature.

---

## 12.7 15-item content blueprint

Recommended:

```text
3 stepped/polyhedral solids
3 additive cuboid + wedge solids
2 subtractive notch/slot solids
2 cylindrical-feature solids
2 hull/sloped transition solids
3 mixed-feature solids
```

Difficulty dimensions:

```text
projection ambiguity
oblique features
concavity
symmetry
distractor similarity
number of meaningful extents
```

---

## 12.8 Validation

Accept only when:

```text
exactly one aperture fits
correct fit has robust numerical margin
every distractor fails under orientation search
all five choices are visually distinct
correct silhouette is readable
object view exposes enough information
```

---

# 13. Category 2 — View Recognition

## 13.1 Item range

```text
16–30
```

## 13.2 Source-defined task

Three orthographic views are used:
- TOP;
- FRONT;
- END, viewed from the right.

The standard arrangement is:

```text
TOP VIEW        [upper-left]

FRONT VIEW      END VIEW
[lower-left]    [lower-right]
```

Two views are given.

Four alternatives compete for the missing view.

Views use **parallel projection**, without perspective.

Visible edges:
```text
solid
```

Hidden edges:
```text
dotted/dashed
```

The missing view can be any of:
- TOP;
- FRONT;
- END.

---

## 13.3 Canonical question layout

```text
┌───────────────────┬────────┬────────┬────────┬────────┐
│                   │        │        │        │        │
│   TWO TFE VIEWS   │   A    │   B    │   C    │   D    │
│   + missing slot  │        │        │        │        │
│                   │        │        │        │        │
└───────────────────┴────────┴────────┴────────┴────────┘
```

Alternatively, on smaller screens:

```text
      GIVEN VIEWS

      [A] [B]
      [C] [D]
```

---

## 13.4 Renderer rules

Never use perspective.

Canonical mapping:

```text
TOP:
  screen = X,Y
  depth  = Z

FRONT:
  screen = X,Z
  depth  = Y

END:
  screen = Y,Z
  depth  = X
```

Maintain a fixed handedness and test it with golden fixtures.

---

## 13.5 Generator kernel

```text
JSCAD GeometryKernel3D
+
topology extractor
+
custom orthographic renderer
+
hidden-line removal
+
semantic curve renderer
```

---

## 13.6 Missing-view distribution

Generator design target:

```text
TOP missing:   5
FRONT missing: 5
END missing:   5
```

Shuffle positions within questions 16–30.

This is a balancing strategy for generated mocks, not an official published requirement.

---

## 13.7 Distractor families

```text
missing structural edge
extra structural edge
solid ↔ hidden line mutation
shifted feature
mirrored feature
incorrect depth interpretation
hole ↔ boss confusion
incorrect slope projection
incorrect extent
incorrect feature alignment
```

Every distractor should correspond to a plausible cross-view reasoning error.

---

## 13.8 Validation

```text
canonical missing view generated from source geometry
one exact canonical answer
three distinct distractors
hidden/visible line classification verified
all drawings share common scale
no unintended mesh/tessellation lines
```

---

# 14. Category 3 — Angle Discrimination

## 14.1 Item range

```text
31–45
```

## 14.2 Source-defined task

Show four interior angles:

```text
1  2  3  4
```

Candidate ranks them:

```text
smallest → largest
```

Four alternatives are shown.

Secondary current prep guidance notes:
- the interior angle is the measured quantity;
- angle arms may have different lengths;
- angles may have different page orientations;
- close angle sizes are intentional;
- a one-degree separation may occur in prep representations.

---

## 14.3 Canonical layout

```text
┌────────┬────────┬────────┬────────┐
│ angle1 │ angle2 │ angle3 │ angle4 │
│   1    │   2    │   3    │   4    │
└────────┴────────┴────────┴────────┘

A) 2-1-4-3
B) 1-2-4-3
C) 2-4-1-3
D) 4-2-1-3
```

---

## 14.4 Generator kernel

```text
custom deterministic SVG
+
Flatten.js optional geometry helpers
```

No 3D kernel is required.

---

## 14.5 Geometry model

```ts
interface AngleItemGeometry {
  valuesDeg: [number, number, number, number];

  rays: [
    AngleRayPair,
    AngleRayPair,
    AngleRayPair,
    AngleRayPair
  ];
}

interface AngleRayPair {
  vertex: Vec2;
  direction1Deg: number;
  direction2Deg: number;
  arm1Length: number;
  arm2Length: number;
}
```

Truth comes from `valuesDeg`, never from rendered pixels.

---

## 14.6 Difficulty target

Suggested generator bands:

```text
Easy:
  minimum adjacent sorted difference >= 6°

Medium:
  minimum adjacent sorted difference >= 3° and < 6°

Hard:
  minimum adjacent sorted difference >= 1° and < 3°
```

Use these as configurable defaults.

Avoid:
- exact ties;
- differences below renderer precision;
- accidental anti-aliasing clues;
- identical arm lengths/orientations across all four angles.

---

## 14.7 Visual variations

Vary:

```text
rotation
vertex position
arm length
arm-length asymmetry
near-horizontal arms
near-vertical arms
acute / near-right / selected obtuse families
```

Do not vary:
```text
stroke width by angle
color by angle
line cap by answer status
```

---

## 14.8 Distractor permutation strategy

Correct ranking:

```text
r0-r1-r2-r3
```

Distractors should be close permutations:

```text
swap smallest pair
swap largest pair
swap middle pair
correct endpoints / wrong middle
wrong smallest / otherwise plausible
wrong largest / otherwise plausible
```

Avoid obviously random permutations that are too easy to eliminate.

---

# 15. Category 4 — Paper Folding

## 15.1 Item range

```text
46–60
```

## 15.2 Source-defined task

A square sheet is folded one or more times.

Drawing conventions:
- broken/dashed lines indicate previous/original paper position;
- solid lines indicate current folded paper;
- paper remains within original square;
- paper is not arbitrarily turned or twisted;
- final frame shows one or more hole punches;
- a punch penetrates all paper layers at that location;
- answer choices show hole locations on the unfolded square;
- exactly one pattern is correct.

Official examples use the familiar **4×4 hole-position grid** for answer display.

---

## 15.3 Canonical layout

```text
FOLD 1       FOLD 2       FOLD 3       PUNCH
┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐
│       │ →  │       │ →  │       │ →  │   ○   │
└───────┘    └───────┘    └───────┘    └───────┘

┌─────┬─────┬─────┬─────┬─────┐
│  A  │  B  │  C  │  D  │  E  │
│4×4  │4×4  │4×4  │4×4  │4×4  │
└─────┴─────┴─────┴─────┴─────┘
```

---

## 15.4 Fold-frame semantics

For each frame:

```text
solid outline = current paper
dashed outline/segments = prior/original extent
white outlined circle = punch on folded paper
black filled circles = final unfolded answer positions
```

Use consistent semantics throughout the bank.

---

## 15.5 Generator kernel

```text
Flatten.js GeometryKernel2D
+
custom paper-layer engine
+
affine reflection transforms
+
custom SVG renderer
```

---

## 15.6 Required layer model

A simple “mirror the punch after each fold” implementation is insufficient for all folds.

Use explicit layers:

```ts
interface PaperLayer {
  id: string;
  polygon: Polygon2;
  transformFromOriginal: Matrix3;
  orientation: 1 | -1;
  zOrder: number;
  foldHistory: string[];
}
```

Fold operation:

```ts
interface FoldOperation {
  crease: Segment2;
  movingSide: "POSITIVE" | "NEGATIVE";
  movingLayerIds: string[];
}
```

Punch operation:

```ts
interface PunchOperation {
  point: Vec2;
  radius: number;
  penetratedLayerIds: string[];
}
```

---

## 15.7 Fold families

Across 15 questions use:

```text
horizontal
vertical
diagonal
same-direction repeated folds
fold-back cases
partial-layer folds
folds where top layers do not cover the whole folded footprint
```

Recommended fold-count distribution:

```text
2 folds: 5 items
3 folds: 8 items
complex 3-fold / selective-layer: 2 items
```

This is generator balancing, not an official count.

---

## 15.8 Answer construction

Correct answer:
- unfold penetrated layers through inverse fold history;
- normalize resulting hole coordinates to 4×4 answer grid positions when using grid-constrained generation.

Distractors:

```text
forget last unfold
reflect across wrong crease
reflect only some holes
wrong layer count
wrong diagonal direction
off-by-one grid column
off-by-one grid row
mirror full answer horizontally
mirror full answer vertically
```

---

## 15.9 Validation

```text
all folded paper stays inside original square
fold polygons remain valid
layer coverage is exact
punch intersects at least one layer
correct punch count matches layer topology
holes remain within original paper
five choices unique
one exact answer
```

---

# 16. Category 5 — Cube Counting

## 16.1 Item range

```text
61–75
```

## 16.2 Source-defined task

A figure is made from equal-sized cubes cemented together.

The assembled figure is painted on exposed sides except the bottom resting on the ground.

Faces touching another cube are unpainted.

Hidden cubes are inferred where required to support cubes above.

Question asks how many cubes have exactly:

```text
1
2
3
4
or 5
```

painted/exposed sides.

The ADA instruction document states that zero is not a correct response for these questions.

---

## 16.3 Canonical layout

Desktop:

```text
┌──────────────────────────────┬───────────────────────────────┐
│                              │ How many cubes have exactly   │
│      ISOMETRIC STRUCTURE     │ two exposed sides painted?    │
│                              │                               │
│                              │ A) 1 cube                     │
│                              │ B) 2 cubes                    │
│                              │ C) 3 cubes                    │
│                              │ D) 4 cubes                    │
│                              │ E) 5 cubes                    │
└──────────────────────────────┴───────────────────────────────┘
```

---

## 16.4 Generator kernel

Truth engine:

```text
custom integer voxel kernel
```

Rendering:

```text
custom isometric SVG renderer
```

Optional debug/editor:

```text
Three.js orthographic camera
```

Do not use rendered pixels to calculate painted sides.

---

## 16.5 Voxel truth model

```ts
interface Cube {
  x: number;
  y: number;
  z: number;
}

type CubeKey = `${number},${number},${number}`;

interface CubeStructure {
  cubes: Set<CubeKey>;
}
```

For each cube:

```ts
interface CubeExposure {
  cube: Cube;
  exposedLeft: boolean;
  exposedRight: boolean;
  exposedFront: boolean;
  exposedBack: boolean;
  exposedTop: boolean;
  exposedBottom: false;
  paintedCount: 1 | 2 | 3 | 4 | 5;
}
```

`exposedBottom` remains unpainted due to the ground rule.

---

## 16.6 Hidden support logic

Generator must know every cube explicitly.

For display:
- some cubes may be occluded by the chosen camera;
- hidden supporting cubes remain present in truth data.

Generator integrity rule:

```text
if a cube is visually hidden and supports a visible cube above,
it must exist in the voxel model.
```

Do not create unintentionally ambiguous hidden occupancy.

---

## 16.7 Structure reuse

Secondary prep guidance refers to “associated problems” for a structure, and current prep guidance outside the supplied list also commonly groups multiple questions around one cube figure.

Because the ADA public instruction sample does not prescribe a fixed reuse count, make this configurable.

Recommended mock profile:

```text
5 structures × 3 questions each = 15 questions
```

Alternate allowed profiles:

```text
6 structures with 2–3 questions each
4 structures with 3–4 questions each
```

Within a structure group:
- ask different painted-face counts;
- never repeat the same target count;
- preserve the exact same SVG structure/camera when reusing the figure.

---

## 16.8 Answer choice construction

If correct count is `n > 0`, create four nearby integer distractors.

Prefer:

```text
n - 2
n - 1
n + 1
n + 2
```

subject to:
- positive integers;
- unique choices;
- plausible counts.

Shuffle A–E.

Never make `0` the correct answer.

---

## 16.9 Validation

```text
every elevated cube is intentionally supported or intentionally allowed by explicit visible-floating-cube policy
all cubes connected when grammar requires connectivity
painted counts computed from adjacency
bottom never painted
correct count > 0
answer set contains exactly one correct count
isometric SVG is visually decipherable
hidden support occupancy unambiguous
```

---

# 17. Category 6 — Spatial Relations / 3D Form Development

## 17.1 Item range

```text
76–90
```

## 17.2 Common name

```text
Pattern Folding
```

Do not confuse this with Paper Folding / Hole Punching.

---

## 17.3 Source-defined task

A flat pattern/net is shown on the left.

It is folded along its displayed solid boundaries into a 3D object.

Four 3D candidate figures are shown.

Exactly one candidate corresponds to the flat pattern.

The visible side of the flat pattern represents the outside of the folded object.

Patterns may include:
- blank faces;
- shading;
- dots;
- symbols;
- line patterns;
- orientation-sensitive markings.

---

## 17.4 Canonical layout

```text
┌───────────────────────┬────────┬────────┬────────┬────────┐
│                       │        │        │        │        │
│      FLAT NET         │   A    │   B    │   C    │   D    │
│                       │  3D    │  3D    │  3D    │  3D    │
│                       │        │        │        │        │
└───────────────────────┴────────┴────────┴────────┴────────┘
```

---

## 17.5 Generator architecture

Recommended truth model:

```text
face-net graph
+
rigid face transforms
+
3D closure validator
+
custom/Three.js debug renderer
+
SVG production renderer
```

Use JSCAD only when useful for generating/rendering the resulting closed polyhedron.

The core truth should be a **face adjacency + hinge topology model**, since this question type asks whether a specific net folds into a given arrangement.

---

## 17.6 Net data model

```ts
interface NetFace {
  id: string;
  polygon2: Vec2[];
  marking?: FaceMarking;
}

interface NetHinge {
  faceA: string;
  faceB: string;
  edgeA: [number, number];
  edgeB: [number, number];
  foldAngleDeg: number;
}

interface PatternNet {
  faces: NetFace[];
  hinges: NetHinge[];
}
```

Folded result:

```ts
interface FoldedFace {
  faceId: string;
  transform3: Matrix4;
  normal: Vec3;
}
```

---

## 17.7 V1 shape families

Start with:

```text
cube/cuboid nets
triangular prisms
trapezoidal prisms
wedge-like prisms
selected pyramidal/frustum-like polyhedra
simple asymmetric polyhedra
```

Defer exotic high-face-count solids.

---

## 17.8 Distractor families

```text
wrong adjacency
correct faces / wrong orientation
marking rotated 90°
marking mirrored
two faces swapped
correct shape family / impossible net relation
wrong neighboring shaded faces
correct face count / wrong visible arrangement
```

---

## 17.9 Validation

```text
net folds to a valid closed solid
no self-intersection
face normals consistent
outside markings remain outside
one candidate geometrically/semantically matches
three distractors differ in meaningful topology or marking orientation
```

---

# 18. Per-Category Prompt Text

Use concise directions in scored mode.

Recommended mock labels:

### Apertures

```text
Select the opening through which the object can pass completely.
```

### View Recognition

```text
Choose the correct TOP VIEW.
```

or:

```text
Choose the correct FRONT VIEW.
```

or:

```text
Choose the correct END VIEW.
```

### Angle Discrimination

```text
Rank angles 1–4 from smallest to largest.
```

### Paper Folding

Usually no long stem is required when the fold sequence and punch are visually clear.

Optional:

```text
Choose the hole pattern produced when the paper is completely unfolded.
```

### Cube Counting

```text
How many cubes have exactly three exposed sides painted?
```

### Spatial Relations

```text
Choose the three-dimensional object that can be formed from the flat pattern.
```

Keep directions stable across a mock exam.

---

# 19. Common SVG Asset Contract

Every question asset:

```ts
interface SvgAssetMeta {
  viewBox: [number, number, number, number];
  logicalWidth: number;
  logicalHeight: number;

  semanticLayers: {
    background?: string;
    questionGeometry?: string;
    answerGeometry?: string;
    visibleEdges?: string;
    hiddenEdges?: string;
    folds?: string;
    punches?: string;
    labels?: string;
  };
}
```

Recommended SVG structure:

```xml
<svg viewBox="0 0 1200 720">
  <g id="question-geometry"></g>
  <g id="visible-edges"></g>
  <g id="hidden-edges"></g>
  <g id="fold-lines"></g>
  <g id="punches"></g>
  <g id="answer-geometry"></g>
  <g id="labels"></g>
</svg>
```

Deterministic element ordering is required for snapshot tests.

---

# 20. Choice Cards

All answer choices should have:

```text
same bounding-box dimensions
same scale within category
same stroke system
same white space
same label baseline
```

Do not visually cue the correct answer with:
- larger drawing;
- more centered drawing;
- different stroke;
- cleaner SVG;
- different anti-aliasing;
- different padding;
- different file format.

---

# 21. Exam Timer & Navigation

Source-backed:

```text
PAT time limit = 60:00
90 questions
one item at a time
```

Recommended simulator behavior:

```text
countdown timer
previous
next
question index
mark-for-review
review screen
auto-submit at 00:00
```

Treat the last five as simulator UX features unless the current Prometric tutorial is separately verified.

Timer logic:

```ts
start = 3600;
remaining = max(0, start - elapsedActiveSeconds);
```

Do not decrement time during internal asset loading.

The ADA Candidate Guide states that the official timer is designed to pause while items load.

---

# 22. Full-Set Assembly Algorithm

```ts
async function generatePatExam(seed: number): Promise<PatExam> {
  const rng = createDeterministicRng(seed);

  const blocks = [
    await apertureGenerator.generateBlock({
      count: 15,
      globalStart: 1,
      rng: rng.fork("APERTURES")
    }),

    await tfeGenerator.generateBlock({
      count: 15,
      globalStart: 16,
      rng: rng.fork("VIEW_RECOGNITION")
    }),

    await angleGenerator.generateBlock({
      count: 15,
      globalStart: 31,
      rng: rng.fork("ANGLE_DISCRIMINATION")
    }),

    await paperFoldingGenerator.generateBlock({
      count: 15,
      globalStart: 46,
      rng: rng.fork("PAPER_FOLDING")
    }),

    await cubeCountingGenerator.generateBlock({
      count: 15,
      globalStart: 61,
      rng: rng.fork("CUBE_COUNTING")
    }),

    await spatialRelationsGenerator.generateBlock({
      count: 15,
      globalStart: 76,
      rng: rng.fork("SPATIAL_RELATIONS")
    })
  ];

  const questions = blocks.flat();

  validateFullPatExam(questions);

  return buildExamRecord(seed, questions);
}
```

---

# 23. Block Validator

Every block must satisfy:

```text
count = 15
global indices correct
category indices 1..15
choice count correct
difficulty distribution within tolerance
answer-letter distribution balanced
no duplicate question fingerprints
no duplicate answer-choice drawings within an item
all question-level validators pass
```

---

# 24. Full Exam Validator

```ts
interface FullExamValidation {
  valid: boolean;

  questionCount: 90;
  timeLimitSeconds: 3600;

  ranges: {
    apertures: [1, 15];
    viewRecognition: [16, 30];
    angleDiscrimination: [31, 45];
    paperFolding: [46, 60];
    cubeCounting: [61, 75];
    spatialRelations: [76, 90];
  };

  errors: string[];
  warnings: string[];
}
```

Hard failures:

```text
wrong total count
wrong category order
wrong question range
wrong answer-choice count
multi-answer item
missing validation report
duplicate question
invalid SVG
incorrect truth data
```

---

# 25. Recommended 90-Question Content Matrix

## 25.1 Apertures 1–15

```text
Q01 stepped cuboids / easy
Q02 wedge compound / easy
Q03 block + notch / medium
Q04 offset stack / medium
Q05 cylinder + block / medium
Q06 sloped transition / hard
Q07 block + recess / medium
Q08 stepped compound / easy
Q09 mixed union/subtract / hard
Q10 polyhedral compound / medium
Q11 hull transition / hard
Q12 cylinder + cutout / medium
Q13 asymmetric wedge / medium
Q14 complex step / easy
Q15 mixed polyhedron / hard
```

## 25.2 View Recognition 16–30

Balance missing views:

```text
5 TOP
5 FRONT
5 END
```

Feature mix:

```text
steps
holes
bosses
slots
sloped faces
offset features
mixed visible/hidden edges
```

## 25.3 Angle Discrimination 31–45

```text
4 easier separation sets
7 medium separation sets
4 close-separation sets
```

Mix:
```text
different rotations
different arm lengths
asymmetric arms
acute
near-right
selected obtuse
```

## 25.4 Paper Folding 46–60

```text
5 two-fold
8 three-fold
2 advanced layer-sensitive
```

Ensure:
```text
vertical
horizontal
diagonal
fold-back
partial-layer
```

appear across the block.

## 25.5 Cube Counting 61–75

Recommended:

```text
5 structures × 3 questions
```

Each structure should support three distinct non-zero painted-face targets.

Example:

```text
Structure A → ask 2, 3, 5 painted
Structure B → ask 1, 3, 4 painted
Structure C → ask 2, 4, 5 painted
Structure D → ask 1, 2, 4 painted
Structure E → ask 1, 3, 5 painted
```

Only use target values with non-zero answers.

## 25.6 Spatial Relations 76–90

```text
4 cube/cuboid nets
3 triangular/trapezoidal prisms
3 wedge/asymmetric prisms
3 marked/shaded orientation questions
2 more complex polyhedral nets
```

---

# 26. Question Generation Budget

Generate candidates at a much higher rate than final acceptance.

Example:

```text
target accepted exam: 90
candidate generation budget: 900–4,500
```

Suggested acceptance philosophy:

```text
generate cheaply
validate aggressively
discard freely
```

Never weaken validators to hit a target count.

---

# 27. Duplicate Detection

Per-category fingerprints:

### Apertures

```text
CSG grammar
normalized dimensions
canonical projection hashes
feature graph
```

### TFE

```text
top/front/end normalized line graph hashes
semantic feature graph
```

### Angle

```text
sorted angle values
orientation signature
arm-length ratios
```

### Paper Folding

```text
fold transform sequence
layer topology
final punch set
```

### Cube Counting

```text
canonicalized voxel occupancy under allowed rotations/reflections
painted-face histogram
```

### Spatial Relations

```text
face adjacency graph
net topology
face marking signature
folded solid graph
```

---

# 28. Cross-Exam Diversity

When producing multiple full exams:

```text
no exact question reuse
no exact seed reuse
limit near-duplicate geometry across neighboring exams
rotate grammar families
rotate distractor families
rotate correct-letter sequence
```

Maintain a global content registry.

---

# 29. Explanation Mode

Scored exam:

```text
no explanations
```

Review mode:

```text
correct answer
structured explanation
geometry overlay
distractor analysis
```

Explanations must derive from generator truth.

Do not infer solution facts from screenshots.

---

# 30. Category-Specific Explanation Requirements

## Apertures

Show:
```text
correct insertion orientation
projected silhouette
critical width/height constraints
why each distractor fails
```

## TFE

Show:
```text
corresponding features across views
solid/hidden edge explanation
missing-view construction
```

## Angle

Show:
```text
true angle values in learning mode
sorted order
closest comparison
```

Do not expose degrees in scored mode.

## Paper Folding

Show:
```text
reverse fold sequence
hole reflection at each step
layer count penetrated
final hole grid
```

## Cube Counting

Show:
```text
per-cube painted count
hidden support cubes
tally table
```

## Spatial Relations

Show:
```text
net face IDs
hinge sequence
folded face adjacency
orientation of markings
why distractors violate topology/orientation
```

---

# 31. Accessibility & Interaction

SVGs should provide:

```text
role="img"
aria-label
semantic title/desc in study mode
```

Do not expose answer truth in accessible labels during scored mode.

Keyboard:
```text
1–5 or A–E select answer
arrow keys optional for navigation
```

Touch targets:
```text
>= 44 CSS px
```

Question artwork should remain usable without hover.

---

# 32. Print Layout

Optional printable mock:

```text
US Letter / A4
black-and-white
vector artwork
```

Do not force computer-screen dimensions into print.

Recommended:
- 1–2 dense visual items per page;
- clear question number;
- answer choices adjacent;
- no answer key on question pages.

---

# 33. QA Checklist — Whole Exam

- [ ] Exactly 90 items
- [ ] Exactly 15 items/category
- [ ] Correct category order
- [ ] 60-minute exam metadata
- [ ] Questions numbered 1–90
- [ ] Apertures use five choices
- [ ] TFE uses four choices
- [ ] Angle uses four choices
- [ ] Paper Folding uses five choices
- [ ] Cube Counting uses five choices
- [ ] Spatial Relations uses four choices
- [ ] Every item has exactly one correct answer
- [ ] Every question has deterministic seed
- [ ] Every question has machine validation report
- [ ] All scored assets are original
- [ ] SVG artwork passes schema validation
- [ ] No answer-dependent style leakage
- [ ] No duplicates or near-duplicates above threshold
- [ ] Difficulty distribution within target
- [ ] Answer letters reasonably balanced
- [ ] Mobile screenshot QA passes
- [ ] Desktop screenshot QA passes
- [ ] Review explanations match truth metadata

---

# 34. QA Checklist — Apertures

- [ ] 3D object readable
- [ ] Five 2D aperture choices
- [ ] Same scale convention
- [ ] Correct silhouette derives from geometry
- [ ] Object may be oriented before insertion
- [ ] Straight-path fit
- [ ] Exactly one aperture fits
- [ ] Distractors differ materially
- [ ] No ambiguous near-fit
- [ ] Hidden geometry obeys grammar assumptions

---

# 35. QA Checklist — View Recognition

- [ ] Parallel projection
- [ ] Top upper-left
- [ ] Front lower-left
- [ ] End lower-right
- [ ] Two views supplied
- [ ] One view missing
- [ ] Four choices
- [ ] Visible edges solid
- [ ] Hidden edges dotted/dashed
- [ ] Correct view matches source solid
- [ ] Missing-view target balanced across block

---

# 36. QA Checklist — Angle Discrimination

- [ ] Four angles
- [ ] Labels 1–4
- [ ] Rank smallest→largest
- [ ] Four answer permutations
- [ ] Unique numeric ordering
- [ ] No ties
- [ ] Arm lengths/orientations varied
- [ ] No styling cues
- [ ] Separation above configured minimum

---

# 37. QA Checklist — Paper Folding

- [ ] Original square frame
- [ ] Multiple consecutive fold frames
- [ ] Current paper uses solid lines
- [ ] prior/original location uses dashed lines
- [ ] final punch visible
- [ ] punch applies through all covered layers
- [ ] folded paper stays within original square
- [ ] five final 4×4 patterns
- [ ] black dots indicate final holes
- [ ] one exact answer

---

# 38. QA Checklist — Cube Counting

- [ ] Equal-size cubes
- [ ] Voxel truth complete
- [ ] Bottom is unpainted
- [ ] Contact faces unpainted
- [ ] Exposed faces painted
- [ ] Hidden support cubes explicit
- [ ] Correct count is non-zero
- [ ] Five numerical choices
- [ ] Structure readable from isometric view
- [ ] Structure reuse metadata preserved where applicable

---

# 39. QA Checklist — Spatial Relations

- [ ] Flat net on left
- [ ] Four folded choices
- [ ] Fold lines valid
- [ ] Each net face maps to one folded face
- [ ] Outside surface preserved
- [ ] Marking orientation preserved
- [ ] Net closes into valid solid
- [ ] One answer matches
- [ ] Distractors represent meaningful adjacency/orientation errors

---

# 40. Recommended Package Ownership

```text
packages/
├── pat-exam/
│   ├── manifest
│   ├── full-set-generator
│   ├── full-set-validator
│   └── timing
│
├── geometry-3d/
│   └── JSCAD adapter
│
├── geometry-2d/
│   └── Flatten.js adapter
│
├── voxel-kernel/
│   └── Cube Counting truth
│
├── net-fold-kernel/
│   └── Spatial Relations face topology
│
├── render-svg/
│   ├── common
│   ├── isometric
│   ├── orthographic
│   ├── angles
│   ├── paper-folding
│   ├── cubes
│   └── pattern-nets
│
├── generators/
│   ├── apertures
│   ├── view-recognition
│   ├── angle-discrimination
│   ├── paper-folding
│   ├── cube-counting
│   └── spatial-relations
│
└── validators/
    ├── per-question
    ├── per-block
    └── full-exam
```

---

# 41. Routes / Screens

Recommended web routes:

```text
/pat/exams
/pat/exam/:examId
/pat/exam/:examId/question/:number
/pat/exam/:examId/review
/pat/exam/:examId/results

/pat/practice/apertures
/pat/practice/view-recognition
/pat/practice/angle-discrimination
/pat/practice/paper-folding
/pat/practice/cube-counting
/pat/practice/spatial-relations

/showcase/pat
/admin/pat/review
```

---

# 42. Exam Runtime State

```ts
interface PatExamSession {
  examId: string;

  startedAt: number;
  durationSeconds: 3600;
  remainingSeconds: number;

  currentQuestion: number;

  responses: Record<number, "A" | "B" | "C" | "D" | "E" | null>;

  marked: Set<number>;

  status:
    | "NOT_STARTED"
    | "ACTIVE"
    | "SUBMITTED"
    | "EXPIRED";
}
```

---

# 43. Scoring

Raw PAT mock score:

```text
correct answers / 90
```

Store:
```text
overall raw
category raw
accuracy %
time/question
time/category
```

Do not invent an “official DAT scaled score” conversion unless a current validated scoring/concordance model is deliberately implemented.

---

# 44. Sample Category Showcase Page Contract

The accompanying sample HTML/PNG uses one **original synthetic miniature** for each category.

Desktop layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ PAT FORMAT SHOWCASE                            90Q · 60 MIN  │
├────────────────────────────┬─────────────────────────────────┤
│ 01 APERTURES               │ 02 VIEW RECOGNITION            │
│ original sample            │ original sample                 │
├────────────────────────────┼─────────────────────────────────┤
│ 03 ANGLE DISCRIMINATION    │ 04 PAPER FOLDING               │
│ original sample            │ original sample                 │
├────────────────────────────┼─────────────────────────────────┤
│ 05 CUBE COUNTING           │ 06 SPATIAL RELATIONS           │
│ original sample            │ original sample                 │
└────────────────────────────┴─────────────────────────────────┘
```

Mobile:
```text
six cards stacked vertically
```

This page is intended for:
- development;
- visual QA;
- presentation;
- documentation.

The real exam shell remains one-item-at-a-time.

---

# 45. IP / Content Originality Requirements

The ADA Candidate Guide describes actual examination questions as confidential copyrighted intellectual property.

Therefore:

```text
DO:
  implement rules
  implement independently generated geometry
  implement independent distractor algorithms
  implement original SVG artwork
  use public instructions for format understanding

DO NOT:
  copy real DAT questions
  trace official figures
  reproduce answer choices from proprietary sources
  scrape question banks into training/generation data
  create “near copies” from memorized test items
```

Prep-provider examples are references for format analysis only.

---

# 46. AI Agent Non-Negotiable Rules

1. Never generate a full exam until all six category generators pass category-level golden tests.
2. Never accept a question solely because it looks plausible.
3. Every answer must be computed from structured truth.
4. Every item must have exactly one correct answer.
5. Preserve official category order in full exams.
6. Preserve category-specific choice counts.
7. Use one-at-a-time delivery in exam mode.
8. Keep answer artwork style-neutral.
9. Use vector assets as canonical.
10. Record seed and component versions.
11. Reject ambiguous geometry.
12. Separate official/source-backed rules from generator design choices.
13. Never reproduce copyrighted source questions.
14. Preserve problematic seeds as regression tests.
15. Full-set generation fails closed: one invalid item invalidates the set until replaced.

---

# 47. Definition of Done — Full 90-Question Mock

A generated exam is releasable when:

```text
90/90 questions accepted
15/15 each category
60-minute metadata
correct global numbering
correct choice counts
90 unique item fingerprints
90 deterministic seeds
90 validation reports
90 correct answers verified from truth
all SVGs render on desktop/mobile
no answer-style leakage
full exam visual regression passes
human QA sample passes
```

---

# 48. Recommended First Full-Exam Integration Test

Seed:

```text
PAT-FULLSET-INTEGRATION-000001
```

Generate:

```text
15 Apertures
15 View Recognition
15 Angle Discrimination
15 Paper Folding
15 Cube Counting
15 Spatial Relations
```

Then assert:

```ts
expect(exam.questions).toHaveLength(90);

expect(exam.questions.slice(0, 15))
  .toAllHaveCategory("APERTURES");

expect(exam.questions.slice(15, 30))
  .toAllHaveCategory("VIEW_RECOGNITION");

expect(exam.questions.slice(30, 45))
  .toAllHaveCategory("ANGLE_DISCRIMINATION");

expect(exam.questions.slice(45, 60))
  .toAllHaveCategory("PAPER_FOLDING");

expect(exam.questions.slice(60, 75))
  .toAllHaveCategory("CUBE_COUNTING");

expect(exam.questions.slice(75, 90))
  .toAllHaveCategory("SPATIAL_RELATIONS");
```

Then run:

```text
geometry validation
answer uniqueness validation
SVG schema validation
visual regression
duplicate detection
full-set answer distribution audit
full-set difficulty audit
```

---

# 49. Research Findings from Supplied Links

The supplied `links.md` contained BohrPrep, Erudition PAT, and Medium references.

## BohrPrep — Keyhole

Source:
`https://bohrprep.com/keyhole/`

Useful findings:
- 15-question Keyhole subsection;
- one 3D object and five aperture options;
- object may be oriented before insertion;
- straight-through passage after insertion begins;
- same-scale object/aperture;
- exact external outline concept;
- shape, size, and feature-position traps are common useful distractor families.

## BohrPrep — Top Front End

Source:
`https://bohrprep.com/top-front-end/`

Useful findings:
- top/front/end orthographic semantics;
- no perspective;
- solid visible lines;
- dotted/dashed hidden lines;
- top upper-left, front lower-left, end lower-right;
- line/feature correspondence drives distractor design.

## BohrPrep — Pattern Folding

Source:
`https://bohrprep.com/pattern-folding/`

Useful findings:
- flat net → one of four 3D objects;
- face shape, adjacency, and shading/orientation are major discriminators;
- supports semantic distractors based on face relationships rather than random 3D alternatives.

## BohrPrep — Hole Punching

Source:
`https://bohrprep.com/hole-punching/`

Useful findings:
- square paper;
- consecutive folds;
- solid vs broken line convention;
- grid-based reasoning;
- reverse reflection is a core solution operation.

## BohrPrep — Cube Counting

Source:
`https://bohrprep.com/cube-counting/`

Useful findings:
- equal cubes;
- painted exposed faces;
- bottom not painted;
- hidden supporting cubes;
- tally-table interpretation reinforces a per-cube truth model.

## BohrPrep — Angle Ranking

Source:
`https://bohrprep.com/angle-ranking/`

Useful findings:
- four angles;
- smallest→largest ranking;
- different rotations and arm lengths can increase perceptual difficulty;
- distractors should focus on close comparisons rather than random permutations.

## Erudition — PAT Test Structure

Source:
`https://eruditionprep.com/dat/pat/test-structure`

Useful findings:
- 90 questions;
- 60 minutes;
- six 15-question groups;
- stable order:
  1. Keyhole
  2. TFE
  3. Angle Ranking
  4. Hole Punching
  5. Cube Counting
  6. Pattern Folding

The page contains an apparent final-range typo `75–90`; its dedicated Pattern Folding page states `76–90`.

## Erudition — Keyhole

Source:
`https://eruditionprep.com/dat/pat/resources/keyhole-problems`

Useful findings:
- five keyhole rules align with current official instructions;
- correct aperture may appear rotated;
- principal projections are useful for distractor design;
- wrong proportions and misshapen outlines are common traps.

## Erudition — TFE

Source:
`https://eruditionprep.com/dat/pat/resources/top-front-end-problems`

Useful findings:
- canonical positions of TOP/FRONT/END;
- visible solid / hidden dotted line convention;
- holes and protrusions provide strong semantic TFE features;
- distractors can invert feature position or visibility interpretation.

## Erudition — Angle Ranking

Source:
`https://eruditionprep.com/dat/pat/resources/angle-ranking-problems`

Useful findings:
- items 31–45;
- four numbered angles;
- smallest→largest;
- arm length and orientation should not alter the true measure;
- prep guidance states angle differences can be very small.

## Erudition — Hole Punching

Source:
`https://eruditionprep.com/dat/pat/resources/hole-punching-problems`

Useful findings:
- items 46–60;
- horizontal, vertical, and diagonal folds;
- fold-back and layer-sensitive cases exist;
- punch penetrates all layers at its position;
- final hole count depends on layer coverage.

## Erudition — Cube Counting

Source:
`https://eruditionprep.com/dat/pat/resources/cube-counting-problems`

Useful findings:
- items 61–75;
- painted/exposed equivalence;
- bottom unpainted;
- hidden support cubes;
- zero is excluded as a correct response under the published rules;
- prep text discusses understanding a structure before “associated problems,” supporting configurable structure reuse.

## Erudition — Pattern Folding

Source:
`https://eruditionprep.com/dat/pat/resources/pattern-folding-problems`

Useful findings:
- items 76–90;
- one flat pattern + four 3D choices;
- each section of the net maps to a face;
- shading/symbol orientation can be part of the task;
- topology and face-marking orientation are strong distractor axes.

## Erudition — Question of the Week

Source:
`https://eruditionprep.com/dat/pat/question-of-the-week`

Useful findings:
- confirms contemporary use of multiple PAT categories in ongoing practice material;
- example category names align with the six-section taxonomy;
- useful as evidence of current terminology, not as a source for copying items.

## Medium tag archive

Source:
`https://medium.com/tag/perceptual-ability/archive`

Research status:
- the page could not be fetched by the browsing tool during this research session;
- web search did not return a usable indexed copy;
- no factual requirement in this specification depends on that source.

---

# 50. Primary Official Sources Added During Verification

## ADA — 2026 Candidate Guide

`https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/education/dat_candidate_guide.pdf`

Used for:
- 90 PAT items;
- six official PAT topics;
- 60-minute PAT timing;
- computer delivery one item at a time;
- current 2026 status;
- confidentiality/IP boundary.

## ADA — Perceptual Ability Test Section Instructions

`https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/education/perceptual_ability_test_section_instructions.pdf`

Used for:
- Aperture rules and five-choice layout;
- TFE position/projection/hidden-line rules and four choices;
- Angle Discrimination four-angle/four-choice format;
- Paper Folding line/punch conventions and five choices;
- Cube Counting painted-face rules and five choices;
- Spatial Relations flat-pattern/four-choice format.

---

# 51. Final Implementation Directive

Treat this document as the **format/layout contract** for the PAT exam generator.

The canonical production architecture is:

```text
                     FULL PAT EXAM GENERATOR
                              │
                 90 questions / 60 minutes
                              │
        ┌──────────────┬──────┼──────┬──────────────┐
        │              │      │      │              │
        ▼              ▼      ▼      ▼              ▼
     JSCAD 3D       2D SVG  Flatten  Voxel       Net Fold
        │              │      │      │              │
   Apertures        Angles  Paper   Cube         Spatial
   TFE                      Folding Counting     Relations
        │              │      │      │              │
        └──────────────┴──────┼──────┴──────────────┘
                              ▼
                     COMMON SVG CONTRACT
                              │
                              ▼
                    QUESTION VALIDATORS
                              │
                              ▼
                       BLOCK VALIDATORS
                              │
                              ▼
                    FULL-EXAM VALIDATOR
                              │
                              ▼
                  90-ITEM RELEASED MOCK
```

The generator must prioritize:

```text
geometric truth
unique answers
visual readability
format fidelity
deterministic reproducibility
original content
```

over raw generation volume.
