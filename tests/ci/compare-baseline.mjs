/**
 * Compares a Vitest JSON report against the committed known-failure baseline.
 *
 * The full FlagShipRouter suite contains pre-existing failures that are
 * documented in `known-failures.json` (platform-specific temp-dir issues,
 * live-network tests, an intentionally absent worker directory, and catalogued
 * upstream assertion failures). This gate fails only when the suite produces a
 * failure that is not already documented, so new regressions cannot slip
 * through while the existing backlog stays visible.
 *
 * Usage: node compare-baseline.mjs <vitest-report.json> [known-failures.json]
 */
import fs from "fs";
import path from "path";

const [, , reportPath, baselinePath = "known-failures.json"] = process.argv;

if (!reportPath) {
  console.error(
    "usage: node compare-baseline.mjs <vitest-report.json> [known-failures.json]",
  );
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const baseline = JSON.parse(
  fs.readFileSync(path.resolve(baselinePath), "utf8"),
);
const known = new Set(baseline.map((entry) => `${entry.file}::${entry.test}`));

const failures = [];
const tolerated = [];

for (const suite of report.testResults) {
  const file = suite.name.replace(/^.*?tests[\\/]/, "").replace(/\\/g, "/");
  const failed = suite.assertionResults.filter((a) => a.status === "failed");

  if (failed.length === 0 && suite.status === "failed") {
    const key = `${file}::__suite__`;
    (known.has(key) ? tolerated : failures).push(key);
    continue;
  }

  for (const assertion of failed) {
    const key = `${file}::${assertion.fullName}`;
    (known.has(key) ? tolerated : failures).push(key);
  }
}

const summary = [
  `Total tests: ${report.numTotalTests}`,
  `Passed: ${report.numPassedTests}`,
  `Failed: ${report.numFailedTests}`,
  `Skipped: ${report.numPendingTests}`,
  `Documented known failures: ${baseline.length}`,
  `Known failures observed in this run: ${tolerated.length}`,
  `New (unbaselined) failures: ${failures.length}`,
];

console.log(summary.join("\n"));

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    "## Full test suite (regression gate)",
    "",
    ...summary.map((l) => `- ${l}`),
    "",
  ];
  if (failures.length > 0) {
    lines.push(
      "### New failures",
      "",
      ...failures.map((f) => `- \`${f}\``),
      "",
    );
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
}

if (failures.length > 0) {
  console.error(`\nUnbaselined failures (${failures.length}):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("\nNo new failures relative to the documented baseline.");
