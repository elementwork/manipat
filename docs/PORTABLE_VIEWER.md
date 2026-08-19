# ManipAT Portable Interactive Viewer

ManipAT has two interactive viewer modes that consume the same canonical persisted question data and the same `@manipat/renderer-three` runtime.

| Mode | Command | Best for | Requires local server after generation? |
|---|---|---|---|
| Development / debug | `pnpm dat:view` or `pnpm dat:view:dev` | coding, source inspection, fast iteration, browser debugging | Yes |
| Portable | `pnpm dat:view:portable` | sharing, offline review, opening from Finder/Explorer, archived study material | No |

The printable exam remains a third, separate artifact. It stays static, script-free, deterministic, and optimized for printing/PDF.

## Quick start

Generate the canonical exam first:

```bash
pnpm dat generate set \
  --seed exam-001 \
  --offline \
  --output ./output/exam-001.html
```

### Development / debug viewer

```bash
pnpm dat:view:dev ./output/exam-001.html
```

`pnpm dat:view` is retained as the shorter backwards-compatible alias.

The CLI reconstructs the selected interactive payloads and serves them at:

```text
http://127.0.0.1:4173/
```

This mode keeps JavaScript modules as ordinary files and serves:

```text
/runtime/*
/vendor/three/*
/vendor/three/addons/*
```

Use this mode when working on Three.js scenes, controls, camera logic, payloads, or browser UI because browser DevTools can inspect the real module files directly.

### Portable viewer

```bash
pnpm dat:view:portable ./output/exam-001.html
```

Default output:

```text
./output/exam-001.interactive.html
```

Open that file directly in a browser. No Node.js process, localhost server, CDN, or network access is required after the file has been created.

Choose an explicit output path:

```bash
pnpm dat:view:portable ./output/exam-001.html \
  --output ./output/exam-001-shareable.html
```

The same selection filters are available:

```bash
pnpm dat:view:portable ./output/exam-001.html --category aperture
pnpm dat:view:portable ./output/exam-001.html --category tfe
pnpm dat:view:portable ./output/exam-001.html --category paper
pnpm dat:view:portable ./output/exam-001.html --category cubes
pnpm dat:view:portable ./output/exam-001.html --category form
pnpm dat:view:portable ./output/exam-001.html --question-id <question-id>
```

## Why the development viewer still uses a server

Ordinary browser ES-module trees are normally loaded by URL. A local `file://` page cannot reliably fetch a tree such as:

```text
three.module.js
  → ./three.core.js

question-viewer.js
  → ./runtime-viewer.js
  → three/addons/controls/OrbitControls.js
```

The development server gives those modules a normal HTTP origin, MIME types, and predictable relative-module resolution. It is the right architecture for debugging.

The portable viewer solves a different problem: distribution.

## Portable packaging architecture

ManipAT does **not** maintain a second copy of the viewer runtime and does not use a separate geometry implementation for portable output.

At generation time, the portable packer:

1. resolves the compiled `@manipat/renderer-three` package;
2. starts at `question-viewer.js`;
3. recursively reads its JavaScript dependency graph;
4. includes Three.js and `OrbitControls` from the installed `three` package;
5. rewrites relative module specifiers such as `./scene.js` to deterministic synthetic specifiers;
6. converts every JavaScript module to an embedded `data:text/javascript;base64,...` URL;
7. creates an inline import map from those synthetic specifiers to the data URLs;
8. embeds the selected question payloads into the same HTML document.

Conceptually:

```text
canonical persisted exam
        ↓
selected questions
        ↓
runtime payload reconstruction
        ↓
shared viewer HTML
        +
embedded module graph
  ├── ManipAT renderer runtime
  ├── Three.js
  └── OrbitControls
        ↓
exam-001.interactive.html
```

There are no runtime requests to `/runtime/*`, `/vendor/three/*`, a CDN, or another local file.

## Why use an import map instead of maintaining a custom bundle

The repository intentionally avoids adding another bundler dependency just for portable output.

The portable packer works directly from the compiled ES modules already verified by the development viewer. That has several advantages:

- one runtime implementation;
- no additional build tool or lockfile dependency;
- no generated bundle checked into source control;
- Three.js version stays exactly aligned with `@manipat/renderer-three`;
- portable packaging failures are detectable as module-graph closure failures;
- development and portable rendering remain behaviorally aligned.

Relative imports inside `data:` modules are rewritten because `data:` URLs are not hierarchical and therefore cannot resolve `./module.js` by themselves.

## Artifact responsibilities

### Printable exam HTML

`pnpm dat generate ...`

Authoritative for:

- scored PAT presentation;
- printable SVGs;
- answer choices;
- answer sheet;
- deterministic pagination;
- Save as PDF.

It intentionally contains no interactive viewer runtime.

### Development viewer

`pnpm dat:view` / `pnpm dat:view:dev`

Authoritative for:

- runtime development;
- browser debugging;
- source-level inspection;
- rapid UI and Three.js iteration.

### Portable interactive viewer

`pnpm dat:view:portable`

Authoritative for:

- shareable interactive study artifact;
- offline review after generation;
- opening directly from the filesystem;
- demonstrations where Node.js should not be required on the viewing machine.

None of the three artifacts changes mathematical answer truth.

## Output size

A portable viewer is intentionally larger than the development HTML because it contains its JavaScript runtime and Three.js modules directly in the file. The module graph is embedded once per portable HTML artifact, not once per question.

For a complete PAT set this tradeoff is acceptable: portability is more important than minimizing a local HTML file by a few megabytes.

## Security and portability boundaries

The portable viewer:

- performs no network fetches for viewer code;
- embeds selected runtime payloads using the same HTML escaping used by the development viewer;
- embeds JavaScript modules as base64 data URLs;
- rewrites only known module classes: ManipAT runtime-relative imports, `three`, and `three/addons/*`;
- rejects an unexpected external/bare module dependency rather than silently linking to the network;
- keeps printable exam generation unchanged.

If a future runtime dependency introduces another browser package, portable packaging must explicitly support and test that package rather than falling back to a CDN.

## Testing contract

Node/Vitest tests verify that portable generation:

- discovers the runtime module graph;
- embeds the ManipAT question viewer;
- embeds Three.js;
- embeds `OrbitControls`;
- removes server-only `/runtime` and `/vendor/three` imports;
- rewrites relative imports inside embedded modules;
- writes the default `.interactive.html` sibling path;
- produces a nontrivial standalone artifact.

GitHub Actions continues to run the normal build, zero-warning lint, unit/fuzz suite, full 90-question generation, and hard-band smoke tests.

A browser visual pass is still required before release because Node tests do not create a real WebGL context.

## Manual validation checklist

After building the branch:

```bash
pnpm build
pnpm dat:view:portable ./output/three-review.html
```

Open:

```text
./output/three-review.interactive.html
```

Verify at minimum:

1. the page opens directly from the filesystem;
2. Aperture and TFE 3D objects render;
3. OrbitControls rotate/pan/zoom normally;
4. Front/Top/End presets work;
5. Color Code and Ghost work;
6. Cube Counting Surface/Edges/Ghost work;
7. Paper Punching overview and forward/reverse/rewind animation work;
8. Form Development renders;
9. Previous/Next and category filtering work;
10. browser DevTools Network shows no viewer-module network dependency.

Then compare the same exam using development mode:

```bash
pnpm dat:view:dev ./output/three-review.html
```

The visual behavior should match apart from the transport/package mechanism.
