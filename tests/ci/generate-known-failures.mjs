import fs from "fs";

const report = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const entries = [];

for (const suite of report.testResults) {
  const file = suite.name.replace(/^.*?tests[\\/]/, "").replace(/\\/g, "/");
  const failed = suite.assertionResults.filter((a) => a.status === "failed");

  if (failed.length === 0 && suite.status === "failed") {
    entries.push({
      file,
      test: "__suite__",
      reason: (suite.message || "suite failed before running tests")
        .split("\n")[0]
        .slice(0, 200),
    });
    continue;
  }

  for (const assertion of failed) {
    entries.push({
      file,
      test: assertion.fullName,
      reason: (assertion.failureMessages[0] || "unknown failure")
        .split("\n")[0]
        .slice(0, 200),
    });
  }
}

fs.writeFileSync(process.argv[3], JSON.stringify(entries, null, 2) + "\n");
console.log(
  `${entries.length} known failures across ${new Set(entries.map((e) => e.file)).size} files`,
);
