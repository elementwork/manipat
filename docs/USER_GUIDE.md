# ManipAT User Guide

ManipAT is an offline-first, deterministic generator for original DAT Perceptual Ability Test (PAT) practice material. It generates all six PAT categories, validates them mathematically, renders printable HTML/SVG exams, and can turn a generated exam into a self-contained portable study exam with answers, explanations, and optional interactive hints.

> ManipAT is an independent practice-content generator and engineering project. It is not an official DAT product and is not affiliated with the American Dental Association or any test administrator.

For architecture and implementation details, see [`DESIGN.md`](DESIGN.md). For portable-runtime internals, see [`PORTABLE_VIEWER.md`](PORTABLE_VIEWER.md). For printable answer/solution behavior, see [`SOLUTIONS.md`](SOLUTIONS.md).

---

# 1. What ManipAT Generates

| CLI category | Common name | Default full-set count | Interactive study view |
|---|---|---:|---|
| `aperture` | Apertures / Keyhole | 15 | Three.js 3D |
| `view-recognition` | TFE / View Recognition | 15 | Three.js 3D |
| `angle` | Angle Discrimination | 15 | No 3D hint; canonical 2D task |
| `paper-folding` | Paper Folding / Hole Punching | 15 | all-steps SVG + fold/unfold animation |
| `cube-counting` | Cube Counting | 15 | Three.js voxel view |
| `form-development` | Spatial Relations / Form Development | 15 | Three.js folded-solid view |

The default profile contains 15 questions per category for a **90-question PAT set**.

ManipAT now has three complementary artifacts/surfaces:

| Artifact | Command | Purpose |
|---|---|---|
| Canonical printable exam | `pnpm dat generate ...` | exam-like practice, printing/PDF |
| Development/debug viewer | `pnpm dat:view` / `pnpm dat:view:dev` | renderer/runtime debugging on localhost |
| Portable study exam | `pnpm dat:view:portable exam.html` | original exam + answers/explanations/interactive hints in one offline file |

---

# 2. Requirements and Installation

Requirements:

- Node.js 22+
- pnpm 10.x
- macOS/Linux/another Node-capable system

The repository declares pnpm `10.15.1`.

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
pnpm build
```

Run the environment self-test:

```bash
pnpm dat doctor
```

`doctor` checks Node, Manifold, Three.js basics, deterministic randomness, SVG generation, write access, and the offline fetch guard.

---

# 3. Five-Minute Quick Start

Generate a complete 90-question exam:

```bash
pnpm dat generate set \
  --workers 3 \
  --seed exam-001 \
  --difficulty 3 \
  --offline \
  --output ./output/exam-001.html
```

Open it directly:

```bash
open ./output/exam-001.html
```

Validate every embedded question independently:

```bash
pnpm dat validate ./output/exam-001.html
```

Create the portable study version:

```bash
pnpm dat:view:portable ./output/exam-001.html
open ./output/exam-001.interactive.html
```

The portable file contains the **original exam**, not just the interactive runtime.

---

# 4. Canonical Printable Exam

`pnpm dat generate ...` writes a self-contained HTML exam containing:

- cover page;
- section directions;
- deterministic question pages;
- embedded SVG prompts/choices;
- shared Cube Counting figures where applicable;
- blank Answer Sheet;
- embedded canonical question JSON (`manipat-exam-data`);
- Letter portrait print CSS;
- no external web assets.

The canonical HTML remains the authoritative scored/print artifact.

## 4.1 Correct answers are hidden by default

Normal generation behaves like an exam:

```bash
pnpm dat generate set \
  --seed exam-001 \
  --solutions none \
  --offline \
  --output ./output/exam-001.html
```

`none` is the default, so `--solutions none` may be omitted.

The last exam page is a **blank Answer Sheet**, not an answer key.

## 4.2 Printable Answer Key

```bash
pnpm dat generate set \
  --seed exam-001 \
  --solutions key \
  --offline \
  --output ./output/exam-001-key.html
```

This appends an **Answer Key** after the blank Answer Sheet.

## 4.3 Printable full solutions

```bash
pnpm dat generate set \
  --seed exam-001 \
  --solutions full \
  --offline \
  --output ./output/exam-001-solutions.html
```

This appends:

```text
Blank Answer Sheet
→ Answer Key
→ Solutions & Explanations
```

Explanations are generated from the same canonical structured data that established the answer; they are not inferred from rendered SVG pixels.

`--include-explanations` remains supported as a backward-compatible alias for `--solutions full`.

## 4.4 Answer Sheet printing

For the standard PAT-size exam (up to 90 questions), the Answer Sheet has a dedicated **single-Letter-page print layout**. The screen version can use slightly roomier spacing; print CSS compacts the row height/gaps and prevents browser print rounding from spilling the last rows onto another sheet.

Custom exams above 90 questions are not force-clipped into one page.

Recommended print settings:

1. Letter paper.
2. Scale 100% / Actual Size.
3. Disable browser headers/footers.
4. Use zero/none browser-added margins if the browser offers that choice; the document defines its own page geometry.
5. Check Print Preview before Save as PDF / physical printing.

---

# 5. Generating Sets and Categories

## 5.1 Default 90-question set

```bash
pnpm dat generate set \
  --workers 3 \
  --seed practice-001 \
  --difficulty 3 \
  --offline \
  --output ./output/practice-001.html
```

## 5.2 One category

```bash
pnpm dat generate category aperture \
  --count 15 \
  --difficulty 4 \
  --seed aperture-001 \
  --offline \
  --output ./output/aperture-001.html
```

## 5.3 Several categories

```bash
pnpm dat generate categories \
  --categories aperture,tfe,paper \
  --count 5 \
  --difficulty 3 \
  --seed mixed-001 \
  --offline \
  --output ./output/mixed-001.html
```

## 5.4 Category aliases

| Canonical | Accepted CLI aliases |
|---|---|
| `aperture` | `aperture`, `keyhole` |
| `view-recognition` | `view-recognition`, `tfe` |
| `angle` | `angle`, `angles` |
| `paper-folding` | `paper-folding`, `paper` |
| `cube-counting` | `cube-counting`, `cubes` |
| `form-development` | `form-development`, `form` |

## 5.5 Different counts by category

Repeat `--category-count`:

```bash
pnpm dat generate categories \
  --categories aperture,tfe,angle,paper,cubes,form \
  --category-count aperture=10 \
  --category-count view-recognition=10 \
  --category-count angle=5 \
  --category-count paper-folding=5 \
  --category-count cube-counting=6 \
  --category-count form-development=4 \
  --seed custom-counts \
  --offline \
  --output ./output/custom-counts.html
```

Counts must be positive integers.

---

# 6. Difficulty Control

Bands:

```text
1 beginner
2 easy
3 medium
4 hard
5 expert
```

Use a fixed band:

```bash
--difficulty 4
```

or name:

```bash
--difficulty hard
```

Use a range:

```bash
--difficulty 2-4
```

Use an exact weighted mix:

```bash
--difficulty-mix 1:1,2:2,3:4,4:2,5:1
```

Per-category overrides are repeatable:

```bash
pnpm dat generate set \
  --difficulty 3 \
  --category-difficulty aperture=5 \
  --category-difficulty view-recognition=4 \
  --category-difficulty paper-folding=2-4 \
  --seed category-difficulty-001 \
  --offline \
  --output ./output/category-difficulty-001.html
```

Difficulty changes actual source/problem parameters (model complexity, projection information, angle spacing, fold count, voxel structure, net complexity, distractor closeness). It is not merely a label.

The current bands are engineering heuristics rather than empirically calibrated psychometric scores.

---

# 7. Seeds and Reproducibility

Use meaningful stable seeds:

```bash
--seed week03-fullset-a
```

Given the same code revision and configuration, generation is deterministic. Intentional algorithm changes can change output across revisions, so archive the Git commit SHA alongside long-lived exam artifacts.

For debugging, `DEBUG_PAT_SEED` can provide a default root seed when `--seed` is absent. An explicit CLI seed wins.

---

# 8. Offline Mode

Normal/reproducible generation should use:

```bash
--offline
```

This installs a rejecting `globalThis.fetch` guard. The generator does not require network access, and canonical exam HTML has no external scripts/styles/fonts/images.

The generated portable study exam is also self-contained after generation.

---

# 9. Worker Threads

Use:

```bash
--workers 3
```

for mixed-category generation.

Each worker has its own engine/Manifold context. Result ordering remains deterministic. For a six-category set, 2–4 workers is a practical starting point; actual performance depends on hardware and difficulty/model mix.

---

# 10. Development / Debug Viewer

Use the localhost viewer while working on runtime rendering:

```bash
pnpm dat:view ./output/exam-001.html
```

or explicitly:

```bash
pnpm dat:view:dev ./output/exam-001.html
```

Open:

```text
http://127.0.0.1:4173/
```

This mode intentionally serves ordinary browser modules and is preferable for DevTools/source debugging.

Category examples:

```bash
pnpm dat:view:dev ./output/exam-001.html --category aperture
pnpm dat:view:dev ./output/exam-001.html --category tfe
pnpm dat:view:dev ./output/exam-001.html --category paper
pnpm dat:view:dev ./output/exam-001.html --category cubes
pnpm dat:view:dev ./output/exam-001.html --category form
```

Development reconstruction check without starting WebGL:

```bash
pnpm dat:view ./output/exam-001.html --category aperture --dry-run
```

---

# 11. Portable Study Exam

Create a standalone study companion from the canonical exam:

```bash
pnpm dat:view:portable ./output/exam-001.html
```

Default output:

```text
./output/exam-001.interactive.html
```

Custom name:

```bash
pnpm dat:view:portable ./output/exam-001.html \
  --output ./output/exam-001-study.html
```

Open it directly; no localhost server is required:

```bash
open ./output/exam-001.interactive.html
```

## 11.1 What is preserved

The portable study file retains:

- original cover;
- original question/choice pages;
- original blank Answer Sheet;
- original embedded canonical question JSON;
- original print layout.

It adds screen-only Study Tools.

## 11.2 Study Tools

Open the floating **Study Tools** button.

For any selected question you can use:

- **Check Answer** — reveal/hide the canonical correct answer;
- **Show Explanation** — reveal the structured explanation (and answer);
- **Interactive Hint** — optional visual exploration where supported.

The question selector plus Previous/Next can also scroll the exam to the selected item.

Interactive hints start collapsed because immediately exposing a rotatable model, target view, hidden lines, or folding animation can substantially reduce the perceptual challenge.

## 11.3 Interactive behavior by category

| Category | Hint behavior |
|---|---|
| Aperture | Explore in 3D; camera presets, Color Code/Ghost/Surface/Edges where supported |
| TFE | Explore in 3D; canonical orthographic/target controls |
| Angle | no interactive hint; remains 2D |
| Paper Punching | Explore folding; all-steps overview + interactive forward/reverse/rewind timeline |
| Cube Counting | voxel view with Surface/Edges/Ghost and explanation highlighting |
| Form Development | folded-solid 3D exploration |

Paper controls include:

```text
Previous step
Next step
Play
Pause
0.5× / 1× / 2×
```

The timeline runs forward folds → punch → reverse unfolds → solved state → rewind.

## 11.4 Portable filters

```bash
pnpm dat:view:portable ./output/exam-001.html --category aperture
pnpm dat:view:portable ./output/exam-001.html --category paper
pnpm dat:view:portable ./output/exam-001.html --question-id <question-id>
```

Important: these filters limit **interactive hint payloads**. They do **not** remove the other canonical exam pages or their answer/explanation data from the study file.

## 11.5 Printing portable output

Study UI is hidden by print CSS. Print Preview should show the underlying canonical exam, not the Study Tools drawer/modal.

For authoritative printing, the original `exam.html` is still preferred.

---

# 12. Why Portable Works Without a Server

The development viewer uses a server because normal browser ES-module trees have origin/MIME/relative-import constraints under `file://`.

The portable packer instead embeds the required compiled module graph:

```text
ManipAT runtime
Three.js
OrbitControls
question payloads
study UI
```

Modules are encoded as `data:` JavaScript URLs and connected with an inline import map. Relative imports are rewritten to synthetic specifiers. The study file therefore does not fetch `/runtime/*`, `/vendor/three/*`, or CDN assets.

---

# 13. Validation

Validate a generated exam later from its embedded data:

```bash
pnpm dat validate ./output/exam-001.html
```

The command reconstructs the unified engine and reruns category validators. Validation is mathematical/semantic rather than image-recognition based.

Typical checks include uniqueness, topology, solver consistency, fold validity, support/connectivity, non-overlapping nets, line/fingerprint validity, and correct answer index consistency.

---

# 14. Inspecting and Regenerating Questions

Create a diagnostic inspection page:

```bash
pnpm dat inspect ./output/exam-001.html \
  --output ./output/exam-001-inspect.html
```

The inspector exposes visual assets plus structured data such as seed, template, fingerprints, validation, difficulty and explanation metadata.

Regenerate a candidate from seed/type:

```bash
pnpm dat regenerate \
  --type aperture \
  --seed my-seed \
  --difficulty 5
```

Optional narrowing:

```bash
--question-id <exact-id>
--template <template-id>
```

---

# 15. Config Files

Example:

```json
{
  "seed": "practice-config-001",
  "output": "./output/practice-config-001.html",
  "difficulty": "2-4",
  "offline": true,
  "solutions": "full",
  "categories": {
    "aperture": { "count": 10, "difficulty": 4 },
    "view-recognition": { "count": 10, "difficulty": "3-5" },
    "angle": 5,
    "paper-folding": 5,
    "cube-counting": 6,
    "form-development": 4
  },
  "formats": ["html"]
}
```

Run:

```bash
pnpm dat generate config --config ./practice-config.json
```

Recognized config fields include:

- `seed`
- `output`
- `difficulty`
- `categories`
- per-category `count` / `difficulty`
- `formats`
- `offline`
- `solutions`: `none | key | full`
- legacy `includeExplanations: true` → full solutions
- `includeMeshes` (recognized but persisted mesh output is intentionally rejected)

Standalone generation currently supports HTML output only.

---

# 16. Profiles

Default profile:

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

Use another profile:

```bash
pnpm dat generate set \
  --profile ./profiles/my-profile.json \
  --seed profile-001 \
  --offline \
  --output ./output/profile-001.html
```

---

# 17. Progress, Benchmark and Utility Commands

Suppress generation progress:

```bash
--quiet
```

Machine-readable generation statistics:

```bash
--json-progress
```

List public names:

```bash
pnpm dat list categories
pnpm dat list difficulties
pnpm dat list profiles
```

Benchmark deterministic category generation:

```bash
pnpm dat benchmark
```

Environment/runtime checks:

```bash
pnpm dat doctor
```

---

# 18. Development and Verification

Core local checks:

```bash
pnpm build
pnpm lint
pnpm test
```

The repository treats ESLint warnings as failures.

CI additionally runs a full 90-question offline worker smoke, a printable `--solutions full` smoke, a portable 90-question study-exam smoke, hard-band category smokes, and artifact upload.

For geometry/rendering changes, tests are necessary but not sufficient. Also generate fixed-seed HTML and visually inspect it.

For portable/runtime changes compare:

```bash
pnpm dat:view:dev ./output/three-review.html
```

against:

```bash
pnpm dat:view:portable ./output/three-review.html
open ./output/three-review.interactive.html
```

For print changes, inspect browser **Print Preview**, not only the normal screen page simulation.

---

# 19. Recommended Manual Review Checklist

## Canonical exam

- all six category layouts are legible;
- no clipped SVGs/lines;
- TFE visible/hidden lines are coherent;
- Paper fold panels/reference outlines read correctly;
- Cube shared figures are grouped correctly;
- Form choices look closed;
- **90-question Answer Sheet stays on exactly one printed Letter page**;
- optional Answer Key/Solutions append after the blank Answer Sheet.

## Portable study exam

- original exam pages are still present;
- Answer Sheet remains present;
- Study Tools opens/closes cleanly;
- Previous/Next/question selector target the expected question;
- Check Answer and Show Explanation work across representative categories;
- Angle disables the interactive hint;
- 3D hints open the selected Aperture/TFE/Cube/Form question;
- Paper opens the selected all-in-one folding walkthrough;
- camera presets/orbit/pan/zoom work;
- Color Code/Ghost/Surface/Edges behave as expected;
- no viewer-module network request occurs;
- Print Preview hides Study Tools and the hint modal.

---

# 20. Troubleshooting

## `pnpm dat` cannot find compiled files

```bash
pnpm build
```

## Geometry/Manifold failure

```bash
pnpm dat doctor
node --version
pnpm install --frozen-lockfile
pnpm build
```

Preserve seed/category/difficulty for reproducible failures.

## Generated exam validates but looks visually wrong

Validation proves mathematical/structural invariants, not every visual-quality property. Record:

- seed;
- question ID;
- category;
- difficulty;
- template ID;
- screenshot/generated HTML.

Use `pnpm dat inspect` and turn the defect into a fixed-seed regression when possible.

## Answer Sheet prints on two pages

Make sure you are on the current build/branch and regenerated the HTML after building. The current renderer gives ≤90-question Answer Sheets a print-only single-page layout.

Then check:

- Letter, not A4;
- 100% / Actual Size;
- browser headers/footers off;
- no extension/user stylesheet altering print CSS;
- current Chrome/Edge/Safari/Firefox.

If the current 90-question artifact still splits, preserve the HTML plus browser/version/print-preview screenshot; that should be treated as a print-layout regression.

## Portable file opens but interactive hint does not render

First compare development mode:

```bash
pnpm dat:view:dev ./output/exam-001.html
```

Then regenerate portable output after `pnpm build`. Check the browser console for module/WebGL errors and confirm the file was produced by `dat:view:portable`, not copied from an older branch.

## Output differs after a code update

Determinism is scoped to the same implementation revision and inputs. Archive generated HTML and commit SHA for long-lived regression corpora.

---

# 21. Current Limitations

- HTML is the canonical generated format; native PDF export is not implemented.
- difficulty is heuristic rather than psychometrically calibrated;
- persisted mesh output is disabled;
- Paper Folding truth uses a discrete 4×4 layer model;
- browser/printer visual regression is not yet fully automated;
- portable Study Tools are a self-contained learning aid, not an LMS/account/analytics platform;
- real WebGL and physical print behavior still benefit from manual browser review.

---

# 22. Useful Command Reference

```bash
# Build / verify
pnpm build
pnpm lint
pnpm test
pnpm dat doctor

# Full clean exam
pnpm dat generate set --workers 3 --seed exam-001 --offline \
  --output ./output/exam-001.html

# Printable answer key
pnpm dat generate set --seed exam-001 --offline --solutions key \
  --output ./output/exam-001-key.html

# Printable full solution manual
pnpm dat generate set --seed exam-001 --offline --solutions full \
  --output ./output/exam-001-solutions.html

# Development viewer
pnpm dat:view:dev ./output/exam-001.html

# Portable study exam
pnpm dat:view:portable ./output/exam-001.html

# Portable hint payload limited to Paper
pnpm dat:view:portable ./output/exam-001.html --category paper

# Validate
pnpm dat validate ./output/exam-001.html

# Inspect
pnpm dat inspect ./output/exam-001.html --output ./output/inspect.html

# Reproduce candidate
pnpm dat regenerate --type aperture --seed debug-seed --difficulty 5
```

---

# 23. Documentation Map

- [`../README.md`](../README.md) — project overview and quick start.
- [`USER_GUIDE.md`](USER_GUIDE.md) — this operational guide.
- [`DESIGN.md`](DESIGN.md) — current architecture, invariants and implementation details.
- [`SOLUTIONS.md`](SOLUTIONS.md) — printable answer/solution modes.
- [`PORTABLE_VIEWER.md`](PORTABLE_VIEWER.md) — portable study packaging and runtime delivery.
- [`THREE_RUNTIME.md`](THREE_RUNTIME.md) — Three.js/runtime contract.
- [`INTERACTIVE_LEARNING.md`](INTERACTIVE_LEARNING.md) — runtime learning controls and Paper walkthrough behavior.
- [`dev/`](dev/) — historical requirements, research and implementation specifications.

If documentation disagrees with executable behavior, the current code and tests are authoritative; update docs in the same change that updates behavior.
