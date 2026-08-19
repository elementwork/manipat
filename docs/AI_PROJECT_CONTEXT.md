# ManipAT AI Project Context

> **Purpose:** durable handoff for a fresh AI coding session working on `elementwork/manipat`.
>
> **Snapshot baseline:** `main` after merged PR #9, commit `8d6f0b2117ddd344deeacb7933f31ced76b47369` (2026-08-19).
>
> This file is a project-orientation layer, not a substitute for reading current code. At the start of every new session, verify the current `main` HEAD and re-read the files listed under **Read First**. If this document disagrees with current code/tests, **current code and tests are authoritative**.

---

# 1. Fresh-Session Bootstrap

A new AI session should begin with something close to:

```text
Work on my GitHub repo elementwork/manipat.

First read:
- docs/AI_PROJECT_CONTEXT.md
- docs/DESIGN.md
- docs/USER_GUIDE.md
- docs/PORTABLE_VIEWER.md
- docs/SOLUTIONS.md
- docs/THREE_RUNTIME.md

Then verify current main HEAD and current CI before making changes.
Preserve all non-negotiable invariants in AI_PROJECT_CONTEXT.md.
Do not merge a PR unless I explicitly ask you to merge it.

Task: <new task here>
```

For a large feature, the agent should **not** start coding from this file alone. It should first inspect the current implementation paths relevant to the task.

---

# 2. Repository Identity and Current Baseline

Repository:

```text
elementwork/manipat
```

Default branch:

```text
main
```

Baseline represented by this handoff:

```text
8d6f0b2117ddd344deeacb7933f31ced76b47369
```

That commit is the merge of PR #9:

```text
add development and portable interactive viewer modes (#9)
```

PR #9 introduced/merged:

- explicit development/debug and portable viewer modes;
- portable **study exam** architecture;
- printable solution modes `none | key | full`;
- interactive Study Tools: Check Answer, Show Explanation, Interactive Hint;
- one reusable all-in-one interactive viewer inside the portable study exam;
- single-page print contract for the standard 90-question Answer Sheet;
- refreshed `DESIGN.md` and `USER_GUIDE.md`.

**Important:** this SHA is a historical anchor only. Future agents must query current `main` before assuming it is still HEAD.

---

# 3. Project Mission

ManipAT is a deterministic, geometry-first generator for original DAT Perceptual Ability Test (PAT) practice material.

It supports all six PAT categories:

1. Apertures / Keyhole
2. View Recognition / TFE
3. Angle Discrimination
4. Paper Folding / Hole Punching
5. Cube Counting
6. Spatial Relations / Form Development

Default full set:

```text
90 questions
15 per category
```

The project is intended to generate mathematically valid, automatically solvable, independently validated, printable and optionally interactive PAT practice material.

It is not an official DAT product and does not depend on reproducing a proprietary question bank.

---

# 4. Non-Negotiable Architectural Invariants

These rules should be treated as hard constraints unless the user explicitly decides to redesign the system.

## 4.1 Rendered pixels never determine truth

Core pipeline:

```text
seed + difficulty
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
SVG / printable exam / explanation / interactive view
```

Never replace this with:

```text
render → inspect pixels → infer answer
```

SVG, WebGL and screenshots are presentation layers.

## 4.2 Solver and validator remain separate concerns

The generator may compute the answer while constructing a question, but the validator must independently verify enough canonical state that an incorrect `correctChoiceIndex` cannot silently pass.

## 4.3 Determinism is a product contract

Do not introduce ambient randomness such as `Math.random()` into generation.

Given the same code revision, seed and generation configuration, output should remain reproducible.

## 4.4 Three.js is never answer truth

Three.js exists for:

- interactive learning;
- runtime visualization;
- developer inspection.

It must not become the authoritative solver for Aperture, TFE, Cube Counting or Form Development.

## 4.5 Printable SVG is the scored presentation layer

The canonical exam must remain usable without WebGL or runtime JavaScript.

## 4.6 Portable study output must remain offline/self-contained

After `dat:view:portable` generates the `.interactive.html` file, viewing it must require:

```text
no Node process
no localhost server
no CDN
no internet connection
no neighboring JS module files
```

## 4.7 Do not create a second answer/explanation database

Correct answers and explanations come from canonical persisted question objects:

```text
correctChoiceIndex
question.explanation
canonical geometry/state
```

The printable solution appendix and portable Study Tools must consume this same source of truth.

## 4.8 Visual learning aids must remain optional

Color Code, Ghost mode, interactive 3D, fold animations and explanation highlighting are teaching aids. They should not silently alter scored question semantics.

---

# 5. Technology Stack

Current workspace requirements:

```text
Node.js >= 22
pnpm 10.15.1
TypeScript
ESM
Vitest
ESLint zero-warning policy
```

Root scripts:

```bash
pnpm build
pnpm lint
pnpm test
pnpm dat ...
pnpm dat:view ...
pnpm dat:view:dev ...
pnpm dat:view:portable ...
```

Geometry/rendering stack:

- **Manifold (`manifold-3d`)** — robust CSG / canonical 3D geometry for Aperture/TFE and shared geometry operations.
- **Custom discrete/2D algorithms** — Paper Folding, Cube Counting, Angle, Form Development semantics.
- **Custom SVG** — deterministic printable line art.
- **Three.js** — interactive runtime visualization only.

Do not force all PAT categories through one geometry library merely for architectural uniformity.

---

# 6. Workspace Map

```text
packages/core
  deterministic PRNG, vectors/math, canonical serialization, shared types

packages/geometry
  Manifold wrapper, owned geometry handles, topology, projection, silhouettes

packages/object-generator
  reusable procedural 3D template registry for Aperture/TFE

packages/svg
  deterministic SVG construction helpers

packages/renderer-three
  runtime payloads, Three.js scenes, controls, semantic learning overlays

packages/pat-aperture
  Aperture generator / solver / validator / renderer / runtime reconstruction

packages/pat-view-recognition
  TFE generator / solver / validator / renderer / runtime reconstruction

packages/pat-angle
  2D angle generator / solver / validator / renderer

packages/pat-paper-folding
  discrete fold state, punch solving, panel renderer, fold-animation geometry

packages/pat-cube-counting
  sparse voxel structure, painted-face solver, SVG rendering

packages/pat-form-development
  polyhedra, nets, foldability, spatial distractors, rendering

packages/question-bank
  unified engine, batch scheduling, persistence, exam HTML, solutions

packages/cli
  generation CLI, dev viewer server, portable packer, study shell
```

---

# 7. Read First

For any substantial task, inspect these first:

```text
docs/DESIGN.md
docs/USER_GUIDE.md
docs/PORTABLE_VIEWER.md
docs/SOLUTIONS.md
docs/THREE_RUNTIME.md
```

Then read the subsystem-specific code involved in the requested change.

Additional useful reference:

```text
docs/INTERACTIVE_LEARNING.md
```

### Known documentation discrepancy

As of this snapshot, `docs/INTERACTIVE_LEARNING.md` still mentions Paper playback options:

```text
0.5× / 1× / 1.5× / 2×
```

The current implementation and newer runtime documentation use only:

```text
0.5× / 1× / 2×
```

The current `1×` was intentionally slowed to roughly one-third of the earlier playback rate.

**Do not reintroduce `1.5×` based on the stale sentence.** Verify code before modifying playback.

---

# 8. Three Product/Runtime Surfaces

ManipAT intentionally separates three surfaces.

## 8.1 Canonical printable exam

Command:

```bash
pnpm dat generate set \
  --seed exam-001 \
  --offline \
  --output ./output/exam-001.html
```

Properties:

- self-contained HTML;
- deterministic SVG questions and choices;
- no external scripts/assets;
- blank Answer Sheet;
- embedded canonical question JSON under `manipat-exam-data`;
- Letter portrait print CSS;
- authoritative scored presentation.

Default solution mode is `none`.

## 8.2 Development/debug viewer

Commands:

```bash
pnpm dat:view ./output/exam-001.html
pnpm dat:view:dev ./output/exam-001.html
```

Default URL:

```text
http://127.0.0.1:4173/
```

Purpose:

- source-level browser debugging;
- ordinary ES-module loading;
- WebGL inspection;
- rapid Three.js/runtime iteration.

The dev server serves runtime and Three modules such as:

```text
/runtime/*
/vendor/three/*
/vendor/three/addons/*
```

Do not remove this mode merely because portable mode exists.

## 8.3 Portable study exam

Command:

```bash
pnpm dat:view:portable ./output/exam-001.html
```

Default output:

```text
./output/exam-001.interactive.html
```

This is **not** a viewer-only page.

It starts from the original canonical exam and adds a screen-only study layer:

```text
original exam
  + Study Tools
  + Check Answer
  + Show Explanation
  + optional Interactive Hint
  + embedded runtime module graph
```

The original cover, questions, choices, blank Answer Sheet and `manipat-exam-data` remain present.

---

# 9. Portable Study Exam Architecture

Primary files:

```text
packages/cli/src/portable-bin.ts
packages/cli/src/portable-viewer.ts
packages/cli/src/study-exam.ts
packages/cli/src/viewer-server.ts
packages/cli/src/viewer-payload.ts
packages/cli/src/visualize.ts
```

## 9.1 Packaging model

The portable packer:

1. starts from compiled ManipAT runtime modules;
2. recursively discovers the needed runtime dependency graph;
3. includes Three.js and OrbitControls;
4. rewrites relative module imports to deterministic synthetic specifiers;
5. embeds modules as `data:text/javascript;base64,...` URLs;
6. writes an inline import map;
7. embeds the all-in-one viewer into the portable study document.

There is intentionally no extra Webpack/Rollup/esbuild dependency just for portable packaging.

Unexpected bare/external dependencies should fail closed rather than silently fetch from a CDN.

## 9.2 Study Tools

Portable study exam provides a floating **Study Tools** launcher.

Drawer behavior:

```text
Previous
Question selector
Next
Check Answer
Show Explanation
Interactive Hint
```

Rules:

- selecting a question may scroll the canonical exam to that question;
- Check Answer reveals canonical answer data;
- Show Explanation reveals explanation and answer;
- Interactive Hint is optional/collapsed by default;
- Angle has no 3D interactive hint;
- Paper uses the existing all-in-one fold workspace;
- 3D categories open the current runtime viewer at the selected question.

## 9.3 One reusable viewer

Do **not** create one WebGL canvas for all 90 questions.

Current design uses one reusable embedded all-in-one viewer and sends it the selected question ID.

Benefits:

- avoids many simultaneous WebGL contexts;
- keeps exam pages primary;
- reuses one implementation;
- reduces resource leaks and duplicated UI logic.

## 9.4 Portable filters

Examples:

```bash
pnpm dat:view:portable ./output/exam.html --category aperture
pnpm dat:view:portable ./output/exam.html --category paper
pnpm dat:view:portable ./output/exam.html --question-id <id>
```

These filters constrain which questions receive interactive payloads.

They must **not** remove the canonical exam pages, answers or explanations from the portable artifact.

---

# 10. Printable Solution Modes

Primary implementation:

```text
packages/question-bank/src/solutions.ts
packages/cli/src/index.ts
```

Supported modes:

```text
none
key
full
```

Commands:

```bash
# Default exam
pnpm dat generate set --solutions none ...

# Answer Key only
pnpm dat generate set --solutions key ...

# Answer Key + detailed explanations
pnpm dat generate set --solutions full ...
```

Backward-compatible alias:

```text
--include-explanations  =>  --solutions full
```

Config supports:

```json
{
  "solutions": "full"
}
```

Legacy:

```json
{
  "includeExplanations": true
}
```

also maps to full.

### Explanation truth

Explanation output is category-specific but comes entirely from canonical fields.

Current explanation families include:

- Aperture: projection facts + distractor failure reasons;
- TFE: missing view + cross-view correspondences + distractor mutations;
- Angle: measured angle values + correct order;
- Paper: reverse-unfold sequence, punch layers, final hole locations;
- Cube: target painted-face count + matching cube coordinates;
- Form: marked faces, adjacency and folding/chirality relationships.

---

# 11. Print Contract

Primary file:

```text
packages/question-bank/src/exam-html.ts
```

## 11.1 Standard Answer Sheet

For standard exams up to 90 questions, the Answer Sheet receives:

```text
answer-sheet-single-page
```

Print behavior intentionally:

- prevents breaking inside the Answer Sheet;
- fixes it to one Letter page;
- uses tighter print-only vertical gaps and row height;
- preserves the roomier screen appearance.

For custom exams over 90 questions, do not force all rows into one page and silently clip them.

## 11.2 Portable print behavior

Study Tools, drawer, and interactive modal must remain hidden by `@media print`.

Printing a portable study exam should expose the underlying canonical exam layout, not the study UI.

For authoritative output, the canonical `exam.html` remains the preferred print/PDF source.

## 11.3 Browser reality

CSS assertions in CI cannot fully guarantee a particular browser's physical print pagination.

When changing print CSS, manually inspect Chrome/Safari Print Preview at Letter size.

---

# 12. Runtime 3D Architecture

Primary package:

```text
packages/renderer-three
```

Important files:

```text
src/question-viewer.ts
src/runtime-viewer.ts
src/runtime-payload.ts
src/cameras.ts
src/scene.ts
src/semantic-patches.ts
src/voxels.ts
```

## 12.1 Canonical axes

```text
+X = right
+Y = depth/back
+Z = up
```

TFE projection frames:

```text
FRONT
viewDirection = [0,-1,0]
imageRight    = [1,0,0]
imageUp       = [0,0,1]

TOP
viewDirection = [0,0,-1]
imageRight    = [1,0,0]
imageUp       = [0,1,0]

RIGHT_END
viewDirection = [-1,0,0]
imageRight    = [0,1,0]
imageUp       = [0,0,1]
```

Three.js camera presets must remain aligned with these mathematical frames.

## 12.2 Browser controls

Current 3D controls include, where applicable:

- mouse/touch orbit;
- pan;
- wheel/pinch zoom;
- `3D` isometric orthographic preset;
- Front;
- Top;
- End;
- Target view when defined;
- Reset;
- Auto rotate;
- Surface;
- Edges;
- Ghost/hidden lines;
- semantic Color Code;
- explanation highlighting where payloads support it.

The runtime viewer owns renderer/controls/resize/render-loop disposal.

---

# 13. Semantic Color Code

Primary implementation:

```text
packages/renderer-three/src/semantic-patches.ts
```

Color Code is educational only.

Current semantic intent:

```text
neutral/body       light gray
raised/protrusion  pale blue
recess/cut         pale coral
terminal interior  pale amber
```

Important implementation decisions:

- classify connected smooth surface patches, not individual triangles;
- explicit feature/provenance IDs are strong semantic evidence;
- recess fallback is conservative and patch-level;
- terminal fallback is conservative and patch-level;
- **do not infer protrusion/raised coloring purely from curvature** when provenance is missing.

Missing semantic color is preferable to teaching the wrong geometry.

### Technical-debt note

Historically, `scene.ts` retained legacy direct pictorial-classification logic while `question-viewer.ts` used the corrected `semantic-patches.ts` path. Before any cleanup/refactor, inspect current code to confirm whether this duplication still exists. If it does, consolidate only with regression coverage.

---

# 14. Cube Counting Interactive Controls

Primary runtime implementation:

```text
packages/renderer-three/src/voxels.ts
```

Cube runtime supports:

- Surface;
- Edges;
- Ghost/hidden lines;
- explanation highlighting.

Important visual rule:

The edge network is derived from exposed cube-face boundaries and intentionally preserves seams between individual cubes.

Do not replace it with only a Boolean-union outer shell: cube seams are part of the perceptual task.

Ghost mode uses translucent faces plus visible/occluded edge treatment rather than simply hiding geometry.

---

# 15. Paper Folding / Hole Punching

Paper remains a discrete 2D/layer-state problem. Do not force it into Three.js for architectural uniformity.

Primary relevant files include:

```text
packages/pat-paper-folding/src/render.ts
packages/cli/src/visualize.ts
packages/cli/src/viewer-payload.ts
packages/cli/src/viewer-server.ts
```

## 15.1 Scored/canonical diagram model

The renderer preserves:

- dashed original square reference;
- separate current paper panels;
- visible folded-over flap boundaries;
- punch on final folded state;
- deterministic panel clipping/reflection/layer ordering.

## 15.2 Current all-in-one interactive workspace

One page, responsive split layout:

```text
LEFT
All steps overview

RIGHT
Interactive walkthrough
```

Desktop uses two columns; narrow screens stack.

## 15.3 All-steps overview labels

Current layout intent:

- `Forward: fold and punch` has adequate separation before the forward diagrams;
- `Reverse: unfold to the answer` sits **below** the reverse diagram row with clear spacing.

Do not regress these caption-placement decisions casually.

## 15.4 Unified state timeline

Conceptual states:

```text
Start
→ Forward fold 1 ... last fold
→ Punch
→ Reverse unfold steps
→ Solved
```

Manual controls:

```text
Previous step
Next step
```

Automatic playback:

```text
forward folds
→ punch
→ reverse unfolds
→ solved
→ rewind
→ original
```

Playback controls:

```text
Play
Pause
0.5×
1×
2×
```

Current `1×` is intentionally much slower than the original early implementation (about 3× slower).

Pause/resume should preserve the current tween rather than restart it.

Changing speed during an active fold should affect ongoing animation.

Reduced-motion browser preferences should avoid unnecessary tweening.

## 15.5 Explanation grammar

During reverse unfolding:

```text
dark holes        existing/current
coral holes       newly exposed
heavy/dashed gray prior stacked positions
dashed blue       fold axis
```

Also show useful layer/hole/folds-remaining information.

Forward/reverse animation must be derived from canonical fold geometry; reverse is the same transition run in the opposite direction, not a second solver.

---

# 16. Category-Specific Truth Models

## 16.1 Aperture / Keyhole

Truth:

```text
orthographic silhouette/cross-section of canonical 3D solid
```

Prompt uses a pictorial/isometric-style object.

Harder bands use richer multi-feature source geometry and higher projection complexity.

## 16.2 View Recognition / TFE

Truth:

```text
strict orthographic front/top/right-end views
```

Visible edges are solid; hidden edges dashed.

Distractors should remain coherent plausible projections rather than arbitrary line corruption.

## 16.3 Angle

Truth:

```text
mathematical angular separation/ranking
```

No Three.js hint is needed.

## 16.4 Paper

Truth:

```text
discrete fold/layer state + exact reverse unfolding of punches
```

## 16.5 Cube Counting

Truth:

```text
sparse supported voxel coordinates + painted exposed faces
```

Painting convention:

> all exposed faces are painted except the bottom resting surface.

## 16.6 Form Development

Truth:

```text
logical polyhedron + valid 2D net + face adjacency/orientation/chirality
```

Do not determine foldability from rendered answer images.

---

# 17. Question-Bank / Batch Layer

Primary directory:

```text
packages/question-bank/src
```

Important files:

```text
engine.ts
batch.ts
workers.ts
batch-worker.ts
exam-html.ts
solutions.ts
runtime-models.ts
storage.ts
serialization.ts
fingerprints.ts
types.ts
```

Responsibilities:

- unified PAT engine dispatch;
- generation and validation routing;
- duplicate detection;
- difficulty scheduling;
- exact weighted difficulty quotas;
- grouped Cube Counting handling;
- worker-thread orchestration;
- persistence;
- printable exam rendering;
- printable solutions.

### Grouped Cube Counting warning

Cube generation may produce multiple questions for one shared figure.

Batch scheduling must respect remaining difficulty quota before accepting a group. Do not reintroduce quota overshoot.

---

# 18. Difficulty Model

Difficulty bands:

```text
1 beginner
2 easy
3 medium
4 hard
5 expert
```

Difficulty is an engineering heuristic, not yet psychometrically calibrated.

It should affect actual source-question parameters, not merely metadata.

Examples:

- Aperture: model bank / feature complexity / projection complexity;
- TFE: model complexity / view information / hidden lines;
- Angle: angular separation;
- Paper: fold/punch complexity and distractor similarity;
- Cube: footprint, towers, total structure;
- Form: profile/net complexity and distractor geometry.

Weighted mixes should be converted to exact integer quotas.

---

# 19. CLI Surface

Main CLI entry:

```text
packages/cli/src/index.ts
```

Core commands:

```text
generate
validate
inspect
regenerate
benchmark
doctor
list
```

Common examples:

```bash
pnpm dat list categories
pnpm dat doctor

pnpm dat generate set \
  --workers 3 \
  --seed exam-001 \
  --difficulty 3 \
  --offline \
  --output ./output/exam-001.html

pnpm dat validate ./output/exam-001.html

pnpm dat inspect ./output/exam-001.html \
  --output ./output/exam-001-inspect.html
```

Viewer commands:

```bash
pnpm dat:view ./output/exam-001.html
pnpm dat:view:dev ./output/exam-001.html
pnpm dat:view:portable ./output/exam-001.html
```

---

# 20. CI and Verification Contract

Workflow:

```text
.github/workflows/pr-verify.yml
```

Current Verify job uses:

```text
Node 22.14.0
pnpm 10.15.1
```

Core gates:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test
```

Then CI performs:

1. full 90-question offline smoke generation with 3 workers;
2. asserts the standard Answer Sheet single-page print contract;
3. asserts default exam does not expose an Answer Key;
4. printable `--solutions full` smoke;
5. portable study exam smoke;
6. asserts portable output retains Answer Sheet + `manipat-exam-data` + Study Tools;
7. rejects retained dev-server runtime imports in portable output;
8. difficulty-5 smoke generation for all six categories;
9. uploads generated HTML artifacts.

Do not weaken these gates merely to make a feature pass.

For rendering changes, CI is necessary but not sufficient: perform manual visual inspection.

---

# 21. Manual Validation Expectations

## Printable changes

Check:

- Letter paper;
- 100%/actual size;
- browser headers/footers disabled;
- question clipping;
- line weights;
- page breaks;
- Answer Sheet remains one page for standard 90-question set;
- Answer Key/Solutions begin on intended later pages.

## Runtime changes

Compare:

```bash
pnpm dat:view:dev ./output/three-review.html
```

against:

```bash
pnpm dat:view:portable ./output/three-review.html
```

Check:

- Aperture/TFE 3D rendering;
- OrbitControls;
- Front/Top/End/Target presets;
- Color Code;
- Ghost;
- Surface;
- Edges;
- Cube highlighting;
- Paper forward/reverse/rewind;
- Form Development;
- question/category navigation;
- viewer disposal/reopening;
- portable Network tab shows no module fetches.

---

# 22. Known Limitations / Technical Debt

Treat these as known context, not necessarily immediate work items.

## 22.1 Browser visual regression is still largely manual

There is no complete fixed-seed Playwright screenshot/print-diff pipeline yet.

A mathematically valid change can still create a bad PAT visual.

## 22.2 Native PDF export is not the canonical pipeline

Use browser Print / Save as PDF.

Do not add native PDF output unless it can preserve the existing print layout reliably.

## 22.3 Difficulty is heuristic

No large student-performance/IRT calibration layer exists yet.

## 22.4 Semantic CSG provenance can be improved

Color Code fallback inference is intentionally conservative. Richer surface provenance through Boolean operations would improve teaching overlays.

## 22.5 Portable packer intentionally supports a constrained module graph

If new browser dependencies are introduced, explicitly add/test portable packaging support. Do not fall back to remote/CDN imports.

## 22.6 Paper truth is grid/layer based, not a general origami engine

Do not assume arbitrary continuous fold/punch geometry is already supported.

## 22.7 Documentation can lag code

Always resolve conflicts in this order:

```text
current code/tests
→ newest focused docs
→ AI_PROJECT_CONTEXT.md
→ older broad docs/history
```

Known current example: stale Paper `1.5×` reference in `INTERACTIVE_LEARNING.md`.

---

# 23. Security / Trust Boundaries

Generated questions use controlled data, but persisted/imported files may be untrusted.

Preserve:

- HTML escaping for visible imported strings;
- safe embedding of JSON (`<`, `>`, `&` escaped in script JSON);
- safe/sanitized filenames for imported IDs;
- no `eval` / dynamic Function dependency for runtime packaging;
- offline generation should not silently access network resources.

---

# 24. Working Style for AI Agents on This Repo

These are practical collaboration preferences for this project.

## 24.1 Prefer implementation over speculative planning once scope is clear

For a concrete engineering request:

- inspect current code;
- make the change;
- test it;
- present concise results and manual validation steps.

Do not repeatedly ask for confirmation when the intent is already actionable.

## 24.2 Ask design questions before coding only when the user explicitly requests discussion

When the user says “let's discuss this before implementing,” do not code until the direction is agreed.

Otherwise, make a best-effort implementation.

## 24.3 Use meaningful commits, not file-by-file commit noise

Batch related changes into a coherent feature/fix commit when practical.

Avoid frequent commits/pushes for every tiny edit.

## 24.4 PR behavior

For substantial work:

- branch from current merged `main`;
- use an `agent/...` branch;
- open a draft PR unless requested otherwise;
- keep PR description current;
- run CI;
- leave the PR unmerged until the user explicitly asks for merge.

**Never merge a PR on your own.**

## 24.5 Visual feedback is authoritative for presentation defects

The user manually reviews generated HTML and interactive output and often provides precise visual feedback. Treat fixed-seed visual defects as real issues even when validators pass.

## 24.6 Final implementation responses

Prefer a concise structure:

```text
what changed
commit/head/PR
CI status
commands to pull/regenerate
specific manual checks
```

Do not bury the actionable commands in excessive narrative.

---

# 25. Git Workflow for a New Large Task

At the beginning:

1. inspect current `main` HEAD;
2. inspect open PRs relevant to the task;
3. confirm working baseline is post-latest merge;
4. create `agent/<meaningful-feature-name>` from current main;
5. inspect implementation before writing.

During work:

1. keep user updated periodically for long tasks;
2. surface early findings if a material bug/design issue is discovered;
3. keep changes focused;
4. add regression tests for fixed bugs;
5. run build/lint/tests before claiming success;
6. run representative full-set/category smoke generation if generation/rendering changes.

Before handoff:

1. keep branch history reasonably clean;
2. open/update draft PR;
3. ensure CI is green or explain exact blocker;
4. give commands for local/manual visual review;
5. do not merge without explicit instruction.

---

# 26. Useful Local Commands

Setup:

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
pnpm build
```

Quality gates:

```bash
pnpm build
pnpm lint
pnpm test
```

Full set:

```bash
pnpm dat generate set \
  --workers 3 \
  --seed three-review \
  --offline \
  --output ./output/three-review.html
```

Portable study exam:

```bash
pnpm dat:view:portable ./output/three-review.html
open ./output/three-review.interactive.html
```

Dev viewer:

```bash
pnpm dat:view:dev ./output/three-review.html
```

Paper-only dev viewer:

```bash
pnpm dat:view:dev ./output/three-review.html --category paper
```

Printable full solutions:

```bash
pnpm dat generate set \
  --workers 3 \
  --seed three-review-solutions \
  --solutions full \
  --offline \
  --output ./output/three-review-solutions.html
```

---

# 27. High-Value Files by Task Type

## Printable exam / page layout

```text
packages/question-bank/src/exam-html.ts
packages/question-bank/src/solutions.ts
```

## Main generation CLI

```text
packages/cli/src/index.ts
```

## Development viewer shell/server

```text
packages/cli/src/viewer-server.ts
packages/cli/src/visualize-bin.ts
packages/cli/src/visualize.ts
```

## Portable study output

```text
packages/cli/src/portable-bin.ts
packages/cli/src/portable-viewer.ts
packages/cli/src/study-exam.ts
```

## Runtime Three.js controls/scenes

```text
packages/renderer-three/src/question-viewer.ts
packages/renderer-three/src/runtime-viewer.ts
packages/renderer-three/src/scene.ts
packages/renderer-three/src/cameras.ts
packages/renderer-three/src/runtime-payload.ts
```

## Semantic Color Code

```text
packages/renderer-three/src/semantic-patches.ts
```

## Cube runtime rendering

```text
packages/renderer-three/src/voxels.ts
```

## Runtime model reconstruction

```text
packages/question-bank/src/runtime-models.ts
packages/pat-aperture/src/runtime.ts
packages/pat-view-recognition/src/runtime.ts
```

## Paper animation/overview

```text
packages/pat-paper-folding/src/render.ts
packages/cli/src/visualize.ts
packages/cli/src/viewer-server.ts
packages/cli/src/viewer-payload.ts
```

## Batch / workers / difficulty quota

```text
packages/question-bank/src/batch.ts
packages/question-bank/src/workers.ts
packages/question-bank/src/batch-worker.ts
```

---

# 28. Design Decisions That Should Not Be Accidentally Reversed

1. **Hybrid stack is intentional.** Paper/Angles/Cubes/Form semantics do not need to become Manifold problems.
2. **Canonical printable exam stays static.** Do not inject Three.js into scored `generate` output.
3. **Portable study exam is the original exam plus optional learning controls.** Do not revert it to viewer-only output.
4. **Interactive hint starts collapsed.** Immediate 3D assistance can give away part of the PAT task.
5. **One reusable WebGL viewer.** Do not instantiate 90 viewers.
6. **Angle has no 3D hint.** It is intrinsically a 2D perceptual task.
7. **Paper uses one combined workspace.** Do not restore separate All Steps / Step-by-step / Animate tabs without an explicit redesign decision.
8. **Paper speed options are only `0.5× / 1× / 2×`.**
9. **Paper auto playback rewinds after solving.**
10. **Reverse Paper caption belongs below its reverse diagrams.**
11. **Color Code protrusions are provenance-driven, not guessed from curvature.**
12. **Cube visible seams matter.** Do not collapse the edge network into only the outer union shell.
13. **`--solutions none` remains default.** Exam generation should not expose answers unless requested.
14. **Portable Study Tools may show answers/explanations even when source exam has `solutions none`, because canonical question JSON already contains truth.**
15. **Standard ≤90 Answer Sheet should print as one Letter page.**
16. **Portable output must not require a local server after generation.**
17. **Do not merge PRs without explicit user instruction.**

---

# 29. Suggested Next-Session Orientation Checklist

Before implementing a new large task, the next AI should answer these internally from the live repo:

```text
[ ] What is current main HEAD?
[ ] Are there open PRs touching the target subsystem?
[ ] Does current CI pass?
[ ] Which canonical model owns truth for this category?
[ ] Is this change generator/solver/validator, printable rendering, runtime learning UI, or portable packaging?
[ ] Which existing regression tests protect the behavior?
[ ] Does this require fixed-seed visual review?
[ ] Does portable output need additional module-graph support?
[ ] Does this affect print layout or the one-page Answer Sheet?
[ ] Does this affect deterministic serialized question data?
```

If the task crosses several layers, keep them separate conceptually even if implemented in one PR.

---

# 30. Definition of Done for Major Features

A major feature is not done merely because TypeScript compiles.

Expected completion criteria, where applicable:

```text
[ ] implementation uses canonical truth rather than rendered pixels
[ ] deterministic behavior preserved
[ ] solver/validator invariants preserved or strengthened
[ ] unit/regression tests added
[ ] pnpm build passes
[ ] pnpm lint passes with zero warnings
[ ] pnpm test passes
[ ] representative generation smoke passes
[ ] full 90-question smoke passes when appropriate
[ ] dev viewer tested when runtime changed
[ ] portable viewer tested when runtime/packaging changed
[ ] print preview checked when layout changed
[ ] docs updated when user-facing behavior changed
[ ] draft PR clearly explains architecture/user impact
[ ] PR left unmerged pending explicit user instruction
```

---

# 31. Final Rule

The most important project principle remains:

> **Generate a model that can be solved exactly, validate it independently, and only then make it look like an exam question.**

When a new feature or refactor creates tension between convenience and this rule, preserve the rule and redesign the convenience layer.
