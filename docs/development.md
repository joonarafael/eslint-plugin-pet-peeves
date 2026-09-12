# Development

> **Work in progress.** This document will grow as more internal conventions are documented.

## Setup

```sh
npm install
npm test
```

`npm run build` compiles the TypeScript source to JavaScript and declarations in `dist`.

Useful scripts:

- `npm test` — build, typecheck, and run tests
- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:check`

## Versioning

The `version` field in `package.json` is **not** updated manually in this repo.

It is set only by the [`publish`](../.github/workflows/publish.yml) CI workflow, right before publishing.

- On a `release` event, the version is derived from the associated Git tag (e.g. `v1.2.3`).
- On a manual `workflow_dispatch` run, the version comes from the `version` input.

In both cases, the workflow strips an optional leading `v`, validates the result matches `X.Y.Z` (integer.integer.integer), and then runs `npm pkg set version=X.Y.Z` before building, packing, and publishing.

Do not hand-edit `version` in `package.json` as part of a normal commit/PR — whatever value is committed is not what actually gets published.
