import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ScenarioDataService } from './scenarioData.service';
import { getModelToken } from '@nestjs/mongoose';
import { Types, Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ScenarioData, ScenarioDataDocument } from './scenarioData.schema';
import { RuleSchema } from './scenarioData.interface';
import { DecisionsService } from '../decisions/decisions.service';
import { RuleMappingService } from '../ruleMapping/ruleMapping.service';
import { DocumentsService } from '../documents/documents.service';
import { parseCSV, complexCartesianProduct } from '../../utils/csv';

jest.mock('../../utils/csv');

describe('ScenarioDataService', () => {
  let service: ScenarioDataService;
  let decisionsService: DecisionsService;
  let ruleMappingService: RuleMappingService;
  let model: Model<ScenarioDataDocument>;

  const testObjectId = new Types.ObjectId();

  const mockScenarioData: ScenarioData = {
    title: 'Test Title',
    ruleID: 'ruleID',
    variables: [],
    filepath: 'test.json',
    expectedResults: [],
  };

  class MockScenarioDataModel {
    constructor(private data: ScenarioData) {}
    save = jest.fn().mockResolvedValue(this.data);
    static find = jest.fn();
    static findOne = jest.fn();
    static findOneAndDelete = jest.fn();
  }

  let originalConsoleError: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };

  beforeAll(() => {
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionsService,
        RuleMappingService,
        ScenarioDataService,
        {
          provide: getModelToken(ScenarioData.name),
          useValue: MockScenarioDataModel,
        },
        DocumentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mocked_value'),
          },
        },
        Logger,
      ],
    }).compile();

    service = module.get<ScenarioDataService>(ScenarioDataService);
    decisionsService = module.get<DecisionsService>(DecisionsService);
    ruleMappingService = module.get<RuleMappingService>(RuleMappingService);
    model = module.get<Model<ScenarioDataDocument>>(getModelToken(ScenarioData.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllScenarioData', () => {
    it('should return all scenario data', async () => {
      const scenarioDataList: ScenarioData[] = [mockScenarioData];
      MockScenarioDataModel.find = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(scenarioDataList) });

      const result = await service.getAllScenarioData();

      expect(result).toEqual(scenarioDataList);
      expect(MockScenarioDataModel.find).toHaveBeenCalled();
    });

    it('should throw an error if an error occurs while retrieving scenario data', async () => {
      const errorMessage = 'DB Error';
      MockScenarioDataModel.find = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error(errorMessage)) });

      await expect(async () => {
        await service.getAllScenarioData();
      }).rejects.toThrowError(`Error getting all scenario data: ${errorMessage}`);

      expect(MockScenarioDataModel.find).toHaveBeenCalled();
    });
  });

  describe('getScenarioData', () => {
    it('should return scenario data by id', async () => {
      const scenarioId = testObjectId.toString();
      const scenarioData: ScenarioData = mockScenarioData;
      MockScenarioDataModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(scenarioData) });

      const result = await service.getScenarioData(scenarioId);

      expect(result).toEqual(scenarioData);
      expect(MockScenarioDataModel.findOne).toHaveBeenCalledWith({ _id: scenarioId });
    });

    it('should return scenarios by rule ID', async () => {
      const mockScenarios = [mockScenarioData];
      MockScenarioDataModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockScenarios),
      });

      const result = await service.getScenariosByRuleId('testRuleId');
      expect(result).toEqual(mockScenarios);
    });

    it('should handle errors when getting scenarios by rule ID', async () => {
      MockScenarioDataModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB Error')),
      });

      await expect(service.getScenariosByRuleId('testRuleId')).rejects.toThrow(
        'Error getting scenarios by rule ID: DB Error',
      );
    });

    it('should throw an error if scenario data is not found', async () => {
      const scenarioId = testObjectId.toString();
      MockScenarioDataModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(async () => {
        await service.getScenarioData(scenarioId);
      }).rejects.toThrowError('Scenario data not found');

      expect(MockScenarioDataModel.findOne).toHaveBeenCalledWith({ _id: scenarioId });
    });

    it('should throw an error if an error occurs while retrieving scenario data', async () => {
      const scenarioId = testObjectId.toString();
      const errorMessage = 'DB Error';
      MockScenarioDataModel.findOne = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error(errorMessage)) });

      await expect(async () => {
        await service.getScenarioData(scenarioId);
      }).rejects.toThrowError(`Error getting scenario data: ${errorMessage}`);

      expect(MockScenarioDataModel.findOne).toHaveBeenCalledWith({ _id: scenarioId });
    });
  });

  describe('createScenarioData', () => {
    it('should create scenario data', async () => {
      const scenarioData: ScenarioData = mockScenarioData;
      const modelInstance = new model(scenarioData);
      modelInstance.save = jest.fn().mockResolvedValue(scenarioData);
      const result = await service.createScenarioData(scenarioData);
      expect(result).toEqual(scenarioData);
    });
  });

  describe('updateScenarioData', () => {
    it('should update scenario data', async () => {
      const scenarioId = testObjectId.toString();
      const updatedData: Partial<ScenarioData> = { title: 'Updated Title' };
      const existingScenarioData = new model(mockScenarioData);
      existingScenarioData.save = jest.fn().mockResolvedValue({ ...mockScenarioData, ...updatedData });

      MockScenarioDataModel.findOne = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(existingScenarioData) });

      const result = await service.updateScenarioData(scenarioId, updatedData);

      expect(result).toEqual({ ...mockScenarioData, ...updatedData });
      expect(MockScenarioDataModel.findOne).toHaveBeenCalledWith({ _id: scenarioId });
      expect(existingScenarioData.save).toHaveBeenCalled();
    });

    it('should throw an error if scenario data is not found', async () => {
      const scenarioId = testObjectId.toString();
      const updatedData: Partial<ScenarioData> = { title: 'Updated Title' };

      MockScenarioDataModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(async () => {
        await service.updateScenarioData(scenarioId, updatedData);
      }).rejects.toThrowError('Scenario data not found');

      expect(MockScenarioDataModel.findOne).toHaveBeenCalledWith({ _id: scenarioId });
    });

    it('should throw an error if an error occurs while updating scenario data', async () => {
      const scenarioId = testObjectId.toString();
      const updatedData: Partial<ScenarioData> = { title: 'Updated Title' };
      const errorMessage = 'DB Error';

      MockScenarioDataModel.findOne = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error(errorMessage)) });

      await expect(async () => {
        await service.updateScenarioData(scenarioId, updatedData);
      }).rejects.toThrowError(`Failed to update scenario data: ${errorMessage}`);

      expect(MockScenarioDataModel.findOne).toHaveBeenCalledWith({ _id: scenarioId });
    });
  });

  describe('deleteScenarioData', () => {
    it('should delete scenario data successfully', async () => {
      const scenarioId = testObjectId.toString();
      const objectId = new Types.ObjectId(scenarioId);
      MockScenarioDataModel.findOneAndDelete = jest.fn().mockResolvedValue({ _id: objectId });
      await expect(service.deleteScenarioData(scenarioId)).resolves.toBeUndefined();

      expect(MockScenarioDataModel.findOneAndDelete).toHaveBeenCalledWith({ _id: objectId });
    });

    it('should throw an error if scenario data is not found', async () => {
      const scenarioId = testObjectId.toString();
      const objectId = new Types.ObjectId(scenarioId);

      MockScenarioDataModel.findOneAndDelete = jest.fn().mockResolvedValue(null);

      await expect(service.deleteScenarioData(scenarioId)).rejects.toThrowError('Scenario data not found');

      expect(MockScenarioDataModel.findOneAndDelete).toHaveBeenCalledWith({ _id: objectId });
    });

    it('should throw an error if an error occurs while deleting scenario data', async () => {
      const scenarioId = testObjectId.toString();
      const objectId = new Types.ObjectId(scenarioId);
      const errorMessage = 'DB Error';
      MockScenarioDataModel.findOneAndDelete = jest.fn().mockRejectedValue(new Error(errorMessage));
      await expect(service.deleteScenarioData(scenarioId)).rejects.toThrowError(
        `Failed to delete scenario data: ${errorMessage}`,
      );
      expect(MockScenarioDataModel.findOneAndDelete).toHaveBeenCalledWith({ _id: objectId });
    });
  });

  describe('getScenariosByRuleId', () => {
    it('should return scenarios by rule ID', async () => {
      const ruleId = testObjectId.toString();
      const scenarioDataList: ScenarioData[] = [mockScenarioData];
      MockScenarioDataModel.find = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(scenarioDataList) });

      const result = await service.getScenariosByRuleId(ruleId);

      expect(result).toEqual(scenarioDataList);
      expect(MockScenarioDataModel.find).toHaveBeenCalledWith({ ruleID: ruleId });
    });

    it('should throw an error if an error occurs while retrieving scenarios by rule ID', async () => {
      const ruleId = testObjectId.toString();
      const errorMessage = 'DB Error';

      MockScenarioDataModel.find = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error(errorMessage)) });

      await expect(async () => {
        await service.getScenariosByRuleId(ruleId);
      }).rejects.toThrowError(`Error getting scenarios by rule ID: ${errorMessage}`);

      expect(MockScenarioDataModel.find).toHaveBeenCalledWith({ ruleID: ruleId });
    });
  });

  describe('getScenariosByFilename', () => {
    it('should return scenarios by filename', async () => {
      const filepath = 'test.json';
      const scenarioDataList: ScenarioData[] = [mockScenarioData];
      scenarioDataList[0].filepath = filepath;
      MockScenarioDataModel.find = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(scenarioDataList) });

      const result = await service.getScenariosByFilename(filepath);

      expect(result).toEqual(scenarioDataList);
      expect(MockScenarioDataModel.find).toHaveBeenCalledWith({ filepath: { $eq: filepath } });
    });

    it('should throw an error if an error occurs while retrieving scenarios by filename', async () => {
      const filepath = 'test.json';
      const errorMessage = 'DB Error';

      MockScenarioDataModel.find = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error(errorMessage)) });

      await expect(async () => {
        await service.getScenariosByFilename(filepath);
      }).rejects.toThrowError(`Error getting scenarios by filename: ${errorMessage}`);

      expect(MockScenarioDataModel.find).toHaveBeenCalledWith({ filepath: { $eq: filepath } });
    });
  });
  describe('runDecisionsForScenarios', () => {
    it('should run decisions for scenarios and map inputs/outputs correctly', async () => {
      const filepath = 'test.json';
      const ruleContent = {
        nodes: [
          {
            id: 'node1',
            type: 'inputNode',
            content: {
              fields: [
                { id: 'id1', name: 'Family Composition', field: 'familyComposition', dataType: 'string' },
                { id: 'id2', name: 'Number of Children', field: 'numberOfChildren', dataType: 'number' },
              ],
            },
          },
          {
            id: 'node2',
            type: 'outputNode',
            content: {
              fields: [
                { id: 'id3', name: 'Is Eligible', field: 'isEligible', dataType: 'boolean' },
                { id: 'id4', name: 'Base Amount', field: 'baseAmount', dataType: 'number' },
              ],
            },
          },
        ],
        edges: [],
      };
      const scenarios = [
        {
          _id: testObjectId,
          title: 'Scenario 1',
          variables: [{ name: 'familyComposition', value: 'single' }],
          ruleID: 'ruleID',
          filepath: 'test.json',
          expectedResults: [],
        },
        {
          _id: testObjectId,
          title: 'Scenario 2',
          variables: [{ name: 'numberOfChildren', value: 2 }],
          ruleID: 'ruleID',
          filepath: 'test.json',
          expectedResults: [],
        },
      ];
      const ruleSchemaOutput: RuleSchema = {
        inputs: [
          { id: 'id1', name: 'Family Composition', field: 'familyComposition' },
          { id: 'id2', name: 'Number of Children', field: 'numberOfChildren' },
        ],
        outputs: [],
        resultOutputs: [
          { id: 'id3', name: 'Is Eligible', field: 'isEligible' },
          { id: 'id4', name: 'Base Amount', field: 'baseAmount' },
        ],
      };
      const decisionResult = {
        performance: '0.7',
        result: { status: 'pass' },
        trace: {
          trace1: {
            id: 'trace1',
            name: 'trace1',
            input: { familyComposition: 'single' },
            output: { isEligible: true },
          },
          trace2: {
            id: 'trace2',
            name: 'trace2',
            input: { numberOfChildren: 2 },
            output: { baseAmount: 100 },
            performance: '0.7',
          },
        },
      };

      jest.spyOn(service, 'getScenariosByFilename').mockResolvedValue(scenarios);
      jest.spyOn(ruleMappingService, 'ruleSchema').mockResolvedValue(ruleSchemaOutput);
      jest.spyOn(decisionsService, 'runDecisionByContent').mockResolvedValue(decisionResult);

      const results = await service.runDecisionsForScenarios(filepath, ruleContent);

      expect(results).toEqual({
        'Scenario 1': {
          inputs: { familyComposition: 'single', numberOfChildren: 2 },
          outputs: { baseAmount: 100, isEligible: true },
          result: {
            status: 'pass',
          },
          expectedResults: {},
          resultMatch: true,
        },
        'Scenario 2': {
          inputs: { familyComposition: 'single', numberOfChildren: 2 },
          outputs: { baseAmount: 100, isEligible: true },
          result: {
            status: 'pass',
          },
          expectedResults: {},
          resultMatch: true,
        },
      });
    });
    it('should handle errors in decision execution', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const scenarios = [
        {
          _id: testObjectId,
          title: 'Scenario 1',
          variables: [{ name: 'familyComposition', value: 'single' }],
          ruleID: 'ruleID',
          filepath: 'test.json',
          expectedResults: [],
        },
      ];
      const ruleSchema = {
        inputs: [{ id: 'id1', name: 'Family Composition', field: 'familyComposition' }],
        outputs: [],
        resultOutputs: [{ id: 'id3', name: 'Is Eligible', field: 'isEligible' }],
      };

      jest.spyOn(service, 'getScenariosByFilename').mockResolvedValue(scenarios);
      jest.spyOn(ruleMappingService, 'ruleSchema').mockResolvedValue(ruleSchema);
      jest.spyOn(decisionsService, 'runDecisionByContent').mockRejectedValue(new Error('Decision execution error'));

      const results = await service.runDecisionsForScenarios(filepath, ruleContent);
      expect(results).toEqual({
        [testObjectId.toString()]: {
          expectedResults: {},
          inputs: {
            familyComposition: 'single',
          },
          outputs: null,
          result: {},
          resultMatch: false,
          error: 'Decision execution error',
        },
      });
    });

    it('should handle scenarios with no variables', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const scenarios = [
        {
          _id: testObjectId,
          title: 'Scenario 1',
          variables: [],
          ruleID: 'ruleID',
          filepath: 'test.json',
          expectedResults: [],
        },
      ];
      const ruleSchema: RuleSchema = {
        inputs: [],
        outputs: [],
        resultOutputs: [{ id: 'id3', name: 'Is Eligible', field: 'isEligible' }],
      };
      const decisionResult = {
        performance: '0.7',
        result: { status: 'pass' },
        trace: {
          trace1: {
            id: 'trace1',
            name: 'trace1',
            input: {},
            output: { isEligible: true },
          },
        },
      };

      jest.spyOn(service, 'getScenariosByFilename').mockResolvedValue(scenarios);
      jest.spyOn(ruleMappingService, 'ruleSchema').mockResolvedValue(ruleSchema);
      jest.spyOn(decisionsService, 'runDecisionByContent').mockResolvedValue(decisionResult);

      const results = await service.runDecisionsForScenarios(filepath, ruleContent);

      expect(results).toEqual({
        'Scenario 1': {
          inputs: {},
          outputs: {},
          expectedResults: {},
          result: {
            status: 'pass',
          },
          resultMatch: true,
        },
      });
    });
  });

  describe('getCSVForRuleRun', () => {
    it('should generate a CSV with correct headers and data', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const ruleRunResults = {
        'Scenario 1': {
          inputs: { familyComposition: 'single', numberOfChildren: 2 },
          outputs: { isEligible: true, baseAmount: 100 },
          expectedResults: {},
          resultMatch: false,
        },
        'Scenario 2': {
          inputs: { familyComposition: 'couple', numberOfChildren: 3 },
          outputs: { isEligible: false, baseAmount: 200 },
          expectedResults: {},
          resultMatch: false,
        },
      };

      jest.spyOn(service, 'runDecisionsForScenarios').mockResolvedValue(ruleRunResults);

      const { csvContent } = await service.getCSVForRuleRun(filepath, ruleContent);

      const expectedCsvContent = `Scenario,Results Match Expected (Pass/Fail),Input: familyComposition,Input: numberOfChildren,Error?\nScenario 1,Fail,single,2,\nScenario 2,Fail,couple,3,`;

      expect(csvContent.trim()).toBe(expectedCsvContent.trim());
    });

    it('should generate a CSV with missing inputs/outputs filled as empty strings', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const ruleRunResults = {
        'Scenario 1': {
          inputs: { familyComposition: 'single' },
          outputs: { isEligible: true },
          expectedResults: {},
        },
        'Scenario 2': {
          inputs: { familyComposition: 'couple', numberOfChildren: 3 },
          outputs: { baseAmount: 200 },
          expectedResults: {},
        },
      };

      jest.spyOn(service, 'runDecisionsForScenarios').mockResolvedValue(ruleRunResults);

      const { csvContent } = await service.getCSVForRuleRun(filepath, ruleContent);

      const expectedCsvContent = `Scenario,Results Match Expected (Pass/Fail),Input: familyComposition,Input: numberOfChildren,Error?\nScenario 1,Fail,single,,\nScenario 2,Fail,couple,3,`;

      expect(csvContent.trim()).toBe(expectedCsvContent.trim());
    });

    it('should generate a CSV with only one scenario', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const ruleRunResults = {
        'Scenario 1': {
          inputs: { familyComposition: 'single', numberOfChildren: 2 },
          outputs: { isEligible: true, baseAmount: 100 },
          expectedResults: {},
        },
      };

      jest.spyOn(service, 'runDecisionsForScenarios').mockResolvedValue(ruleRunResults);

      const { csvContent } = await service.getCSVForRuleRun(filepath, ruleContent);

      const expectedCsvContent = `Scenario,Results Match Expected (Pass/Fail),Input: familyComposition,Input: numberOfChildren,Error?\nScenario 1,Fail,single,2,`;

      expect(csvContent.trim()).toBe(expectedCsvContent.trim());
    });

    it('should generate an empty CSV if no scenarios are present', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const ruleRunResults = {};

      jest.spyOn(service, 'runDecisionsForScenarios').mockResolvedValue(ruleRunResults);

      const { csvContent } = await service.getCSVForRuleRun(filepath, ruleContent);

      const expectedCsvContent = `Scenario,Results Match Expected (Pass/Fail),Error?\n`;

      expect(csvContent.trim()).toBe(expectedCsvContent.trim());
    });

    it('should handle scenarios with no variables or outputs', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const ruleRunResults = {
        'Scenario 1': {
          inputs: {},
          outputs: {},
        },
      };

      jest.spyOn(service, 'runDecisionsForScenarios').mockResolvedValue(ruleRunResults);

      const { csvContent } = await service.getCSVForRuleRun(filepath, ruleContent);

      const expectedCsvContent = `Scenario,Results Match Expected (Pass/Fail),Error?\nScenario 1,Fail,`;

      expect(csvContent.trim()).toBe(expectedCsvContent.trim());
    });

    it('should escape inputs and outputs containing commas or quotes', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const ruleRunResults = {
        'Scenario 1': {
          inputs: { input1: 'value, with, commas', input2: 'value "with" quotes' },
          outputs: { output1: 'result, with, commas', output2: 'result "with" quotes' },
          expectedResults: {},
        },
      };

      jest.spyOn(service, 'runDecisionsForScenarios').mockResolvedValue(ruleRunResults);

      const { csvContent } = await service.getCSVForRuleRun(filepath, ruleContent);

      const expectedCsvContent = `Scenario,Results Match Expected (Pass/Fail),Input: input1,Input: input2,Error?\nScenario 1,Fail,"value, with, commas",value "with" quotes,`;

      expect(csvContent.trim()).toBe(expectedCsvContent.trim());
    });
  });

  describe('processProvidedScenarios', () => {
    it('should process CSV content and return ScenarioData array', async () => {
      const mockCSVContent = {
        buffer: Buffer.from(
          'Title,Input: Age,Input: Income,Expected Result: Eligible\nScenario 1,30,50000,true\nScenario 2,25,30000,false',
        ),
      } as Express.Multer.File;

      const mockParsedData = [
        ['Title', 'Input: Age', 'Input: Income', 'Expected Result: Eligible'],
        ['Scenario 1', '30', '50000', 'true'],
        ['Scenario 2', '25', '30000', 'false'],
      ];

      (parseCSV as jest.Mock).mockResolvedValue(mockParsedData);

      const result = await service.processProvidedScenarios('test.json', mockCSVContent);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        title: 'Scenario 1',
        ruleID: '',
        filepath: 'test.json',
      });
      expect(result[1]).toMatchObject({
        title: 'Scenario 2',
        ruleID: '',
        filepath: 'test.json',
      });

      expect(result[0]).toHaveProperty('variables');
      expect(result[0]).toHaveProperty('expectedResults');
      expect(result[1]).toHaveProperty('variables');
      expect(result[1]).toHaveProperty('expectedResults');

      if (result[0].variables) {
        expect(result[0].variables).toEqual({
          Age: '30',
          Income: '50000',
        });
      }
      if (result[0].expectedResults) {
        expect(result[0].expectedResults).toEqual({
          Eligible: true,
        });
      }
    });

    it('should throw an error if CSV content is empty', async () => {
      const mockCSVContent = {
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      (parseCSV as jest.Mock).mockResolvedValue([]);

      await expect(service.processProvidedScenarios('test.json', mockCSVContent)).rejects.toThrow(
        'CSV content is empty or invalid',
      );
    });

    it('should handle CSV with only headers', async () => {
      const mockCSVContent = {
        buffer: Buffer.from('Title,Input: Age,Input: Income,Expected Result: Eligible'),
      } as Express.Multer.File;

      const mockParsedData = [['Title', 'Input: Age', 'Input: Income', 'Expected Result: Eligible']];

      (parseCSV as jest.Mock).mockResolvedValue(mockParsedData);

      const result = await service.processProvidedScenarios('test.json', mockCSVContent);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
    });
  });
  describe('generatePossibleValues', () => {
    it('should return default value when provided', () => {
      const input = { type: 'number' };
      const result = service.generatePossibleValues(input, 5);
      expect(result).toEqual([5]);
    });

    it('should generate random numbers for number-input', () => {
      const input = { type: 'number-input', validationCriteria: '10,100', validationType: '>=' };
      const result = service.generatePossibleValues(input);
      expect(result.length).toBe(10);
      result.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThanOrEqual(100);
      });
    });

    it('should generate possible values for number-input with range', () => {
      const input = { type: 'number-input', validationType: '[num]', validationCriteria: '1,10' };
      const result = service.generatePossibleValues(input);
      expect(result.length).toBeLessThanOrEqual(10);
      result.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      });
    });

    it('should handle date inputs and generate valid dates', () => {
      const input = { type: 'date', validationCriteria: '2020-01-01,2022-01-01', validationType: '(date)' };
      const result = service.generatePossibleValues(input);
      expect(result.length).toBeLessThanOrEqual(10);
      result.forEach((value) => {
        const date = new Date(value).getTime();
        expect(date).toBeGreaterThan(new Date('2020-01-01').getTime());
        expect(date).toBeLessThan(new Date('2022-01-01').getTime());
      });
    });

    it('should generate possible values for date input based on a range', () => {
      const input = { type: 'date', validationType: '[date]', validationCriteria: '2022-01-01,2023-01-01' };
      const result = service.generatePossibleValues(input);
      expect(result.length).toBeLessThanOrEqual(10);
      result.forEach((value) => {
        const date = new Date(value);
        expect(date).toBeInstanceOf(Date);
        expect(date.getTime()).toBeGreaterThanOrEqual(new Date('2022-01-01').getTime());
        expect(date.getTime()).toBeLessThanOrEqual(new Date('2023-01-01').getTime());
      });
    });

    it('should generate true/false values for true-false type', () => {
      const input = { type: 'true-false' };
      const result = service.generatePossibleValues(input);
      expect(result.length).toBe(2);
      expect(result.every((val) => typeof val === 'boolean')).toBe(true);
    });

    it('should handle text-input with multiple values', () => {
      const input = { type: 'text-input', validationType: '[=text]', validationCriteria: 'option1,option2,option3' };
      const result = service.generatePossibleValues(input);
      expect(result).toEqual(['option1', 'option2', 'option3']);
    });

    it('should handle object-array type and generate combinations', () => {
      const input = {
        id: 8,
        name: 'Dependents List',
        field: 'dependentsList',
        description: 'A list of dependent active on a case with their relevant properties.',
        type: 'object-array',
        validationCriteria: undefined,
        validationType: undefined,
        childFields: [
          {
            id: 64,
            name: 'Date of Birth',
            field: 'dateOfBirth',
            description: 'The specific date of birth for an individual.',
            dataType: 'date',
            validationCriteria: '1910-01-01',
            validationType: '>=',
          },
          {
            id: 69,
            name: 'In School',
            field: 'inSchool',
            description: 'Individual is currently in school.',
            dataType: 'true-false',
          },
        ],
      };
      const mockProduct = [['1927-10-18', true]];
      (complexCartesianProduct as jest.Mock).mockReturnValue(mockProduct);
      const result = service.generatePossibleValues(input);
      expect(result.length).toBeLessThanOrEqual(10);
      result.forEach((array) => {
        expect(array[0]).toHaveProperty('dateOfBirth');
      });
    });

    it('should handle object-array type', () => {
      const input = {
        type: 'object-array',
        childFields: [{ field: 'testField', type: 'text-input' }],
      };
      const result = service.generatePossibleValues(input);
      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle number-input type with different validation types', () => {
      const testCases = [
        { validationType: '>=', validationCriteria: '0,10' },
        { validationType: '<=', validationCriteria: '0,10' },
        { validationType: '>', validationCriteria: '0,10' },
        { validationType: '<', validationCriteria: '0,10' },
        { validationType: '(num)', validationCriteria: '0,10' },
        { validationType: '[num]', validationCriteria: '0,10' },
        { validationType: '[=num]', validationCriteria: '1,2,3' },
        { validationType: '[=nums]', validationCriteria: '1,2,3' },
      ];

      testCases.forEach(({ validationType, validationCriteria }) => {
        const input = {
          type: 'number-input',
          validationType,
          validationCriteria,
        };
        const result = service.generatePossibleValues(input);
        expect(Array.isArray(result)).toBeTruthy();
      });
    });

    it('should handle date type with different validation types', () => {
      const testCases = [
        { validationType: '>=', validationCriteria: '2023-01-01,2023-12-31' },
        { validationType: '<=', validationCriteria: '2023-01-01,2023-12-31' },
        { validationType: '>', validationCriteria: '2023-01-01,2023-12-31' },
        { validationType: '<', validationCriteria: '2023-01-01,2023-12-31' },
        { validationType: '(date)', validationCriteria: '2023-01-01,2023-12-31' },
        { validationType: '[date]', validationCriteria: '2023-01-01,2023-12-31' },
        { validationType: '[=date]', validationCriteria: '2023-01-01,2023-12-31' },
        { validationType: '[=dates]', validationCriteria: '2023-01-01,2023-12-31' },
      ];

      testCases.forEach(({ validationType, validationCriteria }) => {
        const input = {
          type: 'date',
          validationType,
          validationCriteria,
        };
        const result = service.generatePossibleValues(input);
        expect(Array.isArray(result)).toBeTruthy();
      });
    });

    it('should handle true-false type', () => {
      const input = { type: 'true-false' };
      const result = service.generatePossibleValues(input);
      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBe(2);
      expect(result).toContain(true);
      expect(result).toContain(false);
    });
  });

  describe('generateCombinations', () => {
    it('should generate valid combinations from input fields', () => {
      const data = {
        inputs: [{ field: 'field1', type: 'number-input', validationType: '[num]', validationCriteria: '1,10' }],
      };
      const mockProduct = [[7], [8], [9]];
      (complexCartesianProduct as jest.Mock).mockReturnValue(mockProduct);
      const result = service.generateCombinations(data, {}, 3);
      result.forEach((item) => {
        expect(item).toHaveProperty('field1');
        expect(item.field1).toBeGreaterThanOrEqual(1);
        expect(item.field1).toBeLessThanOrEqual(10);
      });
    });

    it('should generate combinations for multiple simple inputs', () => {
      const data = {
        inputs: [
          { field: 'field1', type: 'number-input', validationType: '[num]', validationCriteria: '1,10' },
          { field: 'field2', type: 'text-input', validationCriteria: 'a,b,c', validationType: '[=text]' },
        ],
      };
      const mockProduct = [
        [7, 'a'],
        [8, 'b'],
        [9, 'c'],
      ];
      (complexCartesianProduct as jest.Mock).mockReturnValue(mockProduct);
      const result = service.generateCombinations(data, undefined);
      result.forEach((item) => {
        expect(item).toHaveProperty('field1');
        expect(item).toHaveProperty('field2');
        expect(item.field1).toBeGreaterThanOrEqual(1);
        expect(item.field1).toBeLessThanOrEqual(10);
        expect(['a', 'b', 'c']).toContain(item.field2);
      });
    });

    it('should handle nested object fields', () => {
      const data = {
        inputs: [
          {
            id: 8,
            name: 'Dependents List',
            field: 'dependentsList',
            description: 'A list of dependent active on a case with their relevant properties.',
            type: 'object-array',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: [
              {
                id: 64,
                name: 'Date of Birth',
                field: 'dateOfBirth',
                description: 'The specific date of birth for an individual.',
                dataType: 'date',
                validationCriteria: '1910-01-01',
                validationType: '>=',
              },
              {
                id: 69,
                name: 'In School',
                field: 'inSchool',
                description: 'Individual is currently in school.',
                dataType: 'true-false',
              },
            ],
          },
        ],
      };
      jest.spyOn(service, 'generatePossibleValues').mockImplementation((input) => {
        if (input.type === 'object-array') {
          return [[{ dateOfBirth: '1927-10-18', inSchool: true }], [{ dateOfBirth: '2020-01-24', inSchool: false }]];
        }
        return [];
      });

      (complexCartesianProduct as jest.Mock).mockReturnValueOnce([
        [[{ dateOfBirth: '1927-10-18', inSchool: true }]],
        [[{ dateOfBirth: '2020-01-24', inSchool: false }]],
      ]);

      const result = service.generateCombinations(data, {}, 1);

      expect(result.length).toBe(1);
      result.forEach((item) => {
        expect(item).toHaveProperty('dependentsList');
        expect(Array.isArray(item.dependentsList)).toBe(true);
        expect(item.dependentsList.length).toBe(1);
        expect(item.dependentsList[0]).toHaveProperty('dateOfBirth');
        expect(item.dependentsList[0]).toHaveProperty('inSchool');
        expect(['1927-10-18', '2020-01-24']).toContain(item.dependentsList[0].dateOfBirth);
        expect([true, false]).toContain(item.dependentsList[0].inSchool);
      });
    });

    it('should generate combinations for nested object fields', () => {
      const data = {
        inputs: [
          {
            field: 'nested',
            type: 'object-array',
            childFields: [
              { field: 'subfield1', dataType: 'number-input', validationType: '[num]', validationCriteria: '1,5' },
              { field: 'subfield2', dataType: 'true-false' },
            ],
          },
        ],
      };
      jest.spyOn(service, 'generatePossibleValues').mockImplementation((input) => {
        if (input.type === 'object-array') {
          return [
            [{ subfield1: 3, subfield2: true }],
            [
              { subfield1: 4, subfield2: false },
              { subfield1: 5, subfield2: true },
            ],
          ];
        }
        return [];
      });
      (complexCartesianProduct as jest.Mock).mockReturnValueOnce([
        [[{ subfield1: 3, subfield2: true }]],
        [[{ subfield1: 4, subfield2: false }]],
        [[{ subfield1: 5, subfield2: true }]],
      ]);
      const result = service.generateCombinations(data, undefined, 2);
      expect(result.length).toBeLessThanOrEqual(2);
      result.forEach((item) => {
        expect(item).toHaveProperty('nested');
        expect(Array.isArray(item.nested)).toBe(true);
        item.nested.forEach((nestedItem: any) => {
          expect(nestedItem).toHaveProperty('subfield1');
          expect(nestedItem).toHaveProperty('subfield2');
          expect(nestedItem.subfield1).toBeGreaterThanOrEqual(1);
          expect(nestedItem.subfield1).toBeLessThanOrEqual(5);
          expect(typeof nestedItem.subfield2).toBe('boolean');
        });
      });
    });
  });

  describe('generateObjectsFromCombinations', () => {
    it('should map field combinations to objects correctly', () => {
      const fields = ['field1', 'field2.subfield'];
      const combinations = [
        [1, 'a'],
        [2, 'b'],
      ];
      const result = service.generateObjectsFromCombinations(fields, combinations);
      result.forEach((item) => {
        expect(item).toHaveProperty('field1');
        expect(item.field1).toBeGreaterThanOrEqual(1);
        expect(item.field1).toBeLessThanOrEqual(10);
        expect(item.field2).toHaveProperty('subfield');
        expect(item.field2.subfield).toMatch(/a|b/);
      });
    });

    it('should handle empty combinations', () => {
      const fields = [];
      const combinations = [];
      const result = service.generateObjectsFromCombinations(fields, combinations);
      expect(result).toEqual([]);
    });

    it('should generate objects from simple combinations', () => {
      const fields = ['field1', 'field2'];
      const combinations = [
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
      ];
      const result = service.generateObjectsFromCombinations(fields, combinations);
      result.forEach((item) => {
        expect(item).toHaveProperty('field1');
        expect(item).toHaveProperty('field2');
        expect(item.field1).toBeGreaterThanOrEqual(1);
        expect(item.field1).toBeLessThanOrEqual(3);
        expect(item.field2).toMatch(/a|b|c/);
      });
    });

    it('should generate objects from nested combinations', () => {
      const fields = ['field1', 'nested.subfield1', 'nested.subfield2'];
      const combinations = [
        [1, 'a', true],
        [2, 'b', false],
        [3, 'c', true],
      ];
      const result = service.generateObjectsFromCombinations(fields, combinations);
      result.forEach((item) => {
        expect(item).toHaveProperty('field1');
        expect(item.field1).toBeGreaterThanOrEqual(1);
        expect(item.field1).toBeLessThanOrEqual(3);
        expect(item).toHaveProperty('nested');
        expect(item.nested).toHaveProperty('subfield1');
        expect(item.nested).toHaveProperty('subfield2');
        expect(item.nested.subfield1).toMatch(/a|b|c/);
        expect(item.nested.subfield2).toBeDefined();
      });
    });
  });

  describe('generateTestScenarios', () => {
    it('should generate scenarios based on rule content and schema', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };

      jest.spyOn(decisionsService, 'runDecision').mockResolvedValue({
        performance: '0.7',
        result: {
          someOutput: 'result',
        },
        trace: {},
      });

      const result = await service.generateTestScenarios(filepath, ruleContent);
      expect(Object.keys(result).length).toBeGreaterThan(0);
      Object.values(result).forEach((scenario) => {
        expect(scenario).toHaveProperty('inputs');
        expect(scenario).toHaveProperty('outputs');
      });
    });

    it('should handle errors during scenario generation', async () => {
      jest.spyOn(decisionsService, 'runDecision').mockRejectedValue(new Error('Test error'));
      const result = await service.generateTestScenarios('test.json', { nodes: [], edges: [] });
      expect(Object.keys(result).length).toBeGreaterThan(0);
      expect(result.testCase1.error).toBe('Test error');
    });
  });

  describe('generateTestCSVScenarios', () => {
    const mockRuleContent = { nodes: [], edges: [] };
    const mockSimulationContext = {};

    it('should generate CSV scenarios successfully', async () => {
      jest.spyOn(service, 'generateTestScenarios').mockResolvedValue({
        testCase1: {
          inputs: { field1: 'value1' },
          outputs: { field2: 'value2' },
          expectedResults: {},
          result: {},
          resultMatch: true,
        },
      });

      const result = await service.generateTestCSVScenarios('test.json', mockRuleContent, mockSimulationContext);

      expect(typeof result).toBe('string');
      expect(result).toContain('Scenario');
      expect(result).toContain('Results Match Expected (Pass/Fail)');
    });

    it('should handle errors in CSV generation', async () => {
      jest.spyOn(service, 'generateTestScenarios').mockRejectedValue(new Error('Test error'));

      await expect(
        service.generateTestCSVScenarios('test.json', mockRuleContent, mockSimulationContext),
      ).rejects.toThrow('Error in generating test scenarios CSV: Test error');
    });
  });
});
