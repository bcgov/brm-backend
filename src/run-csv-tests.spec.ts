import fs from 'fs';
import path from 'path';
import { getScenariosFromParsedCSV } from './utils/csv';
import { CsvTestRunner } from './run-csv-tests';

jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
  },
  existsSync: jest.fn(),
}));
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));
jest.mock('util');
jest.mock('./run-csv-tests', () => ({
  ...jest.requireActual('./run-csv-tests'),
}));
jest.mock('./api/decisions/decisions.service');
jest.mock('./utils/csv');
jest.mock('./api/ruleMapping/ruleMapping.service');
jest.mock('./api/documents/documents.service');
jest.mock('./api/scenarioData/scenarioData.service');

describe('CsvTestRunner', () => {
  const originalArgv = process.argv;
  const ruleDir = 'prod';
  let runner: CsvTestRunner;

  beforeEach(() => {
    jest.clearAllMocks();
    process.argv = [...originalArgv];
    process.exit = jest.fn() as any;
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    (fs.promises.readFile as jest.Mock).mockResolvedValue('');
    runner = new CsvTestRunner();
  });

  afterAll(() => {
    process.argv = originalArgv;
  });

  it('should run all rules when process.argv[2] is blank', async () => {
    process.argv[2] = '';
    runner.runAllRules = jest.fn();
    await runner.main(process.argv);
    expect(runner.runAllRules).toHaveBeenCalled();
  });

  it('should run tests for specified rule paths when process.argv[2] has file names', async () => {
    process.argv[2] = 'rules/rule1,rules/rule2';
    runner.runTestsForSpecifiedRulePaths = jest.fn();
    await runner.main(process.argv);
    expect(runner.runTestsForSpecifiedRulePaths).toHaveBeenCalledWith('rules/rule1,rules/rule2');
  });

  it('should convert CSV to array', () => {
    const csv = 'a,b,c\n1,2,3';
    const result = runner.convertCsvToArray(csv);
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('should indent multiline string', () => {
    const str = 'line1\nline2';
    const result = runner.indentMultilineString(str, 2);
    expect(result).toBe('    line1\n    line2');
  });

  it('should get test files at rule path', () => {
    const filePath = 'some/path';
    (fs.readdirSync as jest.Mock).mockReturnValue(['file1.csv', 'file2.csv']);
    (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
    const result = runner.getTestFilesAtRulePath(filePath);
    expect(result).toEqual({
      testFilePath: path.relative('brms-rules/tests', filePath),
      testFiles: ['file1.csv', 'file2.csv'],
    });
  });

  it('should get test paths and files', () => {
    const dir = './some/dir';
    (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true, isFile: () => true });
    (fs.readdirSync as jest.Mock).mockReturnValueOnce(['subdir']);
    (fs.readdirSync as jest.Mock).mockReturnValueOnce(['file1.json']);
    (fs.readdirSync as jest.Mock).mockReturnValueOnce(['file1.csv', 'file2.csv']);
    const result = runner.getTestPathsAndFiles(dir);
    expect(result).toEqual([
      { testFilePath: '../../some/dir/subdir/file1.json', testFiles: ['file1.csv', 'file2.csv'] },
    ]);
  });

  it('should run scenarios for CSV test file', async () => {
    const testFilePath = 'some/path';
    const testFile = 'test.csv';
    (fs.promises.readFile as jest.Mock).mockResolvedValue('a,b,c\n1,2,3');
    (getScenariosFromParsedCSV as jest.Mock).mockReturnValue([]);
    (runner.scenarioDataService.getCSVForRuleRun as jest.Mock).mockResolvedValue({
      allTestsPassed: true,
      csvContent: 'a,b,c\n1,2,3',
    });
    const result = await runner.runScenariosForCSVTestfile(ruleDir, testFilePath, testFile);
    expect(result).toBe(true);
  });

  it('should run tests for rule', async () => {
    const testFilePath = 'some/path';
    const files = ['test1.csv', 'test2.csv'];
    runner.runScenariosForCSVTestfile = jest.fn();
    await runner.runTestsForRule(ruleDir, testFilePath, files);
    expect(runner.runScenariosForCSVTestfile).toHaveBeenCalledTimes(2);
  });

  it('should show final test results', () => {
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    runner.showFinalTestResults();
    expect(consoleInfoSpy).toHaveBeenCalled();
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should run tests for specified rule path', async () => {
    const rulePathToTest = 'rules/some-rule';
    runner.runTestsForRule = jest.fn();
    runner.getTestFilesAtRulePath = jest.fn();
    (runner.getTestFilesAtRulePath as jest.Mock).mockReturnValue({
      testFilePath: path.relative('brms-rules/tests', rulePathToTest),
      testFiles: ['file.csv'],
    });
    await runner.runTestsForSpecifiedRulePath(rulePathToTest);
    expect(runner.runTestsForRule).toHaveBeenCalled();
  });

  it('should run tests for specified rule paths', async () => {
    const rulePathsToTest = 'rules/rule1,rules/rule2';
    runner.runTestsForSpecifiedRulePath = jest.fn();
    await runner.runTestsForSpecifiedRulePaths(rulePathsToTest);
    expect(runner.runTestsForSpecifiedRulePath).toHaveBeenCalledTimes(2);
  });

  it('should run all rules', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(['subdir']);
    (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true, isFile: () => true });
    (fs.readdirSync as jest.Mock).mockReturnValueOnce(['file1.json', 'file2.json', 'file3.json']);
    runner.runTestsForRule = jest.fn();
    await runner.runAllRules(ruleDir);
    expect(runner.runTestsForRule).toHaveBeenCalledTimes(3);
  });
});
