import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DecisionsService } from './src/api/decisions/decisions.service';
import { getScenariosFromParsedCSV } from './src/utils/csv';
import { RuleMappingService } from './src/api/ruleMapping/ruleMapping.service';
import { DocumentsService } from './src/api/documents/documents.service';
import { ScenarioDataService } from './src/api/scenarioData/scenarioData.service';

interface CSVFilesForRule {
  testFilePath: string;
  testFiles: string[];
}

const RULES_DIRECTORY = process.env.RULES_DIRECTORY || 'brms-rules/rules';
const CSV_TESTS_DIRECTORY = process.env.CSV_TESTS_DIRECTORY || 'brms-rules/tests';

const ruleStats = { ruleCount: 0, testCount: 0, failedCount: 0 };
const failedTests: string[] = [];

// Initialize services needed to run scenarios
const configService = new ConfigService({ RULES_DIRECTORY });
const logger = new Logger();
const decisionService = new DecisionsService(configService, logger);
const documentsService = new DocumentsService(configService);
const ruleMappingService = new RuleMappingService(documentsService, configService);
const scenarioDataService = new ScenarioDataService(
  decisionService,
  ruleMappingService,
  documentsService,
  null,
  logger,
);

/**
 * Converts a CSV string to a 2D array.
 * @param csv - The CSV string to convert.
 * @returns A 2D array representing the CSV content.
 */
const convertCsvToArray = (csv: string): string[][] => {
  return csv.split('\n').map((row) => row.split(','));
};

/**
 * Indents each line of a multiline string.
 * @param str - The string to indent.
 * @param indentLevel - The number of indent levels to apply.
 * @returns The indented string.
 */
const indentMultilineString = (str: string, indentLevel: number): string => {
  const indent = ' '.repeat(indentLevel * 2);
  return str
    .split('\n')
    .map((line) => indent + line)
    .join('\n');
};

/**
 * Retrieves the test files at a specified path.
 * @param filePath - The path to search for test files.
 * @returns An object containing the relative path and an array of file names.
 */
const getTestFilesAtRulePath = (filePath: string): CSVFilesForRule => {
  const testFiles = fs.readdirSync(filePath).filter((subfile) => {
    return fs.statSync(path.join(filePath, subfile)).isFile();
  });
  return { testFilePath: path.relative(CSV_TESTS_DIRECTORY, filePath), testFiles };
};

/**
 * Gets the paths and files for all CSV test files.
 * @param dir - The directory to search for CSV test files.
 * @returns An array of objects containing the path and files.
 */
const getTestPathsAndFiles = (dir: string): CSVFilesForRule[] => {
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
          return getTestFilesAtRulePath(subfolderPath);
        });
      results = results.concat(subfolders);
    }
  });
  return results;
};

/**
 * Runs scenarios for a specified CSV test file.
 * @param testFilePath - The path of the rule.
 * @param testFile - The CSV test file to run scenarios for.
 * @returns A promise that resolves when the scenarios have been run.
 */
const runScenariosForCSVTestfile = async (testFilePath: string, testFile: string) => {
  ruleStats.testCount++;
  const fullTestFilePath = `${CSV_TESTS_DIRECTORY}/${testFilePath}/${testFile}`;
  const testCSVFileContent = await fs.promises.readFile(fullTestFilePath, 'utf8');
  const testFileCSV: string[][] = convertCsvToArray(testCSVFileContent);
  const csvScenarios = getScenariosFromParsedCSV(testFileCSV, testFilePath);
  const rulePath = `${testFilePath}.json`;
  const { allTestsPassed, csvContent } = await scenarioDataService.getCSVForRuleRun(rulePath, null, csvScenarios);
  console.info(`\tScenarios for file ${testFile}: ${allTestsPassed ? chalk.green('PASSED') : chalk.red('FAILED')}`);
  if (!allTestsPassed) {
    ruleStats.failedCount++;
    failedTests.push(`${testFilePath}/${testFile}`);
    console.error(`\t\tFailed CSV Content:\n${indentMultilineString(csvContent, 10)}`);
  }
  return allTestsPassed;
};

/**
 * Runs tests for a specified rule/path.
 * @param rulePath - The path of the rule.
 * @param files - The CSV test files to run.
 * @returns A promise that resolves when the tests have been run.
 */
const runTestsForRule = async (testFilePath: string, files: string[]) => {
  console.info(chalk.blue(`Running csv tests for rule ${testFilePath}...`));
  ruleStats.ruleCount++;
  await Promise.all(
    files.map(async (testFile) => {
      await runScenariosForCSVTestfile(testFilePath, testFile);
    }),
  );
};

/**
 * Show CSV test results
 */
const showFinalTestResults = () => {
  const statsChalkFormatter = ruleStats.failedCount > 0 ? chalk.bgRed : chalk.bgGreen;
  console.info(
    statsChalkFormatter(
      `${ruleStats.ruleCount} rules tested, ${ruleStats.testCount} tests run, ${ruleStats.failedCount} failed`,
    ),
  );
  if (ruleStats.failedCount > 0) {
    throw new Error(`Tests failed: ${failedTests}`);
  }
};

/**
 * Test a rule at a specified path with the CSV test files there
 * @param rulePathToTest - The path of the rule.
 */
const runTestsForSpecifiedRulePath = async (rulePathToTest?: string) => {
  const { testFilePath, testFiles } = getTestFilesAtRulePath(`${CSV_TESTS_DIRECTORY}/${rulePathToTest}`);
  await runTestsForRule(testFilePath, testFiles);
  showFinalTestResults();
  process.exit(0);
};

/**
 * Runs all rules by getting all paths that have CSV test files and running tests for each rule.
 */
const runAllRules = async () => {
  // Gets all paths that have CSV test files in them
  const csvTestPaths = getTestPathsAndFiles(CSV_TESTS_DIRECTORY);
  // Run tests for each rule
  await Promise.all(
    csvTestPaths.map(async ({ testFilePath, testFiles }) => {
      await runTestsForRule(testFilePath, testFiles);
    }),
  );
  showFinalTestResults();
  process.exit(0);
};

// Get specific path from command line arguments
const rulePathToTest = process.argv[2];

// Run tests for the specified rule path if it exists, otherwise run all rules
if (rulePathToTest) {
  runTestsForSpecifiedRulePath(rulePathToTest);
} else {
  runAllRules();
}
