/**
 * This script is used to run CSV-based tests for rules defined in a specified directory.
 * It reads CSV test files, converts them to scenarios, and runs these scenarios against the rules.
 * If any tests fail, an error is thrown with the details of the failed tests.
 * It is meant for running as part of the pipeline to ensure that the rules are working as expected.
 *
 * The script can be run in two modes:
 * 1. Run tests for all rules: If no specific rule path is provided as a command line argument,
 *    the script will find all CSV test files and run tests for all rules.
 * 2. Run tests for specified rules: If a comma-separated list of rule paths is provided as a
 *    command line argument, the script will run tests only for the specified rules.
 *
 * Environment Variables:
 * - RULES_DIRECTORY: The directory where the rules are stored (default: 'brms-rules/rules').
 * - CSV_TESTS_DIRECTORY: The directory where the CSV test files are stored (default: 'brms-rules/tests').
 *
 * Command Line Arguments:
 * - rulePathsToTest: A comma-separated list of rule paths to test. If not provided, all rules will be tested.
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DecisionsService } from './api/decisions/decisions.service';
import { getScenariosFromParsedCSV } from './utils/csv';
import { RuleMappingService } from './api/ruleMapping/ruleMapping.service';
import { DocumentsService } from './api/documents/documents.service';
import { ScenarioDataService } from './api/scenarioData/scenarioData.service';

interface CSVFilesForRule {
  testFilePath: string;
  testFiles: string[];
}

const RULES_DIRECTORY = process.env.RULES_DIRECTORY || 'brms-rules/rules';
const CSV_TESTS_DIRECTORY = process.env.CSV_TESTS_DIRECTORY || 'brms-rules/tests';

class CsvTestRunner {
  private ruleStats = { ruleCount: 0, testCount: 0, failedCount: 0 };
  private failedTests: string[] = [];

  private configService = new ConfigService({ RULES_DIRECTORY });
  private logger = new Logger();
  private decisionService = new DecisionsService(this.configService, this.logger);
  private documentsService = new DocumentsService(this.configService);
  private ruleMappingService = new RuleMappingService(this.documentsService, this.configService);
  public scenarioDataService = new ScenarioDataService(
    this.decisionService,
    this.ruleMappingService,
    this.documentsService,
    null,
    this.logger,
  );

  /**
   * Converts a CSV string to a 2D array.
   * @param csv - The CSV string to convert.
   * @returns A 2D array representing the CSV content.
   */
  convertCsvToArray(csv: string): string[][] {
    return csv.split('\n').map((row) => row.split(','));
  }

  /**
   * Indents each line of a multiline string.
   * @param str - The string to indent.
   * @param indentLevel - The number of indent levels to apply.
   * @returns The indented string.
   */
  indentMultilineString(str: string, indentLevel: number): string {
    const indent = ' '.repeat(indentLevel * 2);
    return str
      .split('\n')
      .map((line) => indent + line)
      .join('\n');
  }

  /**
   * Retrieves the test files at a specified path.
   * @param filePath - The path to search for test files.
   * @returns An object containing the relative path and an array of file names.
   */
  getTestFilesAtRulePath(filePath: string): CSVFilesForRule {
    const testFiles = fs.readdirSync(filePath)?.filter((subfile) => {
      return fs.statSync(path.join(filePath, subfile)).isFile() && subfile.endsWith('.csv');
    });
    return { testFilePath: path.relative(CSV_TESTS_DIRECTORY, filePath), testFiles };
  }

  /**
   * Gets the paths and files for all CSV test files.
   * @param dir - The directory to search for CSV test files.
   * @returns An array of objects containing the path and files.
   */
  getTestPathsAndFiles(dir: string): CSVFilesForRule[] {
    let results: CSVFilesForRule[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        const subfolders = fs
          .readdirSync(fullPath)
          .filter((subfile) => {
            return fs.statSync(path.join(fullPath, subfile)).isDirectory();
          })
          .map((subfolder) => {
            const subfolderPath = path.join(fullPath, subfolder);
            return this.getTestFilesAtRulePath(subfolderPath);
          });
        results = results.concat(subfolders);
      }
    });
    return results;
  }

  /**
   * Runs scenarios for a specified CSV test file.
   * @param testFilePath - The path of the rule.
   * @param testFile - The CSV test file to run scenarios for.
   * @returns A promise that resolves when the scenarios have been run.
   */
  public async runScenariosForCSVTestfile(testFilePath: string, testFile: string) {
    this.ruleStats.testCount++;
    const fullTestFilePath = `${CSV_TESTS_DIRECTORY}/${testFilePath}/${testFile}`;
    const testCSVFileContent = await fs.promises.readFile(fullTestFilePath, 'utf8');
    const testFileCSV: string[][] = this.convertCsvToArray(testCSVFileContent);
    const csvScenarios = getScenariosFromParsedCSV(testFileCSV, testFilePath);
    const rulePath = `${testFilePath}.json`;
    const { allTestsPassed, csvContent } = await this.scenarioDataService.getCSVForRuleRun(
      rulePath,
      null,
      csvScenarios,
    );
    console.info(`\tScenarios for file ${testFile}: ${allTestsPassed ? chalk.green('PASSED') : chalk.red('FAILED')}`);
    if (!allTestsPassed) {
      this.ruleStats.failedCount++;
      this.failedTests.push(`${testFilePath}/${testFile}`);
      console.error(`\t\tFailed CSV Content:\n${this.indentMultilineString(csvContent, 10)}`);
    }
    return allTestsPassed;
  }

  /**
   * Runs tests for a specified rule/path.
   * @param rulePath - The path of the rule.
   * @param files - The CSV test files to run.
   * @returns A promise that resolves when the tests have been run.
   */
  async runTestsForRule(testFilePath: string, files: string[]) {
    console.info(chalk.blue(`Running csv tests for rule ${testFilePath}...`));
    this.ruleStats.ruleCount++;
    await Promise.all(
      files.map(async (testFile) => {
        await this.runScenariosForCSVTestfile(testFilePath, testFile);
      }),
    );
  }

  /**
   * Show CSV test results
   */
  showFinalTestResults() {
    const statsChalkFormatter = this.ruleStats.failedCount > 0 ? chalk.bgRed : chalk.bgGreen;
    console.info(
      statsChalkFormatter(
        `${this.ruleStats.ruleCount} rules tested, ${this.ruleStats.testCount} tests run, ${this.ruleStats.failedCount} failed`,
      ),
    );
    if (this.ruleStats.failedCount > 0) {
      throw new Error(`Tests failed: ${this.failedTests}`);
    }
  }

  /**
   * Test a rule at a specified path with the CSV test files there
   * @param rulePathToTest - The path of the rule.
   */
  async runTestsForSpecifiedRulePath(rulePathToTest?: string) {
    if (rulePathToTest) {
      if (rulePathToTest.startsWith('rules/')) {
        rulePathToTest = rulePathToTest.slice(6);
      }
      if (rulePathToTest.endsWith('.json')) {
        rulePathToTest = rulePathToTest.slice(0, -5);
      }
    }
    const { testFilePath, testFiles } = this.getTestFilesAtRulePath(`${CSV_TESTS_DIRECTORY}/${rulePathToTest}`);
    await this.runTestsForRule(testFilePath, testFiles);
  }

  /**
   * Test rules at specified paths
   * @param rulePathToTests - comma separated list of rule paths to test.
   */
  async runTestsForSpecifiedRulePaths(rulePathsToTest?: string) {
    for (const rulePathToTest of rulePathsToTest.split(',')) {
      await this.runTestsForSpecifiedRulePath(rulePathToTest);
    }
    this.showFinalTestResults();
    process.exit(0);
  }

  /**
   * Runs all rules by getting all paths that have CSV test files and running tests for each rule.
   */
  async runAllRules() {
    // Gets all paths that have CSV test files in them
    const csvTestPaths = this.getTestPathsAndFiles(CSV_TESTS_DIRECTORY);
    // Run tests for each rule
    await Promise.all(
      csvTestPaths.map(async ({ testFilePath, testFiles }) => {
        await this.runTestsForRule(testFilePath, testFiles);
      }),
    );
    this.showFinalTestResults();
    process.exit(0);
  }

  /**
   * Main function to run the script.
   * @param argv - The command line arguments.
   */
  async main(argv: string[]) {
    const rulePathsToTest = argv[2];

    // Run tests for the specified rule path if it exists, otherwise run all rules
    if (rulePathsToTest) {
      await this.runTestsForSpecifiedRulePaths(rulePathsToTest);
    } else {
      await this.runAllRules();
    }
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  const runner = new CsvTestRunner();
  runner.main(process.argv);
}

export { CsvTestRunner };
