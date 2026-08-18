# ManipAT User Guide

ManipAT is an offline-first, deterministic generator for original DAT Perceptual Ability Test (PAT) practice material. It can generate a complete 90-question printable PAT set or selected categories, validate generated questions mathematically, reproduce questions from seeds, and inspect the structured data and SVG assets behind a question.

> **Project status:** ManipAT is a practice-content generator and engineering project. It is not an official DAT product and is not affiliated with the American Dental Association or any test administrator.

This guide is for people who want to **use** ManipAT. For the current architecture, algorithms, category implementations, engineering decisions, and roadmap, see [`DESIGN.md`](DESIGN.md). The original build specification and research material remain under [`docs/dev/`](dev/).

---

## 1. What ManipAT Generates

ManipAT implements all six PAT families:

| CLI category | Common name | Default full-set count | What is generated |
|---|---|---:|---|
| `aperture` | Apertures / Keyhole | 15 | Pictorial 3D object plus five candidate apertures |
| `view-recognition` | TFE / View Recognition | 15 | Two orthographic views plus four choices for the missing view |
| `angle` | Angle Discrimination | 15 | Four angles plus four ordering choices |
| `paper-folding` | Paper Folding | 15 | Fold sequence, punch state, and five unfolded hole patterns |
| `cube-counting` | Cube Counting | 15 | Shared cube figures with painted-face counting questions |
| `form-development` | Spatial Relations / Form Development | 15 | Flat net plus four candidate folded solids |

The default profile is [`profiles/default-full-set.json`](../profiles/default-full-set.json) and contains 15 questions from each category, for **90 total questions**.

A generated standalone HTML exam contains:

- a cover page;
- PAT section directions;
- printable question pages;
- embedded SVG artwork;
- deterministic question data embedded as JSON;
- shared Cube Counting figures where appropriate;
- a separate answer sheet;
- Letter-sized print styling;
- no external web assets.

Because the SVG and question data are embedded, the resulting HTML file can be copied to another machine and opened without a server.

---

## 2. Requirements

ManipAT currently targets:

- **Node.js 22 or newer**;
- **pnpm 10.x**;
- macOS, Linux, or another environment capable of running Node and the Manifold WebAssembly package.

The repository declares pnpm `10.15.1` as its package manager.

Check your versions:

```bash
node --version
pnpm --version
```

If pnpm is not already installed, Corepack can normally activate the repository-declared package manager:

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
```

---

## 3. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/elementwork/manipat.git
cd manipat
pnpm install
```

Build the TypeScript workspace:

```bash
pnpm build
```

Run the environment self-test:

```bash
pnpm dat doctor
```

`doctor` checks the major runtime dependencies and invariants, including:

- Node version;
- Manifold initialization and basic solid validity;
- Three.js instanced rendering support;
- deterministic random generation;
- SVG generation;
- write access to a temporary directory;
- the offline network guard.

A successful run prints JSON with `"passed":true`.

---

## 4. Five-Minute Quick Start

Generate a complete 90-question set:

```bash
pnpm dat generate set \
  --seed exam-001 \
  --difficulty 3 \
  --offline \
  --output ./output/exam-001.html
```

Open it on macOS:

```bash
open ./output/exam-001.html
```

On Linux, use your normal browser opener, for example:

```bash
xdg-open ./output/exam-001.html
```

Validate the generated questions independently:

```bash
pnpm dat validate ./output/exam-001.html
```

The validation command reads the embedded question data and reruns the category-specific mathematical validators. A successful result contains:

```json
{
  "passed": true,
  "questionCount": 90
}
```

The actual output also contains per-question validation results.

---

## 5. Command Overview

The CLI entry point is exposed through:

```bash
pnpm dat <command>
```

Current commands are:

| Command | Purpose |
|---|---|
| `generate` | Generate a full set, one category, several categories, or a config-defined set |
| `validate` | Re-run mathematical validation on generated HTML or persisted question data |
| `inspect` | Create a human-readable HTML inspection page for a question |
| `regenerate` | Regenerate a question directly from seed/type/difficulty |
| `benchmark` | Measure average generation time for each category |
| `doctor` | Verify the local runtime and core dependencies |
| `list` | List categories, difficulty names, or profiles |

You can quickly confirm the supported names with:

```bash
pnpm dat list categories
pnpm dat list difficulties
pnpm dat list profiles
```

---

# 6. Generating Practice Material

## 6.1 Generate the default 90-question PAT set

```bash
pnpm dat generate set \
  --seed practice-2026-001 \
  --difficulty 3 \
  --offline \
  --output ./output/practice-2026-001.html
```

`generate set` loads the default profile unless another profile is supplied. The current default profile requests 15 questions in every category.

### Recommended full-set command

For normal use, worker threads improve throughput because categories can have independent Manifold contexts:

```bash
pnpm dat generate set \
  --workers 3 \
  --seed practice-2026-001 \
  --difficulty 3 \
  --offline \
  --output ./output/practice-2026-001.html
```

Using more than six workers is generally unnecessary for a six-category set because category batches are the natural parallel units.

---

## 6.2 Generate one category

Generate 15 Aperture questions:

```bash
pnpm dat generate category aperture \
  --count 15 \
  --difficulty 3 \
  --seed keyhole-001 \
  --offline \
  --output ./output/keyhole-001.html
```

Generate five hard TFE questions:

```bash
pnpm dat generate category view-recognition \
  --count 5 \
  --difficulty 4 \
  --seed tfe-hard-001 \
  --offline \
  --output ./output/tfe-hard-001.html
```

Generate Paper Folding by its short alias:

```bash
pnpm dat generate category paper \
  --count 10 \
  --difficulty 3 \
  --seed paper-001 \
  --offline \
  --output ./output/paper-001.html
```

---

## 6.3 Category aliases

The CLI accepts these aliases:

| Canonical category | Accepted aliases |
|---|---|
| `aperture` | `aperture`, `keyhole` |
| `view-recognition` | `view-recognition`, `tfe` |
| `angle` | `angle`, `angles` |
| `paper-folding` | `paper-folding`, `paper` |
| `cube-counting` | `cube-counting`, `cubes` |
| `form-development` | `form-development`, `form` |

The canonical category names are stored in generated question data.

---

## 6.4 Generate several categories

Generate five questions from Aperture, TFE, and Paper Folding:

```bash
pnpm dat generate categories \
  --categories aperture,tfe,paper \
  --count 5 \
  --difficulty 3 \
  --seed mixed-001 \
  --offline \
  --output ./output/mixed-001.html
```

The `--count` value applies to every category named in `--categories` unless a category-specific count override is supplied.

---

## 6.5 Different counts by category

`--category-count` can be supplied more than once:

```bash
pnpm dat generate categories \
  --categories aperture,tfe,angle,paper,cubes,form \
  --category-count aperture=10 \
  --category-count view-recognition=10 \
  --category-count angle=5 \
  --category-count paper-folding=5 \
  --category-count cube-counting=6 \
  --category-count form-development=4 \
  --difficulty 3 \
  --seed custom-counts-001 \
  --offline \
  --output ./output/custom-counts-001.html
```

All counts must be positive integers.

---

# 7. Difficulty Control

ManipAT uses five requested difficulty bands:

| Band | Name |
|---:|---|
| 1 | beginner |
| 2 | easy |
| 3 | medium |
| 4 | hard |
| 5 | expert |

You can use either the number or the name:

```bash
--difficulty 5
```

or:

```bash
--difficulty expert
```

Difficulty changes actual generation parameters. It is not merely a label. For example, higher bands may select more complex object templates, smaller angle differences, larger/more irregular cube structures, more informative orthographic views, or more complex nets/fold sequences depending on the category.

---

## 7.1 Fixed difficulty

```bash
pnpm dat generate category aperture \
  --count 10 \
  --difficulty 5 \
  --seed aperture-expert \
  --offline \
  --output ./output/aperture-expert.html
```

---

## 7.2 Difficulty ranges

A range cycles deterministically through the included bands as questions are accepted:

```bash
--difficulty 2-4
```

Example:

```bash
pnpm dat generate category angle \
  --count 12 \
  --difficulty 2-4 \
  --seed angle-range-001 \
  --offline \
  --output ./output/angle-range-001.html
```

This uses bands 2, 3, and 4 in deterministic sequence.

---

## 7.3 Weighted difficulty mixes

For a controlled distribution, use `--difficulty-mix` with positive integer weights:

```bash
--difficulty-mix 1:1,2:2,3:4,4:2,5:1
```

Example:

```bash
pnpm dat generate set \
  --difficulty-mix 1:1,2:2,3:4,4:2,5:1 \
  --workers 3 \
  --seed balanced-001 \
  --offline \
  --output ./output/balanced-001.html
```

ManipAT converts these weights into **exact integer quotas per category** using a largest-remainder allocation. This matters for Cube Counting because several questions can intentionally share one figure; the batch scheduler caps the shared group so a group cannot overshoot the remaining quota for the selected difficulty band.

For example, a requested 10-question category with `2:1,4:1` will be allocated exactly five band-2 and five band-4 questions rather than approximately matching the ratio.

---

## 7.4 Per-category difficulty

You can override the global difficulty for individual categories:

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

Each category override can be a single band or a range.

---

# 8. Seeds and Reproducibility

The seed is a first-class part of ManipAT's generation contract.

```bash
--seed my-practice-set-001
```

Given the same:

- ManipAT version/code revision;
- root seed;
- category/count configuration;
- difficulty configuration;
- generation mode;

ManipAT is designed to produce the same accepted question data and SVG output.

Internally, generation uses a seeded Xoshiro128** random source. Subsystems fork deterministic namespaces instead of consuming a single fragile global random stream. This makes changes in one sub-operation less likely to perturb unrelated random choices.

### Use meaningful seeds

Good seeds are easy to archive and reproduce:

```text
week03-fullset-a
aperture-expert-2026-08-18
student-demo-004
regression-paper-017
```

### Environment override

For debugging, `DEBUG_PAT_SEED` can provide the root seed when `--seed` is omitted:

```bash
DEBUG_PAT_SEED=debug-017 pnpm dat generate category aperture \
  --count 1 \
  --difficulty 5 \
  --offline \
  --output ./output/debug-017.html
```

An explicit `--seed` takes precedence.

---

# 9. Offline Mode

For normal generation, use:

```bash
--offline
```

Example:

```bash
pnpm dat generate set \
  --seed offline-001 \
  --offline \
  --output ./output/offline-001.html
```

The CLI installs a guard that rejects `globalThis.fetch`. The generator does not require network access, and the standalone exam HTML does not reference external scripts, stylesheets, fonts, or images.

This makes offline mode useful for:

- deterministic CI;
- exam generation on restricted systems;
- verifying that accidental network dependencies have not entered the generation path.

---

# 10. Worker Threads and Performance

Use `--workers N` to generate category batches in worker threads:

```bash
pnpm dat generate set \
  --workers 3 \
  --seed workers-001 \
  --difficulty 4 \
  --offline \
  --output ./output/workers-001.html
```

Requirements:

- `N` must be a positive integer;
- each worker initializes its own engine/Manifold context;
- result order remains category-configuration order;
- worker failures are propagated to the parent process.

The worker orchestration waits for both a returned result and a successful worker exit. A worker that exits without returning data is treated as an error rather than leaving generation waiting indefinitely.

For a normal six-category full set, `--workers 2` to `--workers 4` is a reasonable starting range. Actual performance depends on CPU, WebAssembly performance, and the category/difficulty mix.

---

# 11. Output and Printing

The current standalone output format is HTML:

```bash
--output ./output/exam.html
```

The filename must end in `.html`.

The generated document is intended for **Letter portrait** printing. It contains print-specific CSS with deterministic page breaks.

### Recommended print workflow

1. Open the generated HTML in a modern Chromium, Chrome, Edge, Safari, or Firefox browser.
2. Use the browser's Print command.
3. Select Letter paper.
4. Use 100% / actual size unless your printer requires a small fit adjustment.
5. Disable browser-added headers and footers if they appear.
6. Print directly or choose **Save as PDF**.

The HTML itself remains the canonical generated artifact because it retains the embedded question data used by `validate` and inspection tooling.

---

# 12. Validating Generated Material

Validation is mathematical, not image-recognition based.

Run:

```bash
pnpm dat validate ./output/exam-001.html
```

The command:

1. reads the embedded questions;
2. recreates the unified PAT engine;
3. dispatches every question to its category validator;
4. reruns category-specific solver/invariant checks;
5. reports the result as canonical JSON;
6. exits with a validation error code if any question fails.

The validators check different invariants depending on category. Examples include:

- exactly one correct answer;
- unique choices;
- nondegenerate SVG/geometry;
- valid TFE line fingerprints and line lengths;
- effective Paper Folding folds and valid unfolded hole positions;
- connected/supported Cube Counting structures;
- valid Form Development nets and sufficient geometric separation among distractors.

### Validate after copying or archiving an exam

Because the question data is embedded, validation can be rerun later:

```bash
pnpm dat validate /path/to/archive/exam-001.html
```

This is useful when generated files are used as durable fixtures.

---

# 13. Inspecting a Question

`inspect` creates a diagnostic HTML page containing the question's visual assets and structured JSON.

Inspect the first question in an exam file:

```bash
pnpm dat inspect ./output/exam-001.html \
  --output ./output/exam-001-inspect.html
```

The inspection page includes:

- prompt and choice SVG assets;
- question ID;
- answer index;
- validation state;
- seed;
- template ID/version;
- recipe and metadata;
- fingerprints;
- difficulty components;
- structured explanation data.

### Inspect a specific stored question ID

When working with persisted question data rather than a standalone exam, provide the ID plus an input location:

```bash
pnpm dat inspect aperture-0123456789abcdef \
  --input ./question-bank \
  --output ./output/aperture-debug.html
```

The CLI sanitizes imported question IDs before using them in a default output filename and escapes imported strings used in inspection HTML.

---

# 14. Regenerating a Question from a Seed

Use `regenerate` when you know the generation seed and category:

```bash
pnpm dat regenerate \
  --type aperture \
  --seed my-seed \
  --difficulty 5
```

The regenerated question is written as serialized JSON to stdout unless `--output` is supplied:

```bash
pnpm dat regenerate \
  --type tfe \
  --seed my-seed \
  --difficulty 4 \
  --output ./output/regenerated.jsonl
```

For grouped generators such as Cube Counting, up to three candidates may be generated from the shared seed. You can constrain selection further:

```bash
--question-id <exact-id>
```

and/or:

```bash
--template <template-id>
```

Example:

```bash
pnpm dat regenerate \
  --type cubes \
  --seed cube-debug-seed \
  --difficulty 4 \
  --question-id cube-figure-abcdef-faces-3 \
  --output ./output/cube-debug.jsonl
```

If the seed does not produce a candidate matching the requested ID/template, regeneration fails rather than silently returning a different question.

---

# 15. Configuration Files

For repeatable workflows, use a JSON config file.

Example `practice-config.json`:

```json
{
  "seed": "practice-config-001",
  "output": "./output/practice-config-001.html",
  "difficulty": "2-4",
  "offline": true,
  "categories": {
    "aperture": {
      "count": 10,
      "difficulty": 4
    },
    "view-recognition": {
      "count": 10,
      "difficulty": "3-5"
    },
    "angle": 5,
    "paper-folding": 5,
    "cube-counting": 6,
    "form-development": 4
  },
  "formats": ["html"]
}
```

Run it with:

```bash
pnpm dat generate config \
  --config ./practice-config.json
```

The config schema currently supports:

- `seed`;
- `output`;
- `difficulty`;
- `categories`;
- per-category `count` and `difficulty`;
- `formats`;
- `offline`;
- `includeExplanations` as a reserved/config field;
- `includeMeshes` as a recognized field, although persisted mesh output is currently rejected.

Standalone generation currently supports only:

```json
"formats": ["html"]
```

Mesh persistence is intentionally not enabled yet; use the runtime Three.js-compatible rendering API for interactive mesh visualization.

---

# 16. Profiles

A profile is a simple category-count preset.

The default profile is:

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

Use a custom profile:

```bash
pnpm dat generate set \
  --profile ./profiles/my-profile.json \
  --seed custom-profile-001 \
  --difficulty 3 \
  --offline \
  --output ./output/custom-profile-001.html
```

A profile needs a `categories` object with valid category names and counts.

---

# 17. Progress Output

Normal generation prints accepted counts and rejection totals.

Suppress progress:

```bash
--quiet
```

Example:

```bash
pnpm dat generate category angle \
  --count 20 \
  --seed quiet-001 \
  --difficulty 3 \
  --offline \
  --quiet \
  --output ./output/quiet-001.html
```

For machine-readable generation statistics:

```bash
--json-progress
```

This writes canonical JSON statistics to stdout instead of the normal human-readable table.

---

# 18. Benchmarking

Run the built-in benchmark:

```bash
pnpm dat benchmark
```

The benchmark generates medium-difficulty questions with deterministic benchmark seeds and reports average milliseconds per category.

The current benchmark intentionally uses fewer TFE samples than the simpler categories because orthographic visibility computation is comparatively expensive.

Benchmark results are machine- and revision-dependent. Use them for regression detection rather than as universal performance numbers.

For serious performance work, record:

- Git commit SHA;
- Node version;
- CPU/model;
- operating system;
- category;
- difficulty;
- seed corpus;
- worker count.

---

# 19. Development Workflow

Install and build:

```bash
pnpm install
pnpm build
```

Lint:

```bash
pnpm lint
```

Run the complete test suite:

```bash
pnpm test
```

The project uses strict TypeScript and treats ESLint warnings as failures.

The CI verification workflow also performs:

```text
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test
full 90-question offline worker smoke generation
six difficulty-5 category smoke generations
```

For changes to generation geometry or SVG rendering, unit tests are necessary but not sufficient. Also generate representative HTML and visually inspect it at the intended print size.

---

# 20. Recommended Visual Regression Workflow

When changing a category, generate a small fixed-seed corpus before and after the change.

Example for Aperture:

```bash
pnpm dat generate category aperture \
  --count 10 \
  --difficulty 5 \
  --offline \
  --seed visual-aperture-regression \
  --output ./output/visual-aperture-regression.html
```

For TFE:

```bash
pnpm dat generate category view-recognition \
  --count 10 \
  --difficulty 5 \
  --offline \
  --seed visual-tfe-regression \
  --output ./output/visual-tfe-regression.html
```

For Paper Folding:

```bash
pnpm dat generate category paper-folding \
  --count 10 \
  --difficulty 5 \
  --offline \
  --seed visual-paper-regression \
  --output ./output/visual-paper-regression.html
```

For Spatial Relations:

```bash
pnpm dat generate category form-development \
  --count 10 \
  --difficulty 5 \
  --offline \
  --seed visual-form-regression \
  --output ./output/visual-form-regression.html
```

Inspect for:

- clipped or dangling line segments;
- incorrect hidden-line treatment;
- unclosed solids;
- visually duplicate distractors;
- text or SVG overflow;
- fold-state inconsistencies;
- tiny features that disappear at print scale;
- overly dense geometry that is technically valid but not exam-like.

---

# 21. Troubleshooting

## `pnpm dat` cannot find compiled files

Run:

```bash
pnpm build
```

The CLI runs the compiled `packages/cli/dist/index.js` entry point.

---

## Manifold initialization or geometry errors

First run:

```bash
pnpm dat doctor
```

Then confirm:

```bash
node --version
pnpm install --frozen-lockfile
pnpm build
```

For a reproducible generation failure, preserve the category, difficulty, and seed.

---

## Generation cannot reach the requested question count

The batch generator rejects invalid, ambiguous, or duplicate candidates. If the configured attempt budget is exhausted, it raises a generation-target error rather than returning too few questions.

Try:

1. reproduce with the same seed;
2. run the category alone;
3. inspect whether the failure occurs only at one difficulty;
4. run the test suite;
5. keep the seed for a regression test before modifying the generator.

Do not simply increase attempt limits until the underlying rejection reason is understood.

---

## Generated HTML opens but looks wrong when printed

Check:

- Letter paper rather than A4;
- browser headers/footers disabled;
- print scale around 100%;
- current browser version;
- no browser extension rewriting page CSS.

Also open the same HTML on screen before assuming the generator is at fault.

---

## A question looks visually suspicious but validates successfully

Mathematical validity and exam-quality visual grammar are related but different acceptance layers.

Use:

```bash
pnpm dat inspect <file-or-question>
```

Record:

- seed;
- category;
- difficulty;
- question ID;
- template ID;
- screenshot or generated HTML.

A visual defect should normally become a fixed-seed regression test or golden fixture before the renderer/generator is changed.

---

## Different output after a code update

Determinism is guaranteed within the same implementation revision and inputs, not necessarily across intentional algorithm changes.

If long-term cross-version reproducibility matters, archive:

- the generated standalone HTML;
- the Git commit SHA;
- seed/configuration;
- Node/pnpm versions if the artifact is part of a formal regression corpus.

The standalone HTML embeds the accepted question data and is therefore the best durable artifact for a generated exam.

---

# 22. Current Limitations

The current system is intentionally focused on deterministic PAT generation rather than a full study platform.

Notable limitations include:

- standalone generation currently emits HTML only;
- direct PDF export is not implemented by the CLI; use browser printing/Save as PDF;
- persisted meshes are not currently enabled;
- there is no student account/LMS layer;
- there is no adaptive-learning scheduler;
- difficulty bands are engineering heuristics, not yet empirically calibrated against a large student-performance dataset;
- automated mathematical tests cannot replace visual review of newly introduced geometry/rendering families;
- interactive Three.js support is a runtime/developer capability rather than a polished end-user application.

See [`DESIGN.md`](DESIGN.md#future-improvements) for the engineering roadmap.

---

# 23. Suggested Workflows

## Daily practice set

```bash
pnpm dat generate categories \
  --categories aperture,tfe,angle,paper,cubes,form \
  --count 3 \
  --difficulty 3-4 \
  --workers 3 \
  --seed daily-2026-08-18 \
  --offline \
  --output ./output/daily-2026-08-18.html
```

## Hard 3D-focused session

```bash
pnpm dat generate categories \
  --categories aperture,tfe,form \
  --count 10 \
  --difficulty 5 \
  --workers 3 \
  --seed hard-3d-session-001 \
  --offline \
  --output ./output/hard-3d-session-001.html
```

## Paper Folding practice

```bash
pnpm dat generate category paper-folding \
  --count 20 \
  --difficulty 2-4 \
  --seed paper-practice-001 \
  --offline \
  --output ./output/paper-practice-001.html
```

## CI/regression artifact

```bash
pnpm dat generate set \
  --workers 3 \
  --seed regression-full-set \
  --offline \
  --quiet \
  --output ./output/regression-full-set.html

pnpm dat validate ./output/regression-full-set.html
```

---

# 24. Documentation Map

Use the document that matches your task:

- [`../README.md`](../README.md) — project overview and quick start.
- [`USER_GUIDE.md`](USER_GUIDE.md) — this document; operating the CLI and generated exams.
- [`DESIGN.md`](DESIGN.md) — current architecture, algorithms, implementation details, challenges, fixes, and roadmap.
- [`dev/implementation_spec.md`](dev/implementation_spec.md) — original detailed implementation specification used to guide construction.
- [`dev/DAT_PAT_90Q_Format_Layout_AI_Agent_Spec.md`](dev/DAT_PAT_90Q_Format_Layout_AI_Agent_Spec.md) — PAT format/layout research and generation specification.
- [`dev/pat_research_reference.md`](dev/pat_research_reference.md) — research/reference material.
- [`dev/Perceptual_Ability_Test_Section_Instructions.pdf`](dev/Perceptual_Ability_Test_Section_Instructions.pdf) — stored PAT instruction reference used during format research.

If the documentation disagrees with executable behavior, **the current code and tests are authoritative**. Please update the relevant documentation in the same change that modifies behavior.
