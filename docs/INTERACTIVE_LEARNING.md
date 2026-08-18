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

When normalized mesh feature groups retain meaningful source IDs, the renderer uses semantic keywords such as `hole`, `recess`, `boss`, `bump`, `blind`, and `floor` as strong hints. When source provenance is unavailable after CSG/normalization, the viewer falls back to local mesh geometry:

- inward-facing surfaces relative to the solid envelope are cavity/recess candidates;
- surfaces adjacent to cavity walls that terminate internally are terminal-surface candidates;
- smoothly varying outward surfaces away from the global envelope are raised/convex candidates.

The fallback is deliberately conservative, but it is still a visual learning heuristic. The neutral model, canonical mesh, orthographic projections, validators, and solvers remain authoritative.

## Paper Punching Guided Unfolding

Paper Punching is interactive without being forced into Three.js. Its truth model remains the discrete 2D paper-layer state used by the generator and validator.

The browser viewer now reconstructs a deterministic explanation from the persisted folds and punches:

1. show the original fold/punch sequence;
2. start at the punched folded stack;
3. reverse the final fold;
4. continue reversing folds in order;
5. finish at the fully unfolded solved hole pattern.

Each reverse-unfold step derives its state from the same canonical `sourceLayerId`, `currentCenter`, fold instruction, and punch-layer data used by the solver. No SVG pixel analysis is involved.

### Explanation grammar

- dark circles: current/existing hole positions;
- coral circles: newly exposed positions after the current reverse fold;
- dashed gray circles: the prior stacked position of layers that moved;
- dashed blue line: the exact fold/reflection axis being reversed;
- text: number of punched layers affected by that reverse fold, visible hole count, and remaining applied folds.

The initial punch step also reports how many paper layers each punch penetrated.

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

Future work can improve feature provenance through the CSG pipeline and add hinge-based 3D paper-fold animations, but those animations should remain derived views of the existing canonical state rather than independent solvers.
