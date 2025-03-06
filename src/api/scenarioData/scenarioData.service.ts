import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScenarioData, ScenarioDataDocument } from './scenarioData.schema';
import { RuleContent } from '../ruleMapping/ruleMapping.interface';
import { DecisionsService } from '../decisions/decisions.service';
import { RuleMappingService } from '../ruleMapping/ruleMapping.service';
import { DocumentsService } from '../documents/documents.service';
import { RuleSchema, RuleRunResults } from './scenarioData.interface';
import { isEqual, reduceToCleanObj, extractUniqueKeys } from '../../utils/helpers';
import { mapTraces } from '../../utils/handleTrace';
import {
  parseCSV,
  getScenariosFromParsedCSV,
  complexCartesianProduct,
  generateCombinationsWithLimit,
} from '../../utils/csv';

const DEFAULT_TEST_SCENARIO_COUNT = 100;

@Injectable()
export class ScenarioDataService {
  constructor(
    private decisionsService: DecisionsService,
    private ruleMappingService: RuleMappingService,
    private documentsService: DocumentsService,
    @InjectModel(ScenarioData.name) private scenarioDataModel: Model<ScenarioDataDocument>,
    private readonly logger: Logger,
  ) {}

  private valueCache = new Map<string, any[]>();
  private readonly MAX_CARTESIAN_SIZE = 10000;

  async getAllScenarioData(): Promise<ScenarioData[]> {
    try {
      const scenarioDataList = await this.scenarioDataModel.find().exec();
      return scenarioDataList;
    } catch (error) {
      throw new Error(`Error getting all scenario data: ${error.message}`);
    }
  }

  async getScenarioData(scenarioId: string): Promise<ScenarioData> {
    try {
      const scenarioData = await this.scenarioDataModel.findOne({ _id: scenarioId }).exec();
      if (!scenarioData) {
        throw new Error('Scenario data not found');
      }
      return scenarioData;
    } catch (error) {
      throw new Error(`Error getting scenario data: ${error.message}`);
    }
  }

  async createScenarioData(scenarioData: ScenarioData): Promise<ScenarioData> {
    try {
      const newScenarioData = new this.scenarioDataModel(scenarioData);
      const response = await newScenarioData.save();
      return response;
    } catch (error) {
      this.logger.error('Error in createScenarioData:', error);
      throw new Error(`Failed to add scenario data: ${error.message}`);
    }
  }

  async updateScenarioData(scenarioId: string, updatedData: Partial<ScenarioData>): Promise<ScenarioData> {
    try {
      const existingScenarioData = await this.scenarioDataModel.findOne({ _id: scenarioId }).exec();
      if (!existingScenarioData) {
        throw new Error('Scenario data not found');
      }
      Object.assign(existingScenarioData, updatedData);
      return await existingScenarioData.save();
    } catch (error) {
      throw new Error(`Failed to update scenario data: ${error.message}`);
    }
  }

  async deleteScenarioData(scenarioId: string): Promise<void> {
    try {
      const objectId = new Types.ObjectId(scenarioId);
      const deletedScenarioData = await this.scenarioDataModel.findOneAndDelete({ _id: objectId });
      if (!deletedScenarioData) {
        throw new Error('Scenario data not found');
      }
      return;
    } catch (error) {
      throw new Error(`Failed to delete scenario data: ${error.message}`);
    }
  }

  async getScenariosByRuleId(ruleId: string): Promise<ScenarioData[]> {
    try {
      return await this.scenarioDataModel.find({ ruleID: ruleId }).exec();
    } catch (error) {
      throw new Error(`Error getting scenarios by rule ID: ${error.message}`);
    }
  }

  async getScenariosByFilename(filepath: string): Promise<ScenarioData[]> {
    try {
      return await this.scenarioDataModel.find({ filepath: { $eq: filepath } }).exec();
    } catch (error) {
      throw new Error(`Error getting scenarios by filename: ${error.message}`);
    }
  }

  /**
   * Runs decisions for multiple scenarios based on the provided rules JSON file.
   * Retrieves scenarios, retrieves rule schema, and executes decisions for each scenario.
   * Maps inputs and outputs from decision traces to structured results.
   */
  async runDecisionsForScenarios(
    filepath: string,
    ruleContent?: RuleContent,
    ruleDir: string = 'prod',
    newScenarios?: ScenarioData[],
  ): Promise<{ [scenarioId: string]: any }> {
    const scenarios = newScenarios || (await this.getScenariosByFilename(filepath));
    if (!ruleContent) {
      const fileContent = await this.documentsService.getFileContent(filepath);
      ruleContent = await JSON.parse(fileContent.toString());
    }
    const ruleSchema: RuleSchema = await this.ruleMappingService.inputOutputSchema(ruleDir, ruleContent);
    const results: { [scenarioId: string]: any } = {};
    for (const scenario of scenarios as ScenarioDataDocument[]) {
      const formattedVariablesObject = reduceToCleanObj(scenario?.variables, 'name', 'value');
      const formattedExpectedResultsObject = reduceToCleanObj(scenario?.expectedResults, 'name', 'value');
      try {
        const decisionResult = await this.decisionsService.runDecision(
          ruleContent,
          filepath,
          formattedVariablesObject,
          {
            trace: true,
          },
        );

        const resultMatches =
          Object.keys(formattedExpectedResultsObject).length > 0
            ? isEqual(decisionResult.result, formattedExpectedResultsObject)
            : true;

        const scenarioResult = {
          inputs: mapTraces(decisionResult.trace, ruleSchema, 'input'),
          outputs: mapTraces(decisionResult.trace, ruleSchema, 'output'),
          expectedResults: formattedExpectedResultsObject || {},
          result: decisionResult.result || {},
          resultMatch: resultMatches,
        };

        results[scenario.title.toString()] = scenarioResult;
      } catch (error) {
        this.logger.error(`Error running decision for scenario ${scenario._id}: ${error.message}`);
        const scenarioResult = {
          inputs: formattedVariablesObject,
          outputs: null,
          expectedResults: formattedExpectedResultsObject || {},
          result: {},
          resultMatch: false,
          error: error.message,
        };
        results[scenario._id ? scenario._id.toString() : scenario?.title.toString()] = scenarioResult;
      }
    }
    return results;
  }

  /**
   * Generates a CSV string based on the results of running decisions for scenarios.
   * Retrieves scenario results, extracts unique input and output keys, and maps them to CSV rows.
   * Constructs CSV headers and rows based on input and output keys.
   */
  async getCSVForRuleRun(
    filepath: string,
    ruleContent: RuleContent,
    ruleDir: string = 'prod',
    newScenarios?: ScenarioData[],
  ): Promise<{ allTestsPassed: boolean; csvContent: string }> {
    const ruleRunResults: RuleRunResults = await this.runDecisionsForScenarios(
      filepath,
      ruleContent,
      ruleDir,
      newScenarios,
    );

    const keys = {
      inputs: extractUniqueKeys(ruleRunResults, 'inputs'),
      expectedResults: extractUniqueKeys(ruleRunResults, 'expectedResults'),
      result: extractUniqueKeys(ruleRunResults, 'result'),
    };

    const headers = [
      'Scenario',
      'Results Match Expected (Pass/Fail)',
      ...this.prefixKeys(keys.inputs, 'Input'),
      ...this.prefixKeys(keys.expectedResults, 'Expected Result'),
      ...this.prefixKeys(keys.result, 'Result'),
      'Error?',
    ];

    const runResultEntries = Object.entries(ruleRunResults);

    // Check if any tests failed (aka didn't match)
    const failedTests = runResultEntries.some(([, data]) => data.resultMatch !== true);

    const rows = runResultEntries.map(([scenarioName, data]) => [
      this.escapeCSVField(scenarioName),
      data.resultMatch ? 'Pass' : 'Fail',
      ...this.mapFields(data.inputs, keys.inputs),
      ...this.mapFields(data.expectedResults, keys.expectedResults),
      ...this.mapFields(data.result, keys.result),
      data.error ? this.escapeCSVField(data.error) : '',
    ]);

    return { allTestsPassed: !failedTests, csvContent: [headers, ...rows].map((row) => row.join(',')).join('\n') };
  }

  private prefixKeys(keys: string[], prefix: string): string[] {
    return keys.map((key) => `${prefix}: ${key}`);
  }

  private mapFields(data: Record<string, any>, keys: string[]): string[] {
    return keys.map((key) => this.escapeCSVField(data[key]));
  }

  private escapeCSVField(field: any): string {
    if (field == null) return '';
    if (typeof field === 'object') {
      if (Array.isArray(field)) {
        const allObjects = field.every((item) => typeof item === 'object' && item !== null);
        if (!allObjects) {
          const fieldList = field
            .filter((item) => typeof item !== 'object' || item === null)
            .map((item) => item.replace(/"/g, '""'))
            .join(', ');

          return `"[${fieldList}]"`;
        }
      }
      return `${field.length}`;
    }

    const stringField = typeof field === 'string' ? field : String(field);
    return stringField.includes(',') ? `"${stringField.replace(/"/g, '""')}"` : stringField;
  }

  /**
   * Processes a CSV file containing scenario data and returns an array of ScenarioData objects based on the inputs.
   * @param filepath The name of the Go rules JSON file.
   * @param csvContent The CSV file content.
   * @returns An array of ScenarioData objects.
   */
  async processProvidedScenarios(filepath: string, csvContent: Express.Multer.File): Promise<ScenarioData[]> {
    const parsedCSVData = await parseCSV(csvContent);
    return getScenariosFromParsedCSV(parsedCSVData, filepath);
  }

  private cleanValue(value: string): string {
    return value?.trim()?.replace(/[\[\]()]/g, '') ?? '';
  }

  private getCacheKey(input: any, defaultValue: any): string {
    return JSON.stringify({
      field: input.field,
      type: input.type || input.dataType,
      validation: input.validationType,
      criteria: input.validationCriteria,
      defaultValue,
      contextHash: JSON.stringify(defaultValue)?.slice(0, 32),
    });
  }

  private generateSimplifiedCombinations(fields: string[], values: any[][], count: number): any[] {
    const results = new Set();
    for (let i = 0; i < count * 2 && results.size < count; i++) {
      const combination = values.map((arr) => arr[Math.floor(Math.random() * arr.length)]);
      const obj = this.generateObjectsFromCombination(fields, combination);
      results.add(JSON.stringify(obj));
    }
    return Array.from(results).map((str) => JSON.parse(str as string));
  }

  private generateObjectsFromCombination(fields: string[], combination: any[]): any {
    const result = {};
    fields.forEach((field, index) => {
      const parts = field.split('.');
      let current = result;
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
      const lastPart = parts[parts.length - 1];
      current[lastPart] = combination[index];
    });
    return result;
  }

  generatePossibleValues(input: any, defaultValue?: any): any[] {
    const cacheKey = this.getCacheKey(input, defaultValue);
    const cached = this.valueCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { type, dataType, validationCriteria, validationType, childFields } = input;
    const parseValue = (value: string) => {
      const cleaned = this.cleanValue(value);
      return cleaned?.toLowerCase() === 'today' ? new Date() : new Date(cleaned);
    };

    const complexityGeneration = 10;
    let minDefaultValue: number | undefined;
    let maxDefaultValue: number | undefined;
    let defaultTemplate: any[] = [];

    if (defaultValue !== null && defaultValue !== undefined) {
      if (typeof defaultValue == 'object' && (defaultValue.minValue || defaultValue.maxValue)) {
        minDefaultValue = defaultValue.minValue || undefined;
        maxDefaultValue = defaultValue.maxValue || undefined;
      } else if (defaultValue && Array.isArray(defaultValue) && defaultValue.length > 0) {
        defaultTemplate = defaultValue;
      } else return [defaultValue];
    }

    switch (type || dataType) {
      case 'object-array':
        if (defaultTemplate.length > 0) {
          const templateScenarios = [];
          for (const template of defaultValue) {
            if (typeof template === 'object') {
              const generatedTemplate = {};
              for (const [key, value] of Object.entries(template)) {
                const matchingChild: any = childFields?.find((field: any) => field.field === key);
                if (value === null && matchingChild) {
                  const possibleValues = this.generatePossibleValues(matchingChild);
                  generatedTemplate[key] = possibleValues[Math.floor(Math.random() * possibleValues.length)];
                } else {
                  generatedTemplate[key] = value;
                }
              }
              templateScenarios.push(generatedTemplate);
            }
          }
          return [templateScenarios];
        }

        // Default generation
        const scenarios = [];
        for (let i = 0; i < complexityGeneration; i++) {
          const numItems = Math.floor(Math.random() * 4) + 1;
          const items = [];
          for (let j = 0; j < numItems; j++) {
            const item = this.generateCombinations({ inputs: childFields }, undefined, 1);
            items.push(item[0]);
          }
          scenarios.push(items);
        }
        return scenarios;

      case 'number-input':
        const numberValues = validationCriteria?.split(',').map((val: string) => this.cleanValue(val));
        const minValue = minDefaultValue ? minDefaultValue : (numberValues && parseInt(numberValues[0], 10)) || 0;
        const maxValue =
          maxDefaultValue ??
          (numberValues && numberValues.length > 0
            ? parseInt(numberValues[numberValues.length - 1], 10) || minValue + 20
            : minValue + 20);

        const generateRandomNumbers = (count: number) => {
          const range = maxValue - minValue;
          if (range <= 5) {
            return Array.from({ length: range + 1 }, (_, i) => minValue + i);
          }
          return Array.from({ length: count }, () => Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue);
        };

        switch (validationType) {
          case '>=':
            return generateRandomNumbers(complexityGeneration);
          case '<=':
            return generateRandomNumbers(complexityGeneration);
          case '>':
            return generateRandomNumbers(complexityGeneration).filter((val) => val > minValue);
          case '<':
            return generateRandomNumbers(complexityGeneration).filter((val) => val < maxValue);
          // range exclusive
          case '(num)':
            return generateRandomNumbers(complexityGeneration).filter((val) => val > minValue && val < maxValue);
          // range inclusive
          case '[num]':
            return generateRandomNumbers(complexityGeneration);
          case '[=num]':
            return validationCriteria.split(',').map((val: string) => val.trim());
          case '[=nums]':
            return [validationCriteria.split(',').map((val: string) => val.trim())];
          default:
            return generateRandomNumbers(complexityGeneration);
        }

      case 'date':
        const dateValues = validationCriteria
          ?.split(',')
          .map((val: string) => parseValue(this.cleanValue(val)).getTime());

        // Get initial min and max dates
        let minDate = minDefaultValue
          ? new Date(minDefaultValue).getTime()
          : (dateValues && dateValues[0]) || new Date().getTime();
        let maxDate = maxDefaultValue
          ? new Date(maxDefaultValue).getTime()
          : dateValues && dateValues[dateValues?.length - 1] !== minDate
            ? dateValues[dateValues?.length - 1]
            : new Date().setFullYear(new Date().getFullYear() + 1);

        if (minDate > maxDate) {
          const earlierDate = Math.min(minDate, maxDate);
          minDate = earlierDate;
          maxDate = earlierDate;
        }

        const generateRandomDates = (count: number) =>
          Array.from({ length: count }, () =>
            new Date(minDate + Math.random() * (maxDate - minDate)).toISOString().slice(0, 10),
          );

        switch (validationType) {
          case '>=':
          case '<=':
            return generateRandomDates(complexityGeneration);
          case '>':
            return generateRandomDates(complexityGeneration).filter((date) => new Date(date).getTime() > minDate);
          case '<':
            return generateRandomDates(complexityGeneration).filter((date) => new Date(date).getTime() < maxDate);
          // range exclusive
          case '(date)':
            return generateRandomDates(complexityGeneration).filter((date) => {
              const dateTime = parseValue(date).getTime();
              return dateTime > minDate && dateTime < maxDate;
            });
          case '[date]':
            return generateRandomDates(complexityGeneration);
          case '[=date]':
          case '[=dates]':
            return validationCriteria.split(',').map((val: string) => {
              const parsedDate = parseValue(val.trim());
              return parsedDate.toISOString().slice(0, 10);
            });
          default:
            return generateRandomDates(complexityGeneration);
        }

      case 'text-input':
        if (validationType === '[=texts]') {
          const textOptionsArray = validationCriteria.split(',').map((val: string) => this.cleanValue(val));
          const arrayCombinations = generateCombinationsWithLimit(textOptionsArray);

          return arrayCombinations;
        }
        if (validationType === '[=text]') {
          return validationCriteria.split(',').map((val: string) => this.cleanValue(val));
        }
        // TODO: Future update to include regex generation
        const generateRandomText = (
          count: number,
          charPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        ) => Array.from({ length: count }, () => charPool.charAt(Math.floor(Math.random() * charPool.length)));
        const textArray = Array.from({ length: complexityGeneration }, () =>
          generateRandomText(complexityGeneration).join(''),
        );

        return textArray;

      case 'true-false':
        const firstValue = Math.random() < 0.5;
        return [firstValue, !firstValue];

      default:
        return [];
    }
  }

  generateCombinations(
    data: any,
    simulationContext?: RuleRunResults,
    testScenarioCount: number = DEFAULT_TEST_SCENARIO_COUNT,
    defaultTemplate?: any[],
  ) {
    this.valueCache.clear();

    const generateFieldPath = (field: string, parentPath: string = ''): string => {
      return parentPath ? `${parentPath}.${field}` : field;
    };

    // If we have a default template, use it as a base for generating combinations
    if (defaultTemplate && Array.isArray(defaultTemplate) && defaultTemplate.length > 0) {
      const templateResults = defaultTemplate.map((template) => {
        const processedTemplate = {};
        Object.entries(template).forEach(([key, value]) => {
          if (value === null) {
            // Find matching field definition from inputs
            const matchingField: any = (data.inputs as any[]).find((input: any) => input.field === key);
            if (matchingField) {
              const possibleValues = this.generatePossibleValues(matchingField);
              processedTemplate[key] = possibleValues[Math.floor(Math.random() * possibleValues.length)];
            }
          } else {
            processedTemplate[key] = value;
          }
        });
        return processedTemplate;
      });
      return templateResults;
    }

    // Original combination generation logic
    const mapInputs = (inputs: any[], parentPath: string = ''): { fields: string[]; values: any[][] } => {
      return inputs.reduce(
        (acc, input) => {
          const currentPath = generateFieldPath(input.field, parentPath);
          if (input.type === 'object-array') {
            const childCombinations = this.generatePossibleValues(input, simulationContext?.[input.field]);
            return {
              fields: [...acc.fields, currentPath],
              values: [...acc.values, childCombinations],
            };
          } else if (input.childFields && input.childFields.length > 0) {
            const childResult = mapInputs(input.childFields, currentPath);
            return {
              fields: [...acc.fields, ...childResult.fields],
              values: [...acc.values, ...childResult.values],
            };
          } else {
            const defaultValue = simulationContext?.[input.field];
            const possibleValues = this.generatePossibleValues(input, defaultValue);
            return {
              fields: [...acc.fields, currentPath],
              values: [...acc.values, possibleValues],
            };
          }
        },
        { fields: [], values: [] },
      );
    };

    const { fields, values } = mapInputs(data.inputs);

    const removeDuplicates = (array: any[]): any[] => {
      const seen = new Set();
      return array.filter((item) => {
        const itemString = JSON.stringify(item);
        if (!seen.has(itemString)) {
          seen.add(itemString);
          return true;
        }
        return false;
      });
    };

    const totalPossibleCombinations = values.reduce((acc, arr) => acc * arr.length, 1);

    if (totalPossibleCombinations > this.MAX_CARTESIAN_SIZE) {
      return this.generateSimplifiedCombinations(fields, values, testScenarioCount);
    }

    const inputCombinations = complexCartesianProduct(values) || [];
    const uniqueInputCombinations = removeDuplicates(inputCombinations) || [];

    const resultObjects = this.generateObjectsFromCombinations(fields, uniqueInputCombinations);
    const uniqueResultObjects = removeDuplicates(resultObjects) || [];
    return uniqueResultObjects.slice(0, testScenarioCount) || [];
  }

  generateObjectsFromCombinations(fields: string[], combinations: any[][]) {
    return combinations.map((combination) => {
      const obj: { [key: string]: any } = {};
      fields.forEach((field, index) => {
        const fieldParts = field.split('.');
        let currentObj = obj;
        for (let i = 0; i < fieldParts.length - 1; i++) {
          if (!currentObj[fieldParts[i]]) {
            currentObj[fieldParts[i]] = Array.isArray(combination[index]) ? [] : {};
          }
          currentObj = currentObj[fieldParts[i]];
        }
        const lastPart = fieldParts[fieldParts.length - 1];
        const randomIndex = Math.floor(Math.random() * combinations.length);
        const value = combinations[randomIndex][index];
        currentObj[lastPart] = value;
      });
      return obj;
    });
  }

  async generateTestScenarios(
    ruleDir: string,
    filepath: string,
    ruleContent?: RuleContent,
    simulationContext?: RuleRunResults,
    testScenarioCount: number = DEFAULT_TEST_SCENARIO_COUNT,
    defaultTemplate?: any[],
  ): Promise<{ [scenarioId: string]: any }> {
    if (!ruleContent) {
      const fileContent = await this.documentsService.getFileContent(filepath);
      ruleContent = await JSON.parse(fileContent.toString());
    }
    const ruleSchema: RuleSchema = await this.ruleMappingService.inputOutputSchema(ruleDir, ruleContent);
    const combinations = this.generateCombinations(
      ruleSchema,
      simulationContext,
      testScenarioCount,
      defaultTemplate,
    ).slice(0, testScenarioCount);
    const formattedExpectedResultsObject = reduceToCleanObj(ruleSchema.resultOutputs, 'field', 'value');

    const scenarioPromises = combinations.map(async (scenario: ScenarioDataDocument, index: number) => {
      const formattedVariablesObject = scenario;
      const title = `testCase${index + 1}`;
      try {
        const decisionResult = await this.decisionsService.runDecision(
          ruleContent,
          filepath,
          formattedVariablesObject,
          {
            trace: true,
          },
          ruleDir,
        );
        const resultMatches =
          Object.keys(formattedExpectedResultsObject).length > 0
            ? isEqual(decisionResult.result, formattedExpectedResultsObject)
            : true;
        return {
          title,
          scenarioResult: {
            inputs: mapTraces(decisionResult.trace, ruleSchema, 'input'),
            outputs: mapTraces(decisionResult.trace, ruleSchema, 'output'),
            expectedResults: formattedExpectedResultsObject || {},
            result: decisionResult.result || {},
            resultMatch: resultMatches,
          },
        };
      } catch (error) {
        this.logger.error(`Error running decision for scenario ${title}: ${error.message}`);
        return {
          title,
          scenarioResult: {
            inputs: formattedVariablesObject,
            outputs: null,
            expectedResults: formattedExpectedResultsObject || {},
            result: {},
            resultMatch: false,
            error: error.message,
          },
        };
      }
    });

    const scenarioResults = await Promise.all(scenarioPromises);

    const results: { [scenarioId: string]: any } = {};
    for (const { title, scenarioResult } of scenarioResults) {
      results[title] = scenarioResult;
    }

    return results;
  }

  async generateTestCSVScenarios(
    ruleDir: string,
    filepath: string,
    ruleContent: RuleContent,
    simulationContext: RuleRunResults,
    testScenarioCount: number = DEFAULT_TEST_SCENARIO_COUNT,
  ) {
    try {
      const ruleRunResults: RuleRunResults = await this.generateTestScenarios(
        ruleDir,
        filepath,
        ruleContent,
        simulationContext,
        testScenarioCount,
      );

      const keys = {
        inputs: extractUniqueKeys(ruleRunResults, 'inputs'),
        expectedResults: extractUniqueKeys(ruleRunResults, 'expectedResults'),
        result: extractUniqueKeys(ruleRunResults, 'result'),
      };

      const headers = [
        'Scenario',
        'Results Match Expected (Pass/Fail)',
        ...this.prefixKeys(keys.inputs, 'Input'),
        ...this.prefixKeys(keys.expectedResults, 'Expected Result'),
        ...this.prefixKeys(keys.result, 'Result'),
        'Error?',
      ];

      const rows = Object.entries(ruleRunResults).map(([scenarioName, data]) => [
        this.escapeCSVField(scenarioName),
        `n/a`,
        ...this.mapFields(data.inputs, keys.inputs),
        ...this.mapFields(data.expectedResults, keys.expectedResults),
        ...this.mapFields(data.result, keys.result),
        data.error ? this.escapeCSVField(data.error) : '',
      ]);

      return [headers, ...rows].map((row) => row.join(',')).join('\n');
    } catch (error) {
      throw new Error(`Error in generating test scenarios CSV: ${error.message}`);
    }
  }
}
