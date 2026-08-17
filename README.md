# ManipAT

ManipAT is a deterministic, geometry-first engine for generating original DAT Perceptual Ability Test questions. The project uses Manifold for mathematical 2D/3D truth, Three.js for interactive visualization, and a custom SVG layer for exam-style assets.

The repository implements all six PAT families: aperture, view recognition (TFE), angle discrimination, paper folding, cube counting, and form development. See [`docs/dev/implementation_spec.md`](docs/dev/implementation_spec.md) for the authoritative architecture and acceptance criteria.

## Development

Requirements: Node.js 22+ and pnpm 10.x.

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
```

Generate and validate a complete local set:

```bash
pnpm dat generate set --seed exam-001 --difficulty 3 --offline --output ./output/exam-001.html
pnpm dat validate ./output/exam-001.html
pnpm dat inspect ./output/exam-001.html --output ./output/exam-001-inspect.html
```

`generate set` writes one portable, Letter-sized printable HTML exam containing the full PAT set, embedded SVG artwork and question data. The document includes a cover page, section directions, deterministic page breaks, shared Cube Counting figures, and a separate answer sheet. Open the HTML locally and use the browser's Print command to print it directly or save it as PDF.

Use `--workers 2` (up to six is useful for mixed sets) to give each category an isolated Manifold worker context. `--quiet` suppresses progress and `--json-progress` emits machine-readable statistics. Set `DEBUG_PAT_SEED=<seed>` to reproduce a root generation seed.

## Workspace map

- `packages/core`, `geometry`, `svg`, and `renderer-three` provide shared foundations.
- `packages/pat-*` contain category-specific generators, solvers, validators, and renderers.
- `packages/question-bank` supplies the unified API, deduplication, workers, and persistence.
- `packages/cli` exposes the offline `dat-pat` command.
- `fixtures/` and package `test/` directories contain golden and seeded fuzz coverage.
