# CI verification

This document records what the pipeline in `.github/workflows/ci.yml` actually
gates, why the test gate is split, and how to reproduce every result locally.

## Jobs

| Job | Command | Blocking |
|---|---|---|
| `Lint (changed files)` | `npx eslint <changed>` + `npx prettier --check <changed>` | yes |
| `Run Tests (mandatory suite)` | `npx vitest run $(cat ci/mandatory.txt)` (cwd `tests/`) | yes |
| `Full Suite (regression gate)` | `npx vitest run` + `node ci/compare-baseline.mjs` | yes, on unbaselined failures only |
| `Build Application` | `npm run build` | yes |
| `Build CLI` | `npm run build` in `cli/` | yes |
| `Build Docker Image` | `docker build` + `/api/health` must return 200 | yes |
| `Security Scan` | `npm audit --audit-level=high` + TruffleHog | yes |

The `Dependency Review` job was removed: the action requires the GitHub
Dependency Graph, which is not enabled on this repository, so it could not
produce a valid result here. The mandatory dependency gate is
`npm audit --audit-level=high` (with a JSON report), which runs and passes.

There is no `continue-on-error` and no `|| true` on any gate.

## Why two test jobs

The repository's full suite is intentionally not all-green upstream: `CLAUDE.md`
documents roughly 4.2k tests with pre-existing failures (platform-specific temp
directories, live-network tests without credentials, a test importing a `cloud/`
worker that is not part of this repository).

Hiding that with `continue-on-error` would make every failure invisible. Instead:

1. **`tests/ci/mandatory.txt`** lists 32 files (510 tests) covering the surface
   this pipeline guarantees: authentication, SSRF/peer-trust guards, credential
   and key access, combo routing, the translator contract, and CLI artefacts.
   They must pass unconditionally.
2. **`tests/ci/known-failures.json`** enumerates the pre-existing failures.
   The full-suite job fails if any failure is not listed there, so existing debt
   stays visible but new regressions cannot land. Adding an entry is a reviewed
   change, not a blanket suppression.

Regenerate the baseline deliberately:

```bash
cd tests
npx vitest run --reporter=json --outputFile=full-suite.json
node ci/generate-known-failures.mjs full-suite.json ci/known-failures.json
git diff tests/ci/known-failures.json   # review every added entry
```

## Why Vitest runs from `tests/`

`tests/vitest.config.js` supplies the `@/` → `src/` and `open-sse` aliases.
Running `npx vitest` from the repository root does not discover that config, so
every aliased import fails with `ERR_MODULE_NOT_FOUND` and the report lands
outside the checkout. Both test steps therefore set `working-directory: tests`.

## Lint scope

The repository carries ~147 pre-existing ESLint errors and ~2.6k files that
Prettier would reformat. Gating all of them would freeze unrelated work, so the
mandatory gate is changed files only. The repo-wide ESLint result is still
uploaded as the `eslint-full-report` artefact and summarised in the job page, so
the backlog remains measurable.

## Security scanning

* `npm audit --audit-level=high` is mandatory. The JSON report is generated with
  the same threshold, so the report step cannot fail the job on its own.
* TruffleHog scans the PR range (`base.sha..head.sha`) or the full history on a
  push. `--fail` is not repeated in `extra_args` because the action passes it
  itself; repeating it aborts the step with `flag 'fail' cannot be repeated`.
* Snyk was **removed**, not silenced: the repository has no `SNYK_TOKEN`, so the
  step could never produce a real result.

## Reproducing locally

```bash
npm ci
cd tests && npm ci

npx vitest run $(cat ci/mandatory.txt)                  # mandatory gate
npx vitest run --reporter=json --outputFile=full-suite.json
node ci/compare-baseline.mjs full-suite.json ci/known-failures.json

cd .. && npm run build
cd cli && npm run build

docker build -t flagshiprouter:local .
docker run --rm -d --name fr-ci -p 20128:20128 \
  -e DATA_DIR=/tmp/test-data -e JWT_SECRET=test-secret \
  -e INITIAL_PASSWORD=test-password flagshiprouter:local
curl -fsS http://localhost:20128/api/health    # {"ok":true}
```

## Lockfiles

`package-lock.json` is committed at the root, in `tests/` and in `cli/`. Both
`.gitignore` files previously excluded them, which made `npm ci` and the
`setup-node` npm cache fail immediately (`Dependencies lock file is not found`).
