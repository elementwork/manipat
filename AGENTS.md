# Repository Guidelines

## Project Structure & Module Organization

This project is a pnpm TypeScript monorepo for generating deterministic DAT Perceptual Ability Test content. Shared foundations belong in `packages/core`, `packages/geometry`, `packages/svg`, and `packages/renderer-three`. Keep question-family logic isolated in `packages/pat-*`; place storage and command-line functionality in `packages/question-bank` and `packages/cli`. Interactive tools live in `apps/`, while reusable geometry, question, and golden-SVG data belongs in `fixtures/`. Treat `docs/dev/implementation_spec.md` as the engineering authority and `docs/dev/pat_research_reference.md` as the domain reference.

## Build, Test, and Development Commands

- `pnpm install` installs all workspace dependencies.
- `pnpm build` compiles every package.
- `pnpm lint` runs the repository ESLint rules.
- `pnpm test` runs the Vitest suites.
- `pnpm dat generate --type aperture --count 100 --seed batch-001` creates a reproducible batch.
- `pnpm dat validate ./output/questions.jsonl` validates persisted questions.
- `pnpm dat inspect <question-id>` produces a local diagnostic artifact.
- `pnpm dat benchmark --suite geometry` runs performance benchmarks.

## Coding Style & Naming Conventions

Use strict TypeScript, ESM, two-space indentation, and ESLint-clean code. Name packages and directories in kebab-case, values and functions in camelCase, and types/classes in PascalCase. Avoid `any`, global mutable RNGs, and magic tolerances. Prefer pure math functions, immutable vector tuples, and exhaustive discriminated unions. Explicitly dispose of WASM and Three.js resources. Solvers must never call renderers.

## Testing Guidelines

Place `*.test.ts` files in each package's `test/` directory. Cover math with unit and property tests, generators with independent solver/validator checks, SVG with normalized golden fixtures, and procedural behavior with seeded fuzz tests. A generator returning output is not sufficient: accepted questions must be deterministic, renderable, unambiguous, and have exactly one valid answer.

## Commit & Pull Request Guidelines

Use short imperative commit subjects and group related changes logically. Pull requests should explain behavior, list verification commands, link relevant issues, and include screenshots or generated artifacts for visual changes.

## Agent Workflow & Safety

Before coding, read the specification, follow its implementation order, identify acceptance criteria, and test math-heavy changes first. Inspect generated artifacts before finishing. Derive correctness from geometry, topology, or discrete state—never pixels. Bound untrusted recipe complexity, review dependency licenses, and generate only original DAT-style content.
