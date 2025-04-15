/**
 * This script is used to run CSV-based tests for rules defined in a specified directory.
 * It reads CSV test files, converts them to scenarios, and runs these scenarios against the rules.
 * If any tests fail, an error is thrown with the details of the failed tests.
 * It is meant for running as part of the pipeline to ensure that the rules are working as expected.
 *
 * The script can be run in two modes:
 * 1. Run tests for all rules in a repo: If no specific rule path is provided as a command line argument,
 *    the script will find all CSV test files and run tests for all rules.
 * 2. Run tests for specified rules: If a comma-separated list of rule paths is provided as a
 *    command line argument, the script will run tests only for the specified rules.
 *
 * Command Line Arguments:
 * - argv[1]: The path to the rules repository.
 * - argv[2]: The rule path to test. If not provided, all rules in the repo will be tested.
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
import { RuleDataService } from './api/ruleData/ruleData.service';

interface CSVFilesForRule {
  testFilePath: string;
  testFiles: string[];
}

class CsvTestRunner {
  private ruleStats = { ruleCount: 0, testCount: 0, failedCount: 0 };
  private failedTests: string[] = [];

  private configService = new ConfigService({ RULES_DIRECTORY: '.' });
  private logger = new Logger();
  private documentsService = new DocumentsService(this.configService);
  private ruleDataService = new RuleDataService(null, null, this.documentsService, this.logger);
  private decisionService = new DecisionsService(this.ruleDataService, this.logger);
  private ruleMappingService = new RuleMappingService(this.ruleDataService);
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
    const rows = csv.split('\n');
    const result: string[][] = [];

    for (const row of rows) {
      if (!row.trim()) continue;

      const fields: string[] = [];
      let inQuotes = false;
      let currentField = '';

      for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
          if (inQuotes && row[i + 1] === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          fields.push(this.cleanQuotes(currentField));
          currentField = '';
        } else {
          currentField += char;
        }
      }
      fields.push(this.cleanQuotes(currentField));
      result.push(fields);
    }

    return result;
  }

  /**
   * Cleans quotes from a CSV field value
   * @param field - The CSV field value to clean
   * @returns The cleaned field value
   */
  cleanQuotes(field: string): string {
    field = field.trim();
    // Remove surrounding quotes
    if (field.startsWith('"') && field.endsWith('"')) {
      field = field.substring(1, field.length - 1);
    }
    return field;
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
   * @param testFilePath - The path to search for test files.
   * @returns An object containing the relative path and an array of file names.
   */
  getTestFilesAtRulePath(testFilePath: string): CSVFilesForRule {
    try {
      const testFiles = fs.readdirSync(testFilePath)?.filter((subfile) => {
        return fs.statSync(path.join(testFilePath, subfile)).isFile() && subfile.endsWith('.csv');
      });
      return { testFilePath, testFiles };
    } catch (error) {
      console.warn(testFilePath, error.message);
      return { testFilePath, testFiles: [] };
    }
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
   * @param ruleDir - The directory where the rule is stored.
   * @param testFilePath - The path of the rule.
   * @param testFile - The CSV test file to run scenarios for.
   * @returns A promise that resolves when the scenarios have been run.
   */
  public async runScenariosForCSVTestfile(ruleDir: string, testFilePath: string, testFile: string) {
    this.ruleStats.testCount++;
    const relativeFilePath = path.relative(`${ruleDir}/tests`, testFilePath);
    const fullTestFilePath = `${testFilePath}/${testFile}`;
    const testCSVFileContent = await fs.promises.readFile(fullTestFilePath, 'utf8');
    const testFileCSV: string[][] = this.convertCsvToArray(testCSVFileContent.trim());
    const csvScenarios = getScenariosFromParsedCSV(testFileCSV, relativeFilePath);
    const rulePath = `${relativeFilePath}.json`;
    const hasNoExpectedResults = csvScenarios.some((scenario) => scenario.expectedResults.length === 0);
    if (hasNoExpectedResults) {
      console.warn(`\tMissing expected results for file ${testFile}`);
    }
    const { allTestsPassed, csvContent } = await this.scenarioDataService.getCSVForRuleRun(
      `${ruleDir}/rules/${rulePath}`,
      null,
      ruleDir,
      csvScenarios,
    );
    console.info(
      `\tScenarios for file ${testFile}: ${allTestsPassed ? (hasNoExpectedResults ? chalk.yellow('PASSED WITH WARNING') : chalk.green('PASSED')) : chalk.red('FAILED')}`,
    );
    if (!allTestsPassed) {
      this.ruleStats.failedCount++;
      this.failedTests.push(`${testFilePath}/${testFile}`);
      console.error(`\t\tFailed CSV Content:\n${this.indentMultilineString(csvContent, 10)}`);
    }
    return allTestsPassed;
  }

  /**
   * Runs tests for a specified rule/path.
   * @param ruleDir - The directory where the rule is stored
   * @param testFilePath - The path of the rule.
   * @param files - The CSV test files to run.
   * @returns A promise that resolves when the tests have been run.
   */
  async runTestsForRule(ruleDir: string, testFilePath: string, files: string[]) {
    console.info(chalk.blue(`Running csv tests for rule ${testFilePath}...`));
    this.ruleStats.ruleCount++;
    await Promise.all(
      files.map(async (testFile) => {
        await this.runScenariosForCSVTestfile(ruleDir, testFilePath, testFile);
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
   * @param ruleRepoDir - The path to the rules repository
   * @param rulePathToTest - The path of the rule.
   */
  async runTestsForSpecifiedRulePath(ruleRepoDir: string, rulePathToTest?: string) {
    if (rulePathToTest) {
      if (rulePathToTest.startsWith('rules/')) {
        rulePathToTest = rulePathToTest.slice(6);
      }
      if (rulePathToTest.endsWith('.json')) {
        rulePathToTest = rulePathToTest.slice(0, -5);
      }
    }
    const { testFilePath, testFiles } = this.getTestFilesAtRulePath(`${ruleRepoDir}/tests/${rulePathToTest}`);
    if (!testFiles || testFiles.length === 0) {
      return;
    }
    await this.runTestsForRule(ruleRepoDir, testFilePath, testFiles);
  }

  /**
   * Test rules at specified paths
   * @param rulePathToTests - comma separated list of rule paths to test.
   */
  async runTestsForSpecifiedRulePaths(ruleRepoDir: string, rulePathsToTest?: string) {
    for (const rulePathToTest of rulePathsToTest.split(',')) {
      await this.runTestsForSpecifiedRulePath(ruleRepoDir, rulePathToTest);
    }
    this.showFinalTestResults();
    process.exit(0);
  }

  /**
   * Runs all rules by getting all paths that have CSV test files and running tests for each rule.
   */
  async runAllRules(ruleRepoDir: string) {
    // Gets all paths that have CSV test files in them
    const csvTestPaths = this.getTestPathsAndFiles(`${ruleRepoDir}/tests`);
    // Run tests for each rule
    for (const { testFilePath, testFiles } of csvTestPaths) {
      await this.runTestsForRule(ruleRepoDir, testFilePath, testFiles);
    }
    this.showFinalTestResults();
    process.exit(0);
  }

  /**
   * Main function to run the script.
   * @param argv - The command line arguments.
   */
  async main(argv: string[]) {
    // Get the rules repository path and the rule paths to test from the command line arguments
    const rulesRepoDirs = argv[2] || process.env.RULES_REPOSITORIES;
    const rulePathsToTest = argv[3];
    if (!rulesRepoDirs) {
      throw new Error('Rules repository path is required');
    }
    // For each rules repository path, run tests for the specified rule paths or all rules
    rulesRepoDirs.split(',').forEach(async (ruleRepoDir) => {
      // Run tests for the specified rule path if it exists, otherwise run all rules
      if (rulePathsToTest) {
        await this.runTestsForSpecifiedRulePaths(ruleRepoDir, rulePathsToTest);
      } else {
        await this.runAllRules(ruleRepoDir);
      }
    });
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  const runner = new CsvTestRunner();
  runner.main(process.argv);
}

export { CsvTestRunner };
