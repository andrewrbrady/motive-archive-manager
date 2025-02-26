import { ESLint, Linter } from "eslint";
import chalk from "chalk";
import path from "path";

interface LintSummary {
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  files: number;
}

async function runLintAnalysis(fix: boolean = false): Promise<LintSummary> {
  const eslint = new ESLint({
    fix,
    // useEslintrc: true,
  });

  try {
    // Run ESLint
    const results = await eslint.lintFiles(["src/**/*.{js,jsx,ts,tsx}"]);

    if (fix) {
      await ESLint.outputFixes(results);
    }

    // Aggregate results
    const summary: LintSummary = results.reduce(
      (acc: LintSummary, result: ESLint.LintResult) => ({
        errorCount: acc.errorCount + result.errorCount,
        warningCount: acc.warningCount + result.warningCount,
        fixableErrorCount: acc.fixableErrorCount + result.fixableErrorCount,
        fixableWarningCount:
          acc.fixableWarningCount + result.fixableWarningCount,
        files: acc.files + 1,
      }),
      {
        errorCount: 0,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
        files: 0,
      }
    );

    // Print detailed results for files with issues
    results.forEach((result: ESLint.LintResult) => {
      if (result.messages.length > 0) {
        console.log(
          "\n" + chalk.underline(path.relative(process.cwd(), result.filePath))
        );
        result.messages.forEach((message: Linter.LintMessage) => {
          const messageType =
            message.severity === 2
              ? chalk.red("error")
              : chalk.yellow("warning");
          console.log(
            `  ${messageType} ${chalk.gray(
              `Line ${message.line}:${message.column}`
            )} - ${message.message} ${chalk.gray(`(${message.ruleId})`)}`
          );
        });
      }
    });

    return summary;
  } catch (error) {
    console.error("Error running ESLint:", error);
    throw error;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldFix = args.includes("--fix");

  console.log(chalk.blue("\nRunning ESLint analysis..."));

  const summary = await runLintAnalysis(shouldFix);

  console.log("\n" + chalk.bold("Summary:"));
  console.log(`Files checked: ${chalk.cyan(summary.files)}`);
  console.log(
    `Errors: ${chalk.red(summary.errorCount)} (${
      summary.fixableErrorCount
    } fixable)`
  );
  console.log(
    `Warnings: ${chalk.yellow(summary.warningCount)} (${
      summary.fixableWarningCount
    } fixable)`
  );

  if (shouldFix) {
    console.log(
      chalk.green("\nAutomatic fixes have been applied where possible.")
    );
  } else if (summary.fixableErrorCount > 0 || summary.fixableWarningCount > 0) {
    console.log(
      chalk.yellow("\nTip: Run with --fix to automatically fix some issues:")
    );
    console.log(chalk.gray("  npm run lint-check --fix"));
  }

  // Exit with error code if there are errors
  if (summary.errorCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
