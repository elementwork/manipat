# ManipAT Interactive Learning Modes

ManipAT keeps its printable SVG exam output canonical and neutral. Interactive learning aids are separate browser/runtime features and are never used to determine answer truth.

## Semantic Color Code

Mesh-based Three.js questions expose an optional **Color Code** toggle. The default view remains the neutral exam-style model.

The learning palette is intentionally subtle:

| Cue | Meaning |
|---|---|
| Light gray | neutral/body surface |
| Pale blue | convex or raised feature cue |
| Pale coral | hole, recess, cavity, notch, or other concave/cut cue |
| Pale amber | terminating interior surface, such as a likely blind-hole/recess floor |

Color Code can be combined with Ghost/hidden-line mode. Ghost mode continues to use solid visible edges and dashed occluded edges.

### Classification contract

Color Code is an educational visualization, not a new geometry solver.

Semantic coloring is assigned to **connected visual surface patches**, not individual mesh triangles. Coplanar/smooth triangles that form one visual face receive one classification, so triangulation diagonals cannot produce half-face color artifacts.

When normalized mesh feature groups retain meaningful source IDs, semantic keywords such as `hole`, `recess`, `boss`, `bump`, `blind`, and `floor` are treated as strong hints and propagated across their connected surface patch.

When source provenance is unavailable after CSG/normalization, fallback inference is deliberately conservative:

- cavity/recess patches may be inferred when most of a complete connected surface patch faces inward relative to the solid envelope;
- a blind-hole/recess terminal may be inferred only for a complete planar patch with a strong boundary relationship to an identified recess;
- **raised/boss/protrusion coloring is not guessed from curvature alone**. Without semantic provenance it remains neutral, because a missing cue is preferable to teaching a false feature classification.

The neutral model, canonical mesh, orthographic projections, validators, and solvers remain authoritative.

## Cube Counting Inspection Controls

Cube Counting uses the same study controls where they are useful:

- **Surface** hides or shows cube faces;
- **Edges** hides or shows the cube-boundary line network;
- **Ghost / hidden lines** makes cube faces translucent while keeping visible boundaries solid and showing occluded boundaries as dashed lines.

The edge model is constructed from exposed cube-face boundaries rather than from a Boolean-union envelope. This deliberately preserves seams between individual cubes because those seams are part of the Cube Counting visual task.

## Paper Punching Guided Unfolding

Paper Punching is interactive without being forced into Three.js. Its truth model remains the discrete 2D paper-layer state used by the generator and validator.

The viewer reconstructs a deterministic explanation from the persisted folds and punches. The Paper workspace is intentionally presented as **one page** rather than separate modes:

- **Left:** the complete static **All steps** overview SVG, showing the forward fold/punch sequence and reverse solution together.
- **Right:** one interactive walkthrough that combines manual step-by-step study and animated folding/unfolding.

### Unified interactive timeline

The right-side timeline uses one ordered set of canonical states:

1. original sheet;
2. first forward fold through the last forward fold;
3. punched folded stack;
4. first reverse-unfold step through the fully unfolded solved pattern.

**Previous step** and **Next step** move through those states discretely. **Play** animates from the current position through the remaining forward/reverse sequence and then **rewinds back to the original sheet**. **Pause** freezes the active animation and **Play** resumes it. A speed selector provides `0.5×`, `1×`, `1.5×`, and `2×` playback.

The automatic playback sequence is therefore:

```text
forward folds → punch → reverse unfolds → solved pattern → rewind → start
```

Each forward/reverse fold animation is derived from the same clipped paper panels and fold axis used by the canonical renderer. Reverse animation reuses the corresponding forward fold geometry in the opposite direction; it does not introduce a second solver.

### Explanation grammar

At reverse-unfold endpoints:

- dark circles: current/existing hole positions;
- coral circles: newly exposed positions after the current reverse fold;
- dashed gray circles: the prior stacked position of layers that moved;
- dashed blue line: the exact fold/reflection axis being reversed;
- text: number of punched layers affected by that reverse fold, visible hole count, and remaining applied folds.

The punch state also reports how many paper layers each punch penetrated.

### Fold animation model

For motion study, each fold is animated from the same clipped paper panels used by the canonical renderer. A top-view hinge animation scales a moving point's signed perpendicular displacement from the fold line by `cos(pi * t)`:

- `t = 0`: original flap position;
- `t = 0.5`: flap is edge-on and collapses to the hinge line in top projection;
- `t = 1`: fully reflected folded position.

Reverse unfolding applies the same animation from `t = 1` back to `t = 0`. Rewind reverses the already-defined state transitions back to the initial sheet. This remains a deterministic visualization of the existing fold state, not a physics solver. Reduced-motion browser preferences skip the tween and show discrete states.

## Viewer usage

Generate and open a complete set:

```bash
pnpm dat generate set --seed learning-demo --offline --output ./output/learning-demo.html
pnpm dat:view ./output/learning-demo.html
```

The browser category selector includes Aperture, TFE, Paper Punching, Cube Counting, and Form Development when present in the input.

To open only Paper Punching explanations:

```bash
pnpm dat:view ./output/learning-demo.html --category paper
```

To focus on 3D geometry learning, select Aperture or TFE and enable **Color Code**. Enable **Ghost / hidden lines** at the same time when you need to inspect through-holes, blind holes, recess depth, or occluded geometry.

## Non-goals

These learning modes do not change:

- correct answers;
- distractor generation;
- deterministic seeds;
- printable exam SVGs;
- canonical orthographic views;
- PAT validators;
- persistence truth models.

Future work can improve explicit semantic feature provenance through the CSG pipeline further, but optional learning overlays and animations must remain derived views of the existing canonical state rather than independent solvers.