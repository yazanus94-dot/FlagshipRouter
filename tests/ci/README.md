# CI test policy

This directory holds the committed artefacts that make the FlagshipRouter test
gate reproducible instead of aspirational.

## `mandatory.txt` — the merge gate

A curated list of test files that must pass on every push and pull request.
They are the suites that cover the product surface we guarantee: authentication,
the SSRF/peer-trust guards, credential and key access, combo routing, the
translator contract, and the CLI build artefacts.

```bash
cd tests && npx vitest run $(cat ci/mandatory.txt)
```

Any failure here fails `Run Tests (mandatory suite)`. Nothing is retried,
skipped or masked.

## `known-failures.json` — the documented backlog

The repository's full suite (≈4.2k tests) still carries pre-existing failures
that predate this pipeline: platform-specific temp-directory errors, live-network
tests that need credentials, a test that imports a worker directory which is not
part of this repository, and catalogued upstream assertion failures.

They are recorded here **explicitly** rather than hidden with
`continue-on-error` or `|| true`.

## `compare-baseline.mjs` — the regression gate

The `Full Suite (regression gate)` job runs the whole suite, prints the counts
to the workflow summary, and fails if any failure is **not** listed in
`known-failures.json`. Existing debt stays visible; new regressions cannot land.

Regenerate the baseline only when you have deliberately decided a failure is
tolerable:

```bash
cd tests
npx vitest run --reporter=json --outputFile=../full-suite.json
node ci/generate-known-failures.mjs ../full-suite.json ci/known-failures.json
```

Review the diff before committing — every added entry is a promise that the
failure is understood.

## Lint policy

`ESLint` and `Prettier` gate **changed files only**, because the repository
carries ~147 pre-existing ESLint errors and ~2.6k unformatted files. The
repo-wide ESLint result is uploaded as an artefact and summarised in the job
page, so the backlog stays measurable without blocking unrelated work.

## Security scanning

`npm audit` (severity ≥ high) is mandatory, and TruffleHog scans the PR range or
the full history on `main`. Snyk was removed rather than kept behind
`continue-on-error`: the repository has no `SNYK_TOKEN`, so the step could never
produce a real result.
