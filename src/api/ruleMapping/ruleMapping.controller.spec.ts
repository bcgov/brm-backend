import { Test, TestingModule } from '@nestjs/testing';
import { RuleMappingController } from './ruleMapping.controller';
import { RuleMappingService, InvalidRuleContent } from './ruleMapping.service';
import { EvaluateRuleRunSchemaDto } from './dto/evaluate-rulemapping.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { TraceObject } from './ruleMapping.interface';
import { ConfigService } from '@nestjs/config';

describe('RuleMappingController', () => {
  let controller: RuleMappingController;
  let service: RuleMappingService;
  const ruleDir = 'prod';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RuleMappingController],
      providers: [
        RuleMappingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mocked_value'),
          },
        },
        {
          provide: RuleMappingService,
          useValue: {
            ruleSchema: jest.fn(),
            evaluateRuleSchema: jest.fn(),
            inputOutputSchema: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RuleMappingController>(RuleMappingController);
    service = module.get<RuleMappingService>(RuleMappingService);
  });

  describe('getRuleSchema', () => {
    it('should return the rule schema with the correct headers', async () => {
      const ruleFileName = 'test-rule.json';
      const ruleContent = { nodes: [], edges: [] };
      const rulemap = { inputs: [], resultOutputs: [] };
      jest.spyOn(service, 'inputOutputSchema').mockResolvedValue(rulemap);

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getRuleSchema(ruleDir, ruleFileName, ruleContent, mockResponse);

      expect(service.inputOutputSchema).toHaveBeenCalledWith(ruleDir, ruleContent);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=${ruleFileName}`,
      );
      expect(mockResponse.send).toHaveBeenCalledWith(rulemap);
    });
    it('should set headers and send response', async () => {
      const ruleFileName = 'test-rule.json';
      const ruleContent = { nodes: [], edges: [] };
      const rulemap = { inputs: [], resultOutputs: [] };
      jest.spyOn(service, 'inputOutputSchema').mockResolvedValue(rulemap);

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getRuleSchema(ruleDir, ruleFileName, ruleContent, mockResponse);

      expect(service.inputOutputSchema).toHaveBeenCalledWith(ruleDir, ruleContent);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=${ruleFileName}`,
      );
      expect(mockResponse.send).toHaveBeenCalledWith(rulemap);
    });

    it('should throw an error for invalid rule content', async () => {
      const mockResponse = { setHeader: jest.fn(), send: jest.fn() } as unknown as Response;
      const ruleFileName = 'test-rule.json';
      const ruleContent = { nodes: [], edges: [] };

      jest.spyOn(service, 'inputOutputSchema').mockImplementation(() => {
        throw new InvalidRuleContent('Invalid rule content');
      });

      await expect(controller.getRuleSchema(ruleDir, ruleFileName, ruleContent, mockResponse)).rejects.toThrow(
        new HttpException('Invalid rule content', HttpStatus.BAD_REQUEST),
      );
    });
    it('should set correct headers for JSON response in getRuleSchema', async () => {
      const ruleFileName = 'sample-rule.json';
      const ruleContent = { nodes: [], edges: [] };
      const mockResponse = { setHeader: jest.fn(), send: jest.fn() } as unknown as Response;

      await controller.getRuleSchema(ruleDir, ruleFileName, ruleContent, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=${ruleFileName}`,
      );
    });
    it('should throw a BAD_REQUEST exception if InvalidRuleContent is encountered in getRuleSchema', async () => {
      const ruleFileName = 'invalid-rule.json';
      const ruleContent = { nodes: [], edges: [] };
      const mockResponse = { setHeader: jest.fn(), send: jest.fn() } as unknown as Response;

      jest.spyOn(service, 'inputOutputSchema').mockImplementation(() => {
        throw new InvalidRuleContent('Invalid rule content');
      });

      await expect(controller.getRuleSchema(ruleDir, ruleFileName, ruleContent, mockResponse)).rejects.toThrow(
        new HttpException('Invalid rule content', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('evaluateRuleSchema', () => {
    it('should generate a rule schema correctly', async () => {
      const mockTraceObject: TraceObject = {
        '1': {
          id: '1',
          order: 0,
          name: 'Test Rule',
          input: { field1: 'value1', field2: 'value2' },
          output: { outputField1: 'outputValue1' },
        },
      };
      const dto: EvaluateRuleRunSchemaDto = { trace: mockTraceObject };
      const mockEvaluateRuleSchemaResult = {
        input: { field1: 'value1', field2: 'value2' },
        output: { outputField1: 'outputValue1' },
      };

      jest.spyOn(service, 'evaluateRuleSchema').mockReturnValue(mockEvaluateRuleSchemaResult);

      const result = await controller.evaluateRuleSchema(dto);

      expect(service.evaluateRuleSchema).toHaveBeenCalledWith(mockTraceObject);
      expect(result).toEqual({ result: mockEvaluateRuleSchemaResult });
    });

    it('should generate a rule schema correctly with multiple nested objects', async () => {
      const mockTraceObject: TraceObject = {
        '1': {
          id: '1',
          order: 0,
          name: 'Test Rule 1',
          input: { field1: 'value1', field2: 'value2' },
          output: { outputField1: 'outputValue1' },
        },
        '2': {
          id: '2',
          order: 1,
          name: 'Test Rule 2',
          input: { field3: 'value3', field4: 'value4' },
          output: { outputField2: 'outputValue2' },
        },
        '3': {
          id: '3',
          order: 2,
          name: 'Test Rule 3',
          input: { field5: 'value5' },
          output: { outputField3: 'outputValue3' },
        },
      };
      const dto: EvaluateRuleRunSchemaDto = { trace: mockTraceObject };
      const mockEvaluateRuleSchemaResult = {
        input: { field1: 'value1', field2: 'value2', field3: 'value3', field4: 'value4', field5: 'value5' },
        output: { outputField1: 'outputValue1', outputField2: 'outputValue2', outputField3: 'outputValue3' },
      };

      jest.spyOn(service, 'evaluateRuleSchema').mockReturnValue(mockEvaluateRuleSchemaResult);

      const result = await controller.evaluateRuleSchema(dto);

      expect(service.evaluateRuleSchema).toHaveBeenCalledWith(mockTraceObject);
      expect(result).toEqual({ result: mockEvaluateRuleSchemaResult });
    });

    it('should handle invalid data properly', async () => {
      const dto: EvaluateRuleRunSchemaDto = { trace: null };

      await expect(controller.evaluateRuleSchema(dto)).rejects.toThrow(
        new HttpException('Invalid request data', HttpStatus.BAD_REQUEST),
      );
    });

    it('should handle internal server errors properly', async () => {
      const mockTraceObject: TraceObject = {
        '1': {
          id: '1',
          order: 0,
          name: 'Test Rule',
          input: { field1: 'value1', field2: 'value2' },
          output: { outputField1: 'outputValue1' },
        },
      };
      const dto: EvaluateRuleRunSchemaDto = { trace: mockTraceObject };
      const error = new Error('Unexpected error');

      jest.spyOn(service, 'evaluateRuleSchema').mockImplementation(() => {
        throw error;
      });

      await expect(controller.evaluateRuleSchema(dto)).rejects.toThrow(
        new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
    it('should handle empty trace data correctly', async () => {
      const dto: EvaluateRuleRunSchemaDto = { trace: null };

      await expect(controller.evaluateRuleSchema(dto)).rejects.toThrow(
        new HttpException('Invalid request data', HttpStatus.BAD_REQUEST),
      );
    });

    it('should handle internal server errors', async () => {
      const mockTraceObject: TraceObject = { '1': { id: '1', order: 0, name: 'Test Rule', input: {}, output: {} } };
      const dto: EvaluateRuleRunSchemaDto = { trace: mockTraceObject };

      jest.spyOn(service, 'evaluateRuleSchema').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(controller.evaluateRuleSchema(dto)).rejects.toThrow(
        new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });
  describe('generateWithoutInputOutputNodes', () => {
    it('should set header and send response with rule schema', async () => {
      const ruleContent = { nodes: [], edges: [] };
      const rulemap = { inputs: [], resultOutputs: [] };
      jest.spyOn(service, 'ruleSchema').mockResolvedValue(rulemap);

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.generateWithoutInputOutputNodes(ruleDir, ruleContent, mockResponse);

      expect(service.ruleSchema).toHaveBeenCalledWith(ruleDir, ruleContent);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockResponse.send).toHaveBeenCalledWith(rulemap);
    });

    it('should throw an error for invalid rule content in generateWithoutInputOutputNodes', async () => {
      const mockResponse = { setHeader: jest.fn(), send: jest.fn() } as unknown as Response;
      const ruleContent = { nodes: [], edges: [] };

      jest.spyOn(service, 'ruleSchema').mockImplementation(() => {
        throw new InvalidRuleContent('Invalid rule content');
      });

      await expect(controller.generateWithoutInputOutputNodes(ruleDir, ruleContent, mockResponse)).rejects.toThrow(
        new HttpException('Invalid rule content', HttpStatus.BAD_REQUEST),
      );
    });
    it('should send rule schema in response in generateWithoutInputOutputNodes', async () => {
      const ruleContent = { nodes: [], edges: [] };
      const ruleSchema = { inputs: [], resultOutputs: [] };
      const mockResponse = { setHeader: jest.fn(), send: jest.fn() } as unknown as Response;

      jest.spyOn(service, 'ruleSchema').mockResolvedValue(ruleSchema);

      await controller.generateWithoutInputOutputNodes(ruleDir, ruleContent, mockResponse);

      expect(mockResponse.send).toHaveBeenCalledWith(ruleSchema);
    });
    it('should throw a BAD_REQUEST exception if InvalidRuleContent is encountered in generateWithoutInputOutputNodes', async () => {
      const ruleContent = { nodes: [], edges: [] };
      const mockResponse = { setHeader: jest.fn(), send: jest.fn() } as unknown as Response;

      jest.spyOn(service, 'ruleSchema').mockImplementation(() => {
        throw new InvalidRuleContent('Invalid rule content');
      });

      await expect(controller.generateWithoutInputOutputNodes(ruleDir, ruleContent, mockResponse)).rejects.toThrow(
        new HttpException('Invalid rule content', HttpStatus.BAD_REQUEST),
      );
    });
  });
});
