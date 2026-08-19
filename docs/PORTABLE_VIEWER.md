# ManipAT Portable Study Exam

ManipAT has three complementary HTML/runtime surfaces. They use the same canonical persisted questions and never introduce a second source of answer truth.

| Surface | Command | Primary purpose | Server required while viewing? |
|---|---|---|---|
| Canonical printable exam | `pnpm dat generate ...` | exam-like practice, printing/PDF | No |
| Development/debug viewer | `pnpm dat:view` or `pnpm dat:view:dev` | renderer/runtime development | Yes |
| Portable study exam | `pnpm dat:view:portable <exam.html>` | complete exam plus answer, explanation, and optional interactive study tools | No |

## 1. Generate the canonical exam

```bash
pnpm dat generate set \
  --seed exam-001 \
  --offline \
  --output ./output/exam-001.html
```

By default this remains an exam artifact: questions, choices, a blank Answer Sheet, and embedded canonical question data. Correct answers are not exposed on the question pages.

### Printable solution modes

Use `--solutions` when a printable answer appendix is wanted:

```bash
# Current/default exam behavior
pnpm dat generate set --seed exam-001 --offline \
  --solutions none --output ./output/exam-001.html

# Append an Answer Key
pnpm dat generate set --seed exam-001 --offline \
  --solutions key --output ./output/exam-001-key.html

# Append Answer Key + category-specific Solutions & Explanations
pnpm dat generate set --seed exam-001 --offline \
  --solutions full --output ./output/exam-001-solutions.html
```

`--include-explanations` is retained as a backward-compatible alias for `--solutions full`.

The solution renderer consumes only existing canonical question fields such as `correctChoiceIndex` and each category's structured `explanation`. It does not re-solve from SVG pixels and does not maintain a separate answer database.

## 2. Development/debug viewer

```bash
pnpm dat:view:dev ./output/exam-001.html
```

`pnpm dat:view` remains the shorter alias.

Open:

```text
http://127.0.0.1:4173/
```

This mode intentionally serves ordinary ES modules under `/runtime/*`, `/vendor/three/*`, and `/vendor/three/addons/*`. It is the preferred surface for source-level browser debugging, WebGL inspection, and rapid renderer/UI iteration.

## 3. Portable study exam

```bash
pnpm dat:view:portable ./output/exam-001.html
```

Default output:

```text
./output/exam-001.interactive.html
```

Open that file directly from Finder/Explorer or with a browser. After generation, no Node.js process, localhost server, CDN, or internet connection is required.

The portable artifact is **not a viewer-only replacement for the exam**. It starts from the exact canonical exam HTML and augments it:

```text
canonical exam HTML
  ├── cover
  ├── all question/choice pages
  ├── blank Answer Sheet
  └── embedded canonical question JSON
        +
portable study layer
  ├── Study Tools drawer
  ├── Check Answer
  ├── Show Explanation
  └── one reusable all-in-one Interactive Hint viewer
```

Therefore a user can work through the real exam first and reveal help only when needed.

## 4. Study Tools UX

A floating **Study Tools** button opens a side drawer. The drawer has one global question selector plus Previous/Next navigation.

For the selected question:

- **Check Answer** reveals the canonical correct choice;
- **Show Explanation** reveals the category-specific structured explanation and also reveals the answer;
- **Interactive Hint** opens the existing all-in-one interactive runtime in a large overlay and jumps it to that question.

The interactive hint remains optional and collapsed by default because immediately exposing a rotatable object, orthographic views, hidden lines, or fold animation can materially reduce the perceptual task.

### Category behavior

| Category | Answer/explanation | Interactive hint |
|---|---|---|
| Aperture | Yes | Explore in 3D |
| TFE / View Recognition | Yes | Explore in 3D |
| Angle Discrimination | Yes | Disabled; canonical 2D task |
| Paper Punching | Yes | Explore folding using the current all-in-one overview + walkthrough |
| Cube Counting | Yes | Explore in 3D |
| Form Development | Yes | Explore in 3D |

The all-in-one runtime is reused rather than creating one WebGL context per question. The study shell sends the selected question ID to the embedded viewer so it can jump to the matching payload.

## 5. Selection filters

The portable CLI accepts filters:

```bash
pnpm dat:view:portable ./output/exam-001.html --category aperture
pnpm dat:view:portable ./output/exam-001.html --category paper
pnpm dat:view:portable ./output/exam-001.html --question-id <question-id>
```

These filters limit which questions receive an **interactive hint payload**. They do not remove the canonical exam pages, answers, or explanations from the portable study artifact.

This permits smaller study files when only one interactive category or one debug item is needed while preserving the full source exam.

## 6. Portable module packaging

ManipAT does not maintain a second renderer implementation and does not require a separate bundler dependency for portable output.

At generation time the packer:

1. resolves the compiled `@manipat/renderer-three` package;
2. starts from `question-viewer.js`;
3. recursively discovers its JavaScript dependency graph;
4. includes Three.js and `OrbitControls` from the installed `three` dependency;
5. rewrites relative imports to deterministic synthetic module specifiers;
6. converts every required JavaScript module to a `data:text/javascript;base64,...` URL;
7. creates an inline import map;
8. embeds the resulting all-in-one viewer HTML inside the study exam as iframe `srcdoc` content.

There are no runtime requests to `/runtime/*`, `/vendor/three/*`, a CDN, or neighboring local JavaScript files.

Unexpected bare/external module dependencies are rejected instead of silently becoming network dependencies.

## 7. Printing

The portable study controls are screen-only. The injected drawer, launcher, and interactive-hint modal are hidden by `@media print`.

For authoritative printing/PDF, the original canonical `exam.html` remains preferred. Printing the portable study exam should nevertheless present the underlying canonical exam without the study UI.

If a printed answer appendix is desired, generate the canonical exam with:

```bash
--solutions key
```

or:

```bash
--solutions full
```

## 8. Verification contract

Automated tests verify:

- solution mode `none` preserves current exam behavior;
- `key` appends an Answer Key;
- `full` appends Answer Key plus explanations;
- all six category explanation renderers consume canonical explanation data;
- the portable output retains the original Answer Sheet and embedded `manipat-exam-data`;
- Study Tools, Check Answer, Show Explanation, and Interactive Hint are injected;
- the embedded runtime module graph is closed and self-contained;
- Three.js and OrbitControls are embedded;
- server-only `/runtime` and `/vendor/three` dependencies are absent;
- a real generated 90-question exam can be converted to the portable study artifact in CI.

A real-browser visual/WebGL pass remains necessary because Node tests do not create a production browser WebGL context.

## 9. Manual validation checklist

After building the branch:

```bash
pnpm build
pnpm dat:view:portable ./output/three-review.html
open ./output/three-review.interactive.html
```

Verify:

1. the original cover, questions, choices, and Answer Sheet are present;
2. Study Tools opens without disturbing the exam layout;
3. its question selector/Previous/Next select the intended question;
4. Check Answer shows the expected canonical answer;
5. Show Explanation displays useful category-specific text;
6. Angle has no 3D hint;
7. Aperture/TFE/Cube/Form open the interactive 3D viewer at the selected question;
8. Paper opens the all-in-one folding overview/walkthrough at the selected question;
9. OrbitControls, camera presets, Color Code/Ghost/Surface/Edges and category explanation controls behave as before;
10. closing/reopening the hint does not create multiple visible viewers;
11. browser Network does not fetch viewer modules;
12. Print Preview hides Study Tools and the interactive overlay.

For comparison, launch the development viewer:

```bash
pnpm dat:view:dev ./output/three-review.html
```

The nested interactive runtime should behave the same in both modes; only the surrounding study-exam UX and delivery mechanism differ.
