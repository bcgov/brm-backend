import { Test, TestingModule } from '@nestjs/testing';
import { ScenarioDataController } from './scenarioData.controller';
import { ScenarioDataService } from './scenarioData.service';
import { ScenarioData } from './scenarioData.schema';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Response } from 'express';
import { VariableClass, CreateScenarioDto } from './dto/create-scenario.dto';

describe('ScenarioDataController', () => {
  let controller: ScenarioDataController;
  let service: ScenarioDataService;
  const ruleDir = 'prod';

  const testObjectId = new Types.ObjectId();

  const mockScenarioDataService = {
    getAllScenarioData: jest.fn(),
    getScenariosByRuleId: jest.fn(),
    getScenariosByFilename: jest.fn(),
    getScenarioData: jest.fn(),
    createScenarioData: jest.fn(),
    updateScenarioData: jest.fn(),
    deleteScenarioData: jest.fn(),
    getCSVForRuleRun: jest.fn(),
    processProvidedScenarios: jest.fn(),
    generateTestScenarios: jest.fn(),
    generateTestCSVScenarios: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScenarioDataController],
      providers: [
        {
          provide: ScenarioDataService,
          useValue: mockScenarioDataService,
        },
      ],
    }).compile();

    controller = module.get<ScenarioDataController>(ScenarioDataController);
    service = module.get<ScenarioDataService>(ScenarioDataService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllScenarioData', () => {
    it('should return an array of scenarios', async () => {
      const result: ScenarioData[] = [];
      jest.spyOn(service, 'getAllScenarioData').mockResolvedValue(result);

      expect(await controller.getAllScenarioData()).toBe(result);
    });

    it('should throw an error if service fails', async () => {
      jest.spyOn(service, 'getAllScenarioData').mockRejectedValue(new Error('Service error'));

      await expect(controller.getAllScenarioData()).rejects.toThrow(HttpException);
    });
  });

  describe('getScenariosByRuleId', () => {
    it('should return scenarios by rule ID', async () => {
      const result: ScenarioData[] = [];
      jest.spyOn(service, 'getScenariosByRuleId').mockResolvedValue(result);

      expect(await controller.getScenariosByRuleId('someRuleId')).toBe(result);
    });

    it('should throw an error if service fails', async () => {
      jest.spyOn(service, 'getScenariosByRuleId').mockRejectedValue(new Error('Service error'));

      await expect(controller.getScenariosByRuleId('someRuleId')).rejects.toThrow(HttpException);
    });
  });

  describe('getScenariosByFilename', () => {
    it('should return scenarios by filename', async () => {
      const result: ScenarioData[] = [];
      jest.spyOn(service, 'getScenariosByFilename').mockResolvedValue(result);

      expect(await controller.getScenariosByFilename('someFilename')).toBe(result);
    });

    it('should throw an error if service fails', async () => {
      jest.spyOn(service, 'getScenariosByFilename').mockRejectedValue(new Error('Service error'));

      await expect(controller.getScenariosByFilename('someFilename')).rejects.toThrow(HttpException);
    });
  });

  describe('getScenariosByRuleId', () => {
    it('should return scenarios by rule ID', async () => {
      const result: ScenarioData[] = [];
      jest.spyOn(service, 'getScenariosByRuleId').mockResolvedValue(result);

      expect(await controller.getScenariosByRuleId('ruleID')).toBe(result);
    });

    it('should throw an error if service fails', async () => {
      jest.spyOn(service, 'getScenariosByRuleId').mockRejectedValue(new Error('Service error'));

      await expect(controller.getScenariosByRuleId('ruleID')).rejects.toThrow(HttpException);
    });
  });

  describe('createScenarioData', () => {
    it('should create a scenario', async () => {
      const result: ScenarioData = {
        title: 'title',
        ruleID: 'ruleID',
        variables: [],
        filepath: 'filename',
        expectedResults: [],
      };

      const variables: VariableClass[] = [
        { name: 'variable1', value: 'value1', type: 'string' },
        { name: 'variable2', value: 123, type: 'number' },
      ];

      const expectedResults: VariableClass[] = [];

      jest.spyOn(service, 'createScenarioData').mockResolvedValue(result);

      const dto: CreateScenarioDto = {
        title: result.title,
        ruleID: result.ruleID,
        variables: variables,
        filepath: result.filepath,
        expectedResults: expectedResults,
      };

      expect(await controller.createScenarioData(dto)).toBe(result);
    });

    it('should throw an error if service fails', async () => {
      const errorMessage = 'Service error';
      jest.spyOn(service, 'createScenarioData').mockRejectedValue(new Error(errorMessage));

      const dto: CreateScenarioDto = {
        title: 'title',
        ruleID: 'ruleID',
        variables: [],
        filepath: 'filename',
        expectedResults: [],
      };

      await expect(controller.createScenarioData(dto)).rejects.toThrow(HttpException);
    });
  });

  describe('updateScenarioData', () => {
    it('should update a scenario', async () => {
      const result: ScenarioData = {
        title: 'title',
        ruleID: 'ruleID',
        variables: [],
        filepath: 'filename',
        expectedResults: [],
      };

      jest.spyOn(service, 'updateScenarioData').mockResolvedValue(result);

      const dto: CreateScenarioDto = {
        title: result.title,
        ruleID: result.ruleID,
        variables: [],
        filepath: result.filepath,
        expectedResults: [],
      };

      expect(await controller.updateScenarioData(testObjectId.toHexString(), dto)).toBe(result);
    });

    it('should throw an error if service fails', async () => {
      const errorMessage = 'Service error';
      jest.spyOn(service, 'updateScenarioData').mockRejectedValue(new Error(errorMessage));

      const dto: CreateScenarioDto = {
        title: 'title',
        ruleID: 'ruleID',
        variables: [],
        filepath: 'filename',
        expectedResults: [],
      };

      await expect(controller.updateScenarioData(testObjectId.toHexString(), dto)).rejects.toThrow(HttpException);
    });
  });

  describe('deleteScenarioData', () => {
    it('should delete a scenario', async () => {
      jest.spyOn(service, 'deleteScenarioData').mockResolvedValue(undefined);

      await expect(controller.deleteScenarioData(testObjectId.toHexString())).resolves.toBeUndefined();
    });

    it('should throw an error if service fails', async () => {
      jest.spyOn(service, 'deleteScenarioData').mockRejectedValue(new Error('Service error'));

      await expect(controller.deleteScenarioData(testObjectId.toHexString())).rejects.toThrow(HttpException);
    });
  });

  describe('getCSVForRuleRun', () => {
    it('should return CSV content with correct headers', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const csvRunResponse = {
        allTestsPassed: true,
        csvContent: `Scenario,Input: familyComposition,Input: numberOfChildren,Output: isEligible,Output: baseAmount
  Scenario 1,single,,true,
  Scenario 2,couple,3,,200`,
      };

      const bom = '\uFEFF';
      const utf8CsvContent = bom + csvRunResponse.csvContent;
      jest.spyOn(service, 'getCSVForRuleRun').mockResolvedValue(csvRunResponse);

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      };

      await controller.getCSVForRuleRun(filepath, ruleContent, ruleDir, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=${filepath.replace(/\.json$/, '.csv')}`,
      );
      expect(mockResponse.send).toHaveBeenCalledWith(utf8CsvContent); // Expect CSV content with BOM
    });
    it('should throw an error if service fails', async () => {
      const errorMessage = 'Error generating CSV for rule run';
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      jest.spyOn(service, 'getCSVForRuleRun').mockRejectedValue(new Error(errorMessage));

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await expect(async () => {
        await controller.getCSVForRuleRun(filepath, ruleContent, ruleDir, mockResponse as any);
      }).rejects.toThrow(Error);

      try {
        await controller.getCSVForRuleRun(filepath, ruleContent, ruleDir, mockResponse as any);
      } catch (error) {
        expect(error.message).toBe('Error generating CSV for rule run');
      }
    });
  });
  describe('uploadCSVAndProcess', () => {
    it('should throw an error if no file is uploaded', async () => {
      const ruleContent = { nodes: [], edges: [] };
      const res: Partial<Response> = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await expect(
        controller.uploadCSVAndProcess(undefined, res as Response, 'test.json', ruleContent, ruleDir),
      ).rejects.toThrow(HttpException);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('should process the CSV and return processed data', async () => {
      const bom = '\uFEFF';
      const csvContent = Buffer.from(bom + 'Title,Input: Age\nScenario 1,25\nScenario 2,30');
      const file: Express.Multer.File = {
        buffer: csvContent,
        fieldname: '',
        originalname: '',
        encoding: '',
        mimetype: '',
        size: 0,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };
      const ruleContent = { nodes: [], edges: [] };

      const scenarios = [
        {
          _id: new Types.ObjectId(),
          title: 'Scenario 1',
          ruleID: '',
          variables: [{ name: 'Age', value: 25, type: 'number' }],
          filepath: 'test.json',
        },
      ];

      const csvResult = { allTestsPassed: true, csvContent: 'Processed CSV Content' };

      mockScenarioDataService.processProvidedScenarios.mockResolvedValue(scenarios);
      mockScenarioDataService.getCSVForRuleRun.mockResolvedValue(csvResult);

      const res: Partial<Response> = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.uploadCSVAndProcess(file, res as Response, 'test.json', ruleContent, ruleDir);

      expect(service.processProvidedScenarios).toHaveBeenCalledWith('test.json', file);
      expect(service.getCSVForRuleRun).toHaveBeenCalledWith('test.json', ruleContent, ruleDir, scenarios);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=processed_data.csv');
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      const receivedBuffer = Buffer.from((res.send as jest.Mock).mock.calls[0][0]);
      expect(receivedBuffer.slice(3)).toEqual(Buffer.from(csvResult.csvContent));
    });

    it('should handle errors during processing', async () => {
      const csvContent = Buffer.from('Title,Input: Age\nScenario 1,25\nScenario 2,30');
      const file: Express.Multer.File = {
        buffer: csvContent,
        fieldname: '',
        originalname: '',
        encoding: '',
        mimetype: '',
        size: 0,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };
      const ruleContent = { nodes: [], edges: [] };

      mockScenarioDataService.processProvidedScenarios.mockRejectedValue(new Error('Mocked error'));

      const res: Partial<Response> = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await expect(
        controller.uploadCSVAndProcess(file, res as Response, 'test.json', ruleContent, ruleDir),
      ).rejects.toThrow(new HttpException('Error processing CSV file', HttpStatus.INTERNAL_SERVER_ERROR));

      expect(service.processProvidedScenarios).toHaveBeenCalledWith('test.json', file);
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).not.toHaveBeenCalled();
    });
  });
  describe('getCSVTests', () => {
    it('should return CSV content with correct headers', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const simulationContext = { someKey: 'someValue' };
      const testScenarioCount = 5;
      const csvContent = 'Test CSV Content';

      const bom = '\uFEFF';
      const utf8CsvContent = bom + csvContent;

      jest.spyOn(service, 'generateTestCSVScenarios').mockResolvedValue(csvContent);

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      };

      await controller.getCSVTests(
        filepath,
        ruleContent,
        simulationContext,
        testScenarioCount,
        ruleDir,
        mockResponse as any,
      );

      expect(service.generateTestCSVScenarios).toHaveBeenCalledWith(
        ruleDir,
        filepath,
        ruleContent,
        simulationContext,
        testScenarioCount,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=test.csv');
      expect(mockResponse.send).toHaveBeenCalledWith(utf8CsvContent);
    });

    it('should throw an error if service fails', async () => {
      const filepath = 'test.json';
      const ruleContent = { nodes: [], edges: [] };
      const simulationContext = { someKey: 'someValue' };
      const testScenarioCount = 5;

      jest.spyOn(service, 'generateTestCSVScenarios').mockRejectedValue(new Error('Service error'));

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      };

      await expect(
        controller.getCSVTests(
          filepath,
          ruleContent,
          simulationContext,
          testScenarioCount,
          ruleDir,
          mockResponse as any,
        ),
      ).rejects.toThrow(HttpException);

      expect(service.generateTestCSVScenarios).toHaveBeenCalledWith(
        ruleDir,
        filepath,
        ruleContent,
        simulationContext,
        testScenarioCount,
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
    });
  });
});
