# Predent Integration Runtime

ManipAT is consumed by Predent as a **local, pinned library**, not as an online service.

## Boundary

The supported application-integration surface is `runtime/`, whose package identity is `@manipat/runtime`. The runtime wraps the canonical `packages/question-bank` engine and deliberately separates active-client presentation data from trusted scoring data.

```text
Predent repository
  vendor/manipat/            pinned Git submodule commit
    runtime/                 @manipat/runtime
    packages/...             canonical ManipAT engine internals

Predent server
  -> imports vendor/manipat/runtime/dist/index.js
  -> generates and validates locally
  -> persists trusted private record server-side
  -> returns only PublicPatQuestion to the browser
```

There is no ManipAT HTTP endpoint, hosted generation service, or runtime network dependency.

## Upgrade model

Predent pins one exact ManipAT Git commit through its submodule. Updating ManipAT does not change a deployed Predent build until Predent deliberately updates that pointer and passes its integration/regression tests.

Recommended upgrade sequence:

1. Change and validate ManipAT independently.
2. Merge/release the desired ManipAT revision.
3. Update Predent's `vendor/manipat` submodule pointer to that exact revision.
4. Rebuild the ManipAT runtime inside Predent's build.
5. Run Predent type checks, server tests, PAT integration tests, production build, and visual regression corpus.
6. Deploy only after those gates pass.

## Runtime API

```ts
const runtime = await createPatRuntime();

const generated = await runtime.generateQuestion({
  type: "aperture",
  seed: "server-owned-seed",
  difficulty: 4,
});
```

The important split is:

- `generated.publicQuestion`: safe active-question payload for a browser.
- `generated.privateRecord`: server-only provenance, answer, and solution data.

`PublicPatQuestion` excludes:

- canonical seed
- canonical question id
- correct choice index
- solution/explanation
- solver result
- validator internals
- fingerprints/provenance

Predent should assign its own opaque `instanceId` and persist the private record before issuing the public payload.

## Geometry startup

`createPatEngine()` no longer initializes Manifold eagerly. Aperture and View Recognition lazily initialize the memoized Manifold kernel on first use. Angle Ranking, Paper Folding, Cube Counting, and Form Development can start without paying the 3D kernel initialization cost.

## Versioning

Two versions are independently recorded:

- `MANIPAT_RUNTIME_VERSION` — API/runtime package version.
- `MANIPAT_QUESTION_SCHEMA_VERSION` — persisted public/private question record schema.

Canonical questions also carry their `engineVersion`. Predent should persist all three relevant values with immutable question instances so historical attempts remain attributable after future upgrades.

## Security invariant

Never send `PrivatePatQuestionRecord` to an active testing client. Scoring is server-authoritative. Explanations and the correct answer may be returned only after the product mode allows answer disclosure.
