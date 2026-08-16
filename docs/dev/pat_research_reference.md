# DAT Perceptual Ability Test (PAT) — Research Reference
### Format, Structure, Current Trends & Generation-Ready Specs
*Compiled August 2026 · Sources: official ADA/CDA documents + 25+ test-prep providers*

---

## 1. Quick Reference

| | |
|---|---|
| **What it is** | The only non-verbal section of the Dental Admission Test (DAT) — pure visuospatial reasoning, no science or reading content |
| **Administered by** | American Dental Association (ADA), Dept. of Testing Services, via Prometric test centers |
| **Structure** | 90 scored items · 60 minutes · 6 subtypes × 15 questions each · fixed order · no break between subtypes |
| **Scoring** | **200–600 scale** (10-pt increments) — changed from the old 1–30 scale on **March 1, 2025**. Content/format did NOT change, only the scale and psychometric model. |
| **National average** | ≈400 (50th percentile); PAT average trends slightly *below* the overall DAT mean |
| **Canadian equivalent** | The Canadian DAT (CDA) uses a **structurally identical PAT** — 90 items, 60 min, same 6 subtypes. One generator can serve both markets. |
| **Contribution to Academic Average** | None — PAT is reported as its own standalone score, separate from the AA |

**⚠️ Most important thing to bake into any AI-generated content:** if your explanations reference score benchmarks, use the 200–600 scale (not 1–30). Nearly every prep site still has legacy pages mixing both scales — this is the single most common currency-of-information error in this space right now.

---

## 2. Official Test Structure

Confirmed directly from the ADA's own site and its published **"Perceptual Ability Test Section" instructions PDF**:

- Full DAT = 4 sections, 280 items total, 5 hrs 15 min total administration:
  - Survey of the Natural Sciences — 100 items
  - **Perceptual Ability — 90 items**
  - Reading Comprehension — 50 items
  - Quantitative Reasoning — 40 items
- PAT is always the **2nd section**, immediately after the Natural Sciences and before Reading Comprehension.
- PAT is fully computer-based; candidates get a physical whiteboard/marker for scratch work (no personal items permitted).
- The DAT (all sections, including PAT) contains **unscored "pretest"/experimental items** mixed in indistinguishably from scored items — used by ADA to trial future questions. Test-takers cannot tell which items are experimental, so every question must be treated as if it counts.
- Some Canadian dental schools accept the U.S. DAT from non-resident applicants; most U.S. schools also accept Canadian DAT scores.

---

## 3. The Six PAT Subtypes

Each subtype gets 15 questions, delivered as a fixed, uninterrupted block (Apertures first, Spatial Relations last). Official ADA terminology is listed first; the nickname used across nearly all prep sites follows in parentheses — **your generator's data schema should probably store both**, since users will search/recognize the nicknames far more than the official terms.

### 3.1 Apertures ("Keyholes")
**Answer choices: 5**

- A 3D solid is shown; the task is to identify which of 5 flat aperture (opening) outlines it could pass straight through.
- **Official rules:**
  1. The object may be rotated to *any* orientation before entering — including starting on a side not shown.
  2. Once it starts passing through, it cannot rotate/twist further and must pass completely through.
  3. The aperture is always the exact external outline (silhouette) of the object from that orientation — object and apertures are drawn to the same scale, so a correctly-*shaped* opening can still be the wrong *size*.
  4. Hidden portions of the object have no surprise irregularities; symmetric indentations are mirrored on the unseen side.
  5. Exactly one correct aperture per item.
- **Practical rule of thumb (from every prep source):** the correct answer is almost always one of the object's 3 primary orthogonal projections (top-down, front, side) — occasionally its mirror/inverse.
- **Distractor patterns:** wrong proportions in one dimension, an extra or missing protrusion, correct silhouette but rotated incorrectly.

### 3.2 View Recognition ("Top-Front-End" / "TFE" / Orthographic Projections)
**Answer choices: 4** (confirmed in official instructions)

- Objects are shown via orthographic (no-perspective) projections in **fixed screen positions**: Top view = upper-left, Front view = lower-left, End/right-side view = lower-right.
- Two of the three views are given; you pick the correct third from 4 options. (It is *not* always the End view that's missing — Top or Front can be the missing one too.)
- **Solid lines = visible edges from that view; dashed/dotted lines = hidden edges** behind the surface. This solid/dashed convention is the entire mechanism of the subtype.
- **Distractor patterns:** a dashed line flipped to solid (or vice versa) on one edge, a feature (hole/protrusion) present in the wrong view, mirrored geometry.
- Generally rated the most conceptually difficult subtype by test-takers — "clicks" only after sustained practice per repeated SDN/community feedback.

### 3.3 Angle Discrimination ("Angle Ranking")
**Answer choices: 4**

- Four labeled angles; rank smallest → largest.
- **Distractor mechanism:** ray/arm length and rotation are randomized specifically to bias perception — longer arms make angles *look* bigger than they are. Only the vertex opening matters.
- Real-test gaps between adjacent angles are commonly reported (anecdotally, on forums) as ~3–5°, somewhat more generous than some third-party generators that use 2° gaps.
- Fastest subtype — no 3D mental rotation required. Prep guidance consistently recommends spending the least time-per-question here to bank time for Apertures/View Recognition/Spatial Relations.
- One 2026 admissions-consulting source claims this subtype has felt subjectively harder on the newer digital interface (attributed to screen rendering/anti-aliasing at small angle differences) — this is a single-source anecdote, not independently corroborated, but worth flagging if you're tuning line-rendering fidelity.

### 3.4 Paper Folding ("Hole Punching")
**Answer choices: 5**

- A flat square starts unfolded; **dashed lines = original/reference position, solid lines = current folded position**. The paper folds (never rotates/twists) some number of times — officially described as "**one to three folds**" in ADA's own published sample materials, though some current prep generators extend to 3–4. After the last fold, one or more holes are punched; you determine the unfolded pattern.
- Answer grid is always a **4×4 grid = 16 fixed possible hole positions** (filled circle = hole, open circle = none). No "half-holes" or off-grid positions ever appear.
- **Governing principle:** holes reflect across each fold's line of symmetry as the paper is virtually unfolded; a punch through multiple layers produces multiple holes, and mirrors compound across each successive fold that's undone.
- Diagonal folds are always at exactly 45°, evenly bisecting grid squares — no other diagonal angle is used.

### 3.5 Cube Counting
**Answer choices: 5** · **⚠️ Structurally different from the other 5 subtypes**

- A structure of cemented, identical cubes is shown, imagined painted on every exposed face **except the bottom** (resting surface). Adjacent/stacked touching faces are not "exposed" and are not painted.
- The only permitted hidden cubes are ones structurally necessary to support a visible cube above/beside them (never gratuitous).
- Questions ask "how many cubes have exactly *N* sides painted" for N = 1–5. **Officially, 0 is never the correct answer to a question**, even though the underlying geometry could theoretically produce a fully-enclosed 0-painted cube.
- **Key structural nuance for a generator:** unlike the other five subtypes (one figure = one question), Cube Counting uses **one shared figure per ~3 questions** — so the 15 questions are drawn from roughly 5 distinct cube structures, not 15 independent ones. Your data model needs a one-to-many figure→questions relationship here specifically.
- Standard human solving strategy is a tally table (counts for 1–5 sides, cross-checked against total cube count) — useful as a template for auto-generating explanations.

### 3.6 Spatial Relations ("Pattern Folding" / "3D Form Development")
**Answer choices: 4**

- A flat 2D net (unfolded pattern) is shown; you determine which of 4 3D solids it folds into. Some items are plain geometry only; others add shading/patterns to faces that must land in the correct position *and* orientation after folding.
- **Rule:** shapes on the 2D net cannot change size/shape when folded — only their spatial arrangement changes.
- **Distractor patterns (very consistent across sources):** (a) right overall shape, wrong shading/pattern placement; (b) right shading, but the underlying solid shape is subtly wrong (extra/missing face, wrong proportions); (c) a **mirror-image (chirality) error** — folding the net "the other way" produces a left-right-flipped solid that looks plausible at a glance. This third pattern is explicitly called out across multiple sources as the trickiest distractor type to construct and to catch — worth deliberately including in an AI-generated bank rather than only doing shading swaps.
- Rated among the two hardest subtypes alongside View Recognition.

---

## 4. 3D Shape Vocabulary & Projection Conventions

Four of the six subtypes — Apertures, View Recognition, Cube Counting, Spatial Relations — revolve around a 3D solid. They don't share one drawing convention, though; each uses the projection style suited to what it's actually testing. Getting this right matters more than almost anything else for visual fidelity.

### 4.1 What the objects are actually made of

Across every source surveyed, DAT solids are deliberately simple — nothing like a real CAD/engineering part. The consistent underlying model is **one base primitive, modified by 1–3 additive or subtractive features**:

- **Base primitives:** rectangular blocks/prisms (by far the most common), triangular prisms/wedges, and cylinders. The "crush it like a soda can" explanation shows up independently across multiple prep sources specifically to teach how a cylinder's silhouette differs from a block's — meaning **curved primitives are part of the real vocabulary**, not just polygonal ones. Nothing in the research surfaced cones or spheres; treat those as unconfirmed rather than assuming they're absent.
- **Additive features:** a smaller block or wedge protruding from a face (Varsity Tutors' worked example describes a "mostly-rectangular prism" with a triangular piece jutting up).
- **Subtractive features:** notches, cut/chamfered corners, and through-holes (the View Recognition instructions explicitly use a block-with-a-hole as the teaching example for how dashed lines work).
- **Symmetry constraint:** per the official Apertures rules, any hidden portion with a visible symmetric indentation is guaranteed to mirror what's shown — the test never hides an "irregular surprise" on the back side. That's a genuinely useful constraint for a generator: it means non-visible geometry can be safely auto-completed by mirroring rather than requiring separate authoring.

Practically, this maps very cleanly onto **simple CSG (constructive solid geometry)**: `base_primitive ∪ additive_feature(s) − subtractive_feature(s)`, capped at a small feature count so the object stays solvable in ~40 seconds.

### 4.2 Projection style — this differs by subtype, and it's not just an aesthetic choice

| Subtype | What's shown | Projection | Why |
|---|---|---|---|
| Apertures | The solid, from one vantage point | **Pictorial (oblique/isometric-style)** — a single image implying all three dimensions at once | The official instructions explicitly say you must "imagine how the three-dimensional object appears from all directions (rather than from a single direction **as shown**)" — confirming only one pictorial image is given, and the whole task is inferring the other silhouettes from it |
| View Recognition | The solid, from 3 angles | **True orthographic** — no perspective, parallel lines of vision, explicitly stated in ADA's own text | The entire subtype IS the orthographic-projection skill; showing it any other way would defeat the point |
| Cube Counting | A stack of unit cubes | **Pictorial, all-faces-visible** (isometric is the standard engineering convention for exactly this "see 3 faces of every cube at once" requirement) | You must simultaneously judge exposure on top, front, and side faces of many cubes — isometric is the standard technical-drawing solution to that need, though ADA's materials don't name the projection explicitly |
| Spatial Relations | A flat net *and* folded solids | Net = **true flat 2D layout** (no projection — it's already flat); folded answer choices = **pictorial**, same reasoning as Cube Counting | You need to compare a flat pattern against 3D outcomes, so each half of the question uses the representation that's actually flat/solid |

**Isometric vs. oblique, briefly, since it matters for your renderer:** isometric projects all three axes at equal angles (typically drawn as one axis vertical, the other two at ±30° from horizontal) with **no foreshortening distortion** between axes — every edge along a principal direction scales consistently, which is exactly why it's the standard choice whenever a viewer needs to compare or count features across faces (like Cube Counting). Oblique/cavalier projection instead draws one face true-to-scale and flat-on, with receding edges shot off at an angle (commonly 45°) — simpler to construct but visually distorts depth, and is more typical for "hero shot, one face matters most" illustrations. Given DAT's core demand is comparative judgment across faces (counting exposed sides, matching silhouettes, matching orthographic edges), **isometric-style pictorial rendering is the safer default** wherever a pictorial (non-orthographic) view is called for.

### 4.3 SVG implementation notes

- Isometric rendering doesn't require true 3D math — it's a fixed 2D affine transform. Project each 3D vertex `(x,y,z)` to 2D via `screenX = (x − z) · cos(30°)`, `screenY = (x + z) · sin(30°) − y`, and every cube face becomes a parallelogram (a unit cube renders as exactly 3 rhombi: top, left, right faces). This is the same technique behind most "isometric pixel art" tooling and is trivial in SVG `<polygon>` elements.
- For compound CSG objects beyond simple cube grids (Apertures, View Recognition, Spatial Relations solids), you need one more step beyond the projection itself: **face sorting / hidden-face culling** — draw faces back-to-front (painter's algorithm) using a simple depth key from the projection, since isometric projection alone doesn't resolve overlap.
- View Recognition's hidden-line logic is the one case that needs genuine visibility computation, not just face painting: for each edge of the solid, you need to determine whether *any* face of the solid occludes it from that specific orthographic viewing direction, then render it dashed if so, solid if not. This is a small, well-defined visibility problem (essentially 2D edge-vs-polygon occlusion per view direction) rather than a full 3D renderer — very tractable, just needs to be built once and reused for all three views.

---

## 5. Apertures — Silhouette-Matching Algorithm Deep-Dive

### 5.1 Layout & the "3 + 3" silhouette rule

One pictorial object on one side, five lettered aperture outlines (A–E) on the other. Two independent sources converge on the same rule of thumb: the correct aperture is always one of **three primary silhouettes — front-back, top-bottom, side-side** — or one of their three **inversions** (back-front, bottom-top, reverse side-side), since the object can enter from either direction. For an asymmetric object these six are all visually distinct; symmetric objects collapse some of them together. Concretely: a cylinder pushed along its own axis needs a circular aperture; the same cylinder pushed perpendicular to its axis needs a rectangular one — the object doesn't change, only which of the 3 (or 6) silhouettes you're computing does.

### 5.2 What actually gets drawn

A subtlety worth building into a renderer deliberately: apertures show **only the outer boundary of the silhouette** — no internal lines, no overlapping edges from the object's internal features are drawn into the opening shape. It's a pure outline, not a line drawing. Object and apertures are drawn to identical scale, so a shape-correct-but-wrong-sized aperture is an explicitly sanctioned (official) distractor type, not just a shape mismatch.

### 5.3 Distractor taxonomy

1. Correct outline shape, one dimension scaled wrong (too wide/narrow/tall)
2. Correct outline, a protrusion added or removed
3. A real silhouette of the object — but from a viewing axis that isn't one of the 6 valid ones
4. A **mirror-image opening** — a left-right or top-bottom flip of the true silhouette, which looks right at a glance but fails once the object has any asymmetric feature (explicitly called out as a deliberate distractor pattern)

### 5.4 Generation algorithm (prose)

1. Build the 3D solid using the CSG model from Section 4.1.
2. Compute its silhouette — the 2D outer-boundary polygon only, discarding internal edges — under each of the 3 primary orthogonal projection directions (and their inverses, if the object is asymmetric enough for these to differ).
3. The correct answer is one computed silhouette, rendered to exact scale.
4. Generate each distractor by perturbing **one parameter** of that same silhouette (a scale factor on one axis, a resized/added/removed protrusion, or a reflection) — real distractors are near-misses, not wildly different shapes, so limiting each distractor to a single perturbation keeps difficulty realistic.
5. **Built-in validation:** because the correct silhouette is computed straight from the solid's geometry, you can programmatically confirm no distractor accidentally matches it. This also flags a design trap: highly symmetric base primitives (a perfect cube, a perfect sphere) produce identical silhouettes from multiple directions, which collapses your answer-choice diversity — deliberately asymmetric base objects make better generator seeds.

---

## 6. View Recognition — Hidden-Line Algorithm Deep-Dive

This is the one subtype that requires genuine 3D visibility computation rather than just projection — worth the most engineering attention of the four "3D shape" subtypes.

### 6.1 Fixed layout & view directions

Positions are fixed and always labeled the same way: **Top view = upper-left, Front view = lower-left, End view = lower-right.** The three view directions are precisely defined: Top = looking straight down; Front = looking from the front toward the back; End = looking from the **right side** toward the left. Two of the three are given; the fourth answer-choice panel supplies the missing one.

### 6.2 The line rules — three, not just one

- **Basic rule:** solid = visible edge from that view; dashed = an edge that exists on the object but is occluded from that specific direction.
- **Priority rule (confirmed by two independent sources):** if a hidden edge's projected position exactly coincides with a visible edge's projected position, **solid always wins** — the object never shows a dashed line "underneath" a solid one at the same screen position.
- **Deduplication rule:** multiple distinct hidden features that happen to project onto the same line (three identical, aligned holes, for instance) collapse into a **single** dashed line, not three overlapping ones.

### 6.3 The real auto-QA invariant — and a correction to make here

One human solving technique doesn't hold up on the current exam, and it's worth flagging explicitly since it would produce a *weaker-than-necessary* validator: a simple **line-count** tally (front verticals = top verticals, etc.) is described directly by prep sources as **now defeated** — current question designers deliberately balance line counts across all 4 answer choices specifically to block this shortcut, so count-matching alone no longer reliably discriminates correct from incorrect on real items.

What *is* still geometrically airtight — confirmed in more precise form directly from a practice provider's own rule text — is full **positional correspondence, not mere counting**: components of the Top and Front views must share the same **width** and left-right positioning; components of the Top and End views must share the same **depth**; components of the Front and End views must share the same **height**. This is a strict consequence of orthographic projection (it's the standard "glass-box" alignment principle from engineering drawing), so it holds by construction for any correctly-computed view triple — but unlike line-counting, it checks *where* features fall, not just *how many* lines exist. **Use width/depth/height positional alignment as your validator, not line-counting** — and, since real current items are deliberately built to defeat the count-only version, deliberately construct some distractors that match the correct line count but fail positional alignment, to match authentic current difficulty.

### 6.4 Generation algorithm (prose)

1. Build the 3D solid (Section 4.1's CSG model).
2. For each of the 3 canonical directions, orthogonally project every edge of the solid onto that view plane.
3. For each projected edge, determine visibility with a small ray test: sample point(s) along the edge, cast back along the view direction, and check whether any other face of the solid intersects that ray closer to the viewer. Occluded → dashed; unoccluded → solid. This is a bounded, per-(edge, direction) visibility test — not a full renderer.
4. Apply the solid-wins-over-dashed priority rule wherever a hidden and visible edge coincide, and deduplicate overlapping projected edges.
5. Two of the three computed views become the prompt; the third is the correct answer.
6. Distractors: flip one line's solid/dashed state (the "single wrong line eliminates a choice" pattern called out repeatedly), mirror the view left-right, or nudge one feature's position.
7. Run the Section 6.3 line-count invariant against every generated item before accepting it.

---

## 7. Angle Discrimination — Generation & Distractor Deep-Dive

The simplest of the six to generate — pure 2D, no solid geometry, and fully closed-form.

### 7.1 What's actually being manipulated

Four labeled angles, laid out at independent positions/rotations on the page. The **entire distractor mechanism** is that ray length and the angle's overall rotation are randomized independently of its true measure — only the vertex opening is real signal; everything else is deliberately misleading.

### 7.2 Calibrating difficulty against the real exam

Community reporting (SDN) is fairly consistent: real-test gaps between adjacent-ranked angles run **roughly 3–5°**, with some popular third-party generators (Bootcamp's, by test-takers' account) skewing tighter (2°, felt as harder-than-real) — useful ground truth if you want your default difficulty tier to feel authentic rather than artificially brutal. Some generators (Master Student's, for one) add an alternate difficulty knob at the *task* level rather than the geometry level — dropping the 4 multiple-choice options entirely and forcing free-response ranking.

### 7.3 Generation algorithm (prose)

1. Choose 4 target angle measures with a controlled minimum pairwise gap — this gap is your primary difficulty knob (≈3–5° for realistic, 2° for hard-mode, 8–10°+ for an easy/intro tier).
2. Independently randomize each angle's ray length (symmetric or asymmetric between its two rays, for extra difficulty) and its 2D rotation on the page.
3. The correct rank order is computed directly from the true measures — zero ambiguity, fully auto-gradable.
4. Build distractors as **adjacent-swap permutations** of the true order (swap ranks 2↔3, say) rather than fully scrambled orderings — real near-misses come from mis-ranking one close pair, not the whole set, so this keeps distractors plausible rather than trivially eliminable.
5. No visibility computation, no CSG, no rendering ambiguity — this is the one subtype you can fully verify and grade with total confidence on day one.

---

## 8. Paper Folding — Diagram Sequence & Algorithm Deep-Dive

This subtype deserves the extra depth because it's arguably the most *cleanly* algorithmic of all six — folding is just a sequence of geometric reflections, with no rendering ambiguity or visibility computation involved.

### 5.1 The exact panel sequence

Cross-referencing ADA's own worked example against multiple prep breakdowns, the question is built as a strip of labeled panels, **one panel per fold plus a starting panel and a punch panel**:

- **Panel 1 ("Figure A"):** the original flat square, undashed edges, shown at full size — this is always a square in every source surveyed (no rectangle variants turned up).
- **Panel 2 ("Figure B"):** the shape after fold 1. Solid lines = the paper's current (folded) edges; dashed lines = where the original square's edges used to be, kept as a spatial reference.
- **Panels 3…N:** one additional panel per subsequent fold, same solid/dashed convention, each one folding down from the previous panel's shape.
- **Final panel:** identical shape to the last fold panel, with the hole punch location marked (typically as a small circle/dot) — ADA's own example treats this as its own distinct panel rather than merging it into the last fold panel, so a 1-fold item shows **3 panels total** (original, fold-1, fold-1-with-punch); a 2-fold item would show 4; a 3-fold item, 5.
- **The answer choices are separate from all of this** — they show the fully unfolded square as a 4×4 grid of dots, filled where a hole ends up.

### 5.2 The complete, closed set of valid fold types

This is fully enumerable — sources are consistent that these are the *only* folds that appear, which is exactly the kind of closed rule set you want for a generator:

1. **Grid-line fold** — horizontal or vertical, exactly along one of the internal grid lines.
2. **Half-fold** — horizontal or vertical, exactly halfway *between* two grid lines (offset by half a cell from the grid-line fold).
3. **Diagonal fold** — always exactly 45°, always running corner-to-corner *within* a single grid square (never an arbitrary diagonal, never spanning multiple squares unevenly).

**Explicitly excluded**, per direct comparison examples in the source material: any fold whose resulting edge would extend beyond the original square's boundary, and any diagonal that doesn't cleanly bisect a grid square. Both are described as impossible/won't-appear cases specifically so solvers don't waste time considering them — worth encoding as hard constraints in a generator rather than just a soft preference, so you never accidentally produce an invalid item.

### 5.4 A refinement worth making here: folds aren't always whole-stack

Direct inspection of worked examples surfaces a real complication for the model above: a fold isn't always "reflect the entire current shape." Two distinct behaviors appear — **(a) a normal fold**, where the entire current paper (all accumulated layers in that region) folds over as one unit, and **(b) a "fold back on itself,"** where only the topmost layer (or a subset of the stack) refolds while the layers underneath stay put. A pure "compose N reflections on a flat preimage set" model — which is the right *starting* mental model and still correct for simple sequences — under-counts or mis-locates holes once a sequence includes a self-fold. **A robust implementation needs a genuine per-cell layer stack** (not just a flat original→final position map): track, for each grid cell, the ordered stack of original-paper layers currently sitting there, and apply each fold as an operation that reflects only the specific layers it actually moves, leaving the rest of that cell's stack untouched. The "number of holes = number of layers at the punch position" principle still holds — it just needs the real stack, not an assumed uniform one.

**Two more concrete conventions worth matching exactly:**
- **Circle fill convention:** the punch mark in the *question's* final folded-state panel is drawn as a **white/open circle**; the resulting holes in the *answer choices'* unfolded grid are drawn as **black/filled circles**. Don't use the same fill style for both — it's a deliberate visual distinction in every real example inspected.
- **Edge/half-punch case:** a punch centered exactly *on* a fold line renders as a **half-circle** in the folded diagram (since half the circle falls outside the current paper boundary and simply isn't there yet). This unfolds to **exactly one full circle**, not a mirrored pair — worth an explicit special case in the punch-placement logic rather than treating every punch as a generic interior point.

### 5.5 The unfolding algorithm

The clean way to think about this generatively (not as code, just the model): a fold is a **reflection** of part of the grid across a line (the grid-line, half-fold, or diagonal line described above). Folding the paper N times is a composition of N reflections, which — read in reverse, from the final punched position back to the original square — tells you exactly which original grid cells map onto the punched location.

- **Forward direction (building the question):** start with your 4×4 coordinate grid, apply each fold as a reflection that maps the "folded-away" half of the current shape onto the "kept" half, and track the resulting many-to-one mapping from *original* cell coordinates to *final folded* position. Picking a punch at one final position automatically determines every original cell in that position's full preimage under the composed fold sequence — that preimage *is* the correct answer.
- **Reverse direction (the strategy every prep site teaches humans):** start at the punch, and walk the fold list backward, reflecting the punch point across each fold's line in turn, adding a new point at each un-fold whenever that fold's line had something on both sides.
- **Layer principle:** the number of resulting holes equals the number of paper layers stacked at the punch location, which is just the size of that preimage set — a punch through 4 layers always yields exactly 4 holes on the unfolded grid (occasionally fewer than 4 *distinct dots* if two mapped positions coincide, which is itself a legitimate and testable edge case).
- **Multiple simultaneous punches** simply run the same preimage computation independently per punch hole and union the results.

Because every step here is a closed-form 2D reflection over a fixed 4×4 coordinate space, this subtype is fully self-verifying: the same computation that places the punch also generates the guaranteed-correct answer choice and the four (or more) distractors (e.g., by reflecting across the *wrong* fold order, dropping one reflection, or reflecting across a nearby-but-incorrect line) — with zero risk of an ambiguous or unsolvable item slipping through, unlike the subtypes that depend on visual judgment calls.

---

## 9. Cube Counting — Voxel Algorithm Deep-Dive

### 9.1 Structural reminder

One shared figure drives **2–4 questions**, not one figure per question like the other five subtypes — so 15 questions come from roughly 4–7 distinct structures, not 15. Any data model for this subtype needs a one-to-many figure→questions relationship.

### 9.2 A 2020 rule change worth knowing about

Multiple sources flag that **"floating" cubes — a cube attached to the structure by only one side face, with nothing directly beneath it — were not part of DAT cube counting before 2020.** They're standard/fair game now. If you're calibrating a generator against older sample sets (including ADA's own widely-referenced 2007 sample items), be aware those predate this change and may under-represent current structural complexity.

### 9.3 The rules, precisely

- The bottom face of any cube — whether it rests on the ground or on another cube — is **never** painted, unconditionally.
- Any of the remaining 5 faces touching an adjacent cube is not painted; every other face is.
- Maximum exposed faces = 5 (a cube always touches at least the ground or one neighbor, by definition of belonging to a glued structure); **0 is never the correct answer to a question**, even though a fully-enclosed cube could theoretically exist with 0 exposed faces.
- A hidden cube may only exist where it's **structurally necessary** — specifically, where a visible cube would otherwise be attached to the rest of the grounded structure by only an edge or a corner rather than a full face. No gratuitous hidden cubes.

**Worked example (from a published practice set):** a 4-cube figure — 3 visible, 1 hidden support cube. The hidden cube has 2 painted faces; the top visible cube has 5; the remaining two visible cubes have 4 each. Useful as a sanity-check target for a generator's output.

### 9.4 Generation algorithm (prose)

1. Represent the figure as occupied unit-cube positions on an integer 3D grid `(x, y, z)`, with `z = 0` as the ground layer.
2. Place your intended *visible* cubes first, then run a **face-adjacency connectivity check** (a graph/flood-fill using only shared-face neighbors, not edge or corner touches) from the ground up. Anywhere a visible cube fails that check, add the minimal hidden cube(s) needed to restore full face-connectivity — this is exactly how "necessary hidden cubes" get placed algorithmically, not by hand.
3. For every occupied cell, compute `exposed_faces = count of the 5 non-bottom directions (up, north, south, east, west) with no occupied neighbor`. The bottom direction is excluded from this count unconditionally.
4. Generate 2–4 questions per figure, each asking "how many cubes have exactly *N* exposed faces" for a chosen `N ∈ {1,2,3,4,5}` — directly countable from step 3, exact and auto-gradable.
5. **Auto-validation:** the counts for N=1 through 5 (plus any structurally-present-but-never-asked-about 0-count cubes) must sum to the total cube count. This is the same tally-table check every prep site teaches humans, repurposed as your generator's built-in correctness test.

**Difficulty knobs:** total cube count, how many necessary-hidden cubes are required (deeper burial = harder), whether floating cubes are included, and overall structural irregularity/asymmetry.

---

## 10. Spatial Relations — Net-Folding Algorithm Deep-Dive

The hardest of the six to make fully algorithmic — and the one place a chirality/mirror-image error is a *feature*, not a bug, once you understand the mechanic.

### 10.1 Shape vocabulary confirmed in real items

Beyond basic cubes and rectangular prisms: dice-style cubes with **numbered faces** (drawn directly from ADA's own historical sample materials), and compound solids like a **trapezoidal ("dove") prism** — two trapezoid end-faces connected by rectangular sides — confirmed via a real worked example from a PAT-prep provider. Three recurring question archetypes: (1) plain net → plain solid, shape-matching only; (2) net with shading/pattern on specific faces → solid where that pattern must land on the correct face *and* orientation; (3) the numbered-die variant, where face *values* (not just shading) must land correctly.

### 10.2 The canonical fold direction — this is the whole game

One precise, load-bearing detail: **the flat pattern is folded "into the screen"** (away from the viewer) to form the answer choices. Fold it "out of the screen" instead and you get a **mirror image** of the correct solid. This single directional convention is *why* the classic chirality distractor works, and it's worth encoding as an explicit, deliberate rule in a generator rather than an incidental rendering choice.

### 10.3 Distractor taxonomy

1. **Chirality/mirror-image flip** — same net, same shading assignment, folded the *wrong* direction. Explicitly confirmed as a real distractor pattern (a CrackDAT example calls out a trapezoid that "is essentially a mirror image" of the correct one). Mathematically clean: a chirality-flipped solid is by definition not reachable from the true answer by any rotation, so this distractor can never accidentally be correct.
2. **Right solid, wrong shading placement** — the correct 3D shape, but the pattern lands on the wrong face or in the wrong rotational position on the right face.
3. **Wrong solid entirely** — a plausible-looking net that doesn't actually fold into the target shape (an extra/missing face, or a face with subtly wrong proportions).

**A free sanity check (universally true, not just a DAT convention):** the number of separate pieces in a 2D net always equals the number of faces on the resulting solid, since each net piece becomes exactly one face when folded. A net with 4 pieces can never fold into a 6-faced solid — a trivial but genuinely useful auto-QA filter for eliminating malformed generated items before they're ever shown to a user.

### 10.4 Generation algorithm (prose)

1. Choose a target polyhedron — cube, rectangular prism, triangular prism, or a compound solid like the trapezoidal prism above; keep face counts low (4–8) to stay within the ~40-second solve budget.
2. Represent it as a **face-adjacency graph** (each face = a node; shared edges = graph edges). A valid net is any **spanning tree** of this graph: cut every edge not in the tree, then unfold each remaining tree-edge (rotate the attached face flat about its hinge) until every face lies in one plane without overlapping. For a cube specifically, this reduces to picking from the well-known **11 distinct valid nets** — a fixed, enumerable list, so a generator doesn't need general net-finding logic for the most common case.
3. Assign shading/pattern to a subset of faces on the 3D solid, then carry it through the same face→net-piece mapping computed in step 2.
4. Render the net as a true flat 2D layout (no projection needed — it's already flat) and render each folded answer choice pictorially, using Section 4's isometric technique, always folding "into the screen" per 10.2.
5. Generate the mirror-image distractor by reflecting the net (or the resulting solid) before the fold computation — a single, reliable operation that produces a distractor guaranteed non-superimposable on the true answer.
6. Generate the other distractors by (a) reassigning shading to a different face in the same fold, or (b) perturbing one face's shape/proportion in the source solid before recomputing its net.
7. Run the Section 10.3 piece-count-equals-face-count check on every generated item as a cheap validity filter.

---

## 11. Current Trends (2025–2026)

1. **The scoring-scale change is the single biggest recent development.** Effective March 1, 2025, ADA moved from a 2-digit (1–30) to 3-digit (200–600, 10-pt increments) scale, switching the underlying psychometric model from 1-parameter to **3-parameter logistic (3PL) IRT** — better separating candidates who guess correctly from those who reason correctly. Content and structure were explicitly unchanged. Scores from before the cutover were retroactively converted via official concordance tables. A secondary effect: **unofficial scores are no longer available at the test center** — candidates now wait roughly 10–14 business days for results, versus instant same-day scores previously.
2. **The Canadian DAT PAT went fully digital in 2022**, aligning with the U.S. computer-based Prometric delivery (it was previously paper-based, offered only twice a year).
3. ADA continues an active, incremental review cadence — e.g., an Organic Chemistry test-specification update is scheduled for April 2026 (naming/categorization changes, not PAT-related, but evidence the exam is a living document, not frozen).
4. The core 6-subtype PAT construct itself has been stable for a very long time — prep companies still reference the **ADA's 2007 sample test items** as representative of current mechanics, and the 2025-dated official instructions PDF describes essentially the same rules. **PAT format risk is low; scoring/reporting risk is what actually moves.**
5. There is no dominant, publicly known **AI-generated** PAT product yet. Several established players (PATCrusher, CrackDAT, DATBooster/PATBooster) already use **procedural "generators"** for infinite practice reps, particularly for Angle Discrimination and Cube Counting — so algorithmic generation is an accepted, expected mechanic in this niche; it just hasn't been marketed as "AI" yet. No notable open-source SVG/procedural PAT generator turned up in a GitHub search — this looks like genuine white space rather than a crowded field.
6. Cube Counting itself picked up a content change within the last several years — "floating" cubes (Section 9.2) weren't part of the item pool before 2020 and are now standard, meaning pre-2020 sample sets underrepresent current structural complexity.

---

## 12. Canadian DAT (CDAT) vs. American DAT — PAT Specifics

| | American DAT (ADA) | Canadian DAT (CDA) — English | Canadian DAT (CDA) — French |
|---|---|---|---|
| Sections | Nat. Sciences, **PAT**, Reading Comp, Quant. Reasoning | Nat. Sciences, **PAT**, Reading Comp, Manual Dexterity (optional) | Nat. Sciences, **PAT**, Manual Dexterity (optional) — no Reading Comp |
| Organic Chemistry | Included | **Not included** | Not included |
| Quantitative Reasoning | Included | **Not included** | Not included |
| PAT structure | 90 items / 60 min / 6 subtypes | **Identical**: 90 items / 60 min / same 6 subtypes | Identical |
| Delivery | Computer-based, Prometric | Computer-based, Prometric (since 2022) | Computer-based, Prometric |
| Scoring scale | 200–600 (since Mar 2025) | Historically its own 0–30-style scale via CDA — **CDA's post-2025 scale wasn't confirmed in this research; verify directly at cda-adc.ca before assuming parity with the U.S. 200–600 change**, since CDA and ADA are separate bodies | Same caveat |
| Manual Dexterity Test | N/A | Optional soap-carving test; several sources describe it as suspended/not currently offered, though status should be reverified as it has changed before | Same |

**Bottom line for the generator:** because the PAT construct (rules, subtypes, item counts, timing) is explicitly identical between the two testing bodies, you do **not** need separate content pipelines for "US PAT" vs. "Canadian PAT" — one procedurally-generated bank serves both audiences. Only the score-reporting/interpretation layer (if you build one) needs to branch by test body.

---

## 13. Mock-Test & Prep-Resource Landscape

Organized roughly by how central PAT is to each provider's offering.

**PAT-specialist platforms** (built around generators + unlimited reps):
- **PATCrusher** — dedicated generator per subtype, 3D-model-backed explanations, "100% Higher-Score Guarantee" positioning
- **Erudition PAT** — very detailed rule pages and worked examples per subtype; free tier for Level-1 question banks
- **CrackDAT / Crack the DAT** — generators including an explicit tunable-difficulty Angle Discrimination generator (3°/4°/5°/6° gap tiers); community reviews describe its Apertures section as easier than the real exam
- **DAT Bootcamp** (bootcamp.com) — repeatedly cited by test-takers as the strongest overall PAT prep, generators + full practice exams + explanations
- **DATBooster / PATBooster** (boosterprep.com, formerly "Feralis") — generators, "PAT analyzers," 3D-model visual explanations

**General DAT prep with solid PAT coverage:**
Kaplan Test Prep, BohrPrep, Shemmassian Academic Consulting, TestPrepPal, Jack Westin, Varsity Tutors, CliffsNotes, DAT Cracker, datprep.com, Future Dentist Prep, Gold Standard DAT (dat-prep.com — publisher of a dedicated PAT book plus a free practice test built on the legacy ADA 2007 sample items), OpenExamPrep, iPrepDental, Mometrix, gotestprep.com

**Science/quant-first providers where PAT is a minor add-on:**
- **DAT Destroyer (Orgoman)** — the dominant resource for Bio/Chem/QR/RC (~2,300+ problems), but explicitly does **not** ship a dedicated PAT test in its core book; PAT help is a separate paid add-on to its live classes. Useful data point: not every major "DAT prep" brand treats PAT as core business.

**Canada-specific:**
Master Student (masterstudent.ca), Tutor STEM (tutorstem.ca — also covers Manual Dexterity prep), DAT Books (datbooks.ca)

**Official / primary sources:**
- **ada.org** — Candidate Guide, scoring-change documents, and critically the **"Perceptual Ability Test Section" instructions PDF** (the source of the rules summarized in Section 3 above). ADA also now sells its own official practice test ($20/module or $100 for all 8 modules) — user reports describe it as somewhat easier than the real thing but authoritative on style, since it's built by actual item-writers.
- **cda-adc.ca** — Canadian DAT Candidate Guide and FAQ

**Community / anecdotal signal:**
Student Doctor Network (SDN) forums are the largest source of real test-taker calibration commentary (e.g., how the real Angle Discrimination gaps compare to various generators) — useful for difficulty-calibrating a generator against lived experience rather than only against other companies' generators.

---

## 14. Design Implications for an AI-Generated SVG Question Bank

This section translates the research above into concrete generation targets. (Sections 5–10 go deep on the per-subtype diagram conventions and generation algorithms summarized in the table below.)

**Cross-cutting technical notes:**
- **Answer-choice count is not uniform** — build this into your schema per subtype rather than assuming 4 or 5 everywhere: Apertures = 5, View Recognition = 4, Angle Discrimination = 4, Paper Folding = 5, Cube Counting = 5, Spatial Relations = 4.
- **Cube Counting needs a one-to-many figure→questions data model** (~3 questions per generated structure), unlike the other five subtypes' one-figure-per-question pattern.
- Solid-vs-dashed line convention (visible vs. hidden edge) is load-bearing for View Recognition specifically — worth a shared, consistent SVG stroke-style utility (e.g., `stroke-dasharray`) used identically everywhere it appears, since the whole subtype is a legibility test of that one convention.
- The official rules document (ADA's published PAT instructions) is exactly the kind of publicly-released explanatory material every prep company already paraphrases into their own practice items — building a generator from those documented *mechanics* (not from reproduced actual exam items, which ADA's Candidate Guide explicitly protects as confidential IP) is the same approach the entire existing prep industry takes.

**Per-subtype generation approach:**

| Subtype | What to compute | Natural difficulty knob(s) |
|---|---|---|
| Apertures | Procedurally build a 3D solid (extrusions/CSG); compute its true top/front/side silhouettes; correct answer = one true silhouette; distractors = perturbed scale/proportion, added/removed protrusion, wrong rotation | Solid complexity (# of faces/protrusions), silhouette similarity between distractors and answer |
| View Recognition | Build a 3D solid; compute all 3 orthographic projections with a hidden-line-removal (visibility) pass to correctly place solid vs. dashed edges | Number of features/holes, how visually similar the 4 options are, subtlety of the solid/dashed swap in distractors |
| Angle Discrimination | Pick 4 target angles with a controlled minimum pairwise gap; randomize ray length and screen rotation independently of true angle | Minimum degree-gap between adjacent angles (the entire industry already tunes exactly this variable) |
| Paper Folding | Model as fold operations on an N×N grid tracking the layer-stack per cell; simulate a punch; algorithmically compute the mirrored unfold positions | Number of folds (1–4), whether folds are axis-aligned only or include diagonals, number of simultaneous punches |
| Cube Counting | Generate a gravity-valid voxel structure (every cube resting on ground or supported); compute exposed-face count per cube (6 minus bottom-if-grounded minus adjacency) | Total cube count, structure irregularity, number of "necessary hidden" support cubes |
| Spatial Relations | Start from a 3D solid + face-shading; algorithmically unfold it into a 2D net; distractors = correct net folded with shading misassigned, a subtly wrong solid, or a mirrored (chirality-flipped) fold | Solid complexity (face count/shape variety), whether distractors use shading-swap vs. shape-swap vs. mirror-flip |

**A useful synergy:** for four of the six subtypes (Angle Discrimination, Paper Folding, Cube Counting, Apertures-via-silhouette, and View Recognition-via-visibility-pass), correctness is **exactly computable from the same geometry your generator already builds** — meaning the identical computation that derives the right answer can drive both automated answer-validation (no manual QA bottleneck) and the auto-generated step-by-step explanation text, since the explanation is just a narration of the computation. Spatial Relations is the one subtype where net-folding/chirality logic is meaningfully harder to get fully algorithmic — likely the highest-effort subtype in the whole set.

---

## 15. Sources

**Official**
- ada.org/education/testing/exams/dental-admission-test-dat
- ada.org — Perceptual Ability Test Section instructions (PDF)
- ada.org — DAT Candidate Guide, DAT Scoring Update, Concordance documents (PDFs)
- cda-adc.ca/en/becoming/dat/faqs
- cda-adc.ca — Canadian DAT Candidate Guide (PDF)

**PAT-specialist prep**
- patcrusher.com · eruditionprep.com · crackdat.com / app.crackdat.com · bootcamp.com · boosterprep.com

**General DAT prep with PAT content**
- kaptest.com/study/dat · bohrprep.com · shemmassianconsulting.com · testpreppal.com · orgoman.com · jackwestin.com · varsitytutors.com · datcracker.com · datprep.com · futuredentistprep.com · dat-prep.com · open-exam-prep.com · iprep.online · gotestprep.com · mometrix.com

**Canada-specific**
- masterstudent.ca · tutorstem.ca · datbooks.ca

**Scoring / admissions context**
- studentdoctor.net (SDN forums + SDN scoring-change article) · medicalaid.org · inspiraadvantage.com · blog.acceptedtogether.com · num8ers.com

**3D shapes, projection & paper-folding deep dive (Sections 4, 8)**
- Generic engineering-drawing grounding for isometric/oblique projection: eng.libretexts.org (Illinois Institute of Technology engineering-drawing course), oboe.com — used only for the underlying projection technique, not as DAT-specific sourcing
- Generic geometric-net grounding for Spatial Relations: helpingwithmath.com, skillsyouneed.com
- Adjacent (non-DAT) Canadian spatial-reasoning material used only for the transferable "count net faces to eliminate distractors" technique: test-preparation.ca (covers CFAT/SIGMA, not CDAT specifically — flagged as generic, not DAT-confirmed)
- Additional confirmation of Cube Counting's per-figure question structure: CliffsNotes (cliffsnotes.com)
- Additional Paper Folding fold-type/example detail: shemmassianconsulting.com (extended)

**Per-subtype deep dive (Sections 5–7, 9–10)**
- Apertures: varsitytutors.com (worked example + official rule text), kaptest.com, patcrusher.com, open-exam-prep.com, bohrprep.com, futuredentistprep.com
- View Recognition: patcrusher.com, shemmassianconsulting.com, varsitytutors.com, kaptest.com, dentaladmissiontest.medium.com (CrackDAT), bohrprep.com, bootcamp.com, eruditionprep.com
- Angle Discrimination: forums.studentdoctor.net, masterstudent.ca, patcrusher.com
- Cube Counting: dentaladmissiontest.medium.com (CrackDAT), shemmassianconsulting.com, cliffsnotes.com, forums.studentdoctor.net, datcracker.com, patcrusher.com, app.crackdat.com, eruditionprep.com, bohrprep.com
- Spatial Relations: (mirror-image/chirality confirmation) dentaladmissiontest.medium.com (CrackDAT), shemmassianconsulting.com, eruditionprep.com

*Note on sourcing: rules and mechanics above are paraphrased/summarized from publicly published instructional material (ADA's own explanatory documents plus independent prep-industry summaries of the same public rules) — not reproduced from secure/confidential exam items, which ADA's Candidate Guide explicitly protects.*
