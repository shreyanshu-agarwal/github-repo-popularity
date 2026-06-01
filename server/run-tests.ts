import { runServerTests } from "./tests";

async function bootCliTestRunner() {
  console.log("\x1b[35m%s\x1b[0m", "\n=============================================");
  console.log("\x1b[35m%s\x1b[0m", "   RUNNING CHROMATIC POPULARITY TEST SUITE   ");
  console.log("\x1b[35m%s\x1b[0m", "=============================================\n");

  try {
    const suitesResult = await runServerTests();
    let overallPassed = true;

    for (const suite of suitesResult) {
      console.log(`\n\x1b[1mSuite: ${suite.name}\x1b[0m`);
      const statusColor = suite.passed ? "\x1b[32m[PASSED]\x1b[0m" : "\x1b[31m[FAILED]\x1b[0m";
      console.log(`Status: ${statusColor}`);

      for (const t of suite.results) {
        const itemStatus = t.passed ? "\x1b[32m✔\x1b[0m" : "\x1b[31m✘\x1b[0m";
        console.log(`  ${itemStatus} \x1b[90m${t.name}\x1b[0m`);
        if (t.message) {
          console.log(`     \x1b[33mMessage:\x1b[0m ${t.message}`);
        }
      }

      if (!suite.passed) {
        overallPassed = false;
      }
    }

    console.log("\x1b[35m%s\x1b[0m", "\n=============================================");
    if (overallPassed) {
      console.log("\x1b[32m%s\x1b[0m", "   SUCCESS: ALL TEST SUITES PASSED GREEN   ");
      console.log("\x1b[35m%s\x1b[0m", "=============================================\n");
      process.exit(0);
    } else {
      console.log("\x1b[31m%s\x1b[0m", "   FAILURE: ONE OR MORE SUITES FAILED   ");
      console.log("\x1b[35m%s\x1b[0m", "=============================================\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "\nFatal Exception during CLI Suite execution:", error);
    process.exit(1);
  }
}

bootCliTestRunner();
