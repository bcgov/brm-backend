import { Test, TestingModule } from '@nestjs/testing';
import { RuleMappingService, InvalidRuleContent } from './ruleMapping.service';
import { Node, TraceObject, Edge, RuleContent } from './ruleMapping.interface';
import { DocumentsService } from '../documents/documents.service';
import { ConfigService } from '@nestjs/config';

describe('RuleMappingService', () => {
  let service: RuleMappingService;
  let documentsService: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleMappingService,
        DocumentsService,
        {
          provide: DocumentsService,
          useValue: {
            getFileContent: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mocked_value'),
          },
        },
      ],
    }).compile();

    service = module.get<RuleMappingService>(RuleMappingService);
    documentsService = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractFields', () => {
    it('should extract inputs correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field2' },
            ],
            expressions: [{ key: 'expr1', value: 'field3' }],
          },
          id: 'testNode',
        },
        {
          type: 'expressionNode',
          content: {
            expressions: [{ key: 'expr1', value: 'field3' }],
          },
          id: 'testNode2',
        },
      ];

      const result = await service.extractFields(nodes, 'inputs');
      expect(result).toEqual({
        inputs: [
          { id: '1', name: 'Input1', type: 'string', field: 'field1' },
          { id: '2', name: 'Input2', type: 'number', field: 'field2' },
          { key: 'expr1', field: 'field3', exception: null },
        ],
      });
    });

    it('should extract outputs correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            outputs: [
              { id: '1', name: 'Output1', type: 'string', field: 'field1' },
              { id: '2', name: 'Output2', type: 'number', field: 'field2' },
            ],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractFields(nodes, 'outputs');
      expect(result).toEqual({
        outputs: [
          { id: '1', name: 'Output1', type: 'string', field: 'field1' },
          { id: '2', name: 'Output2', type: 'number', field: 'field2' },
        ],
      });
    });

    it('should handle empty nodes array', async () => {
      const nodes: Node[] = [];
      const result = await service.extractFields(nodes, 'outputs');
      expect(result).toEqual({ outputs: [] });
    });
    it('should handle decisionNode correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'decisionNode',
          content: {
            key: 'someKey',
          },
          id: 'testNode',
        },
      ];

      jest.spyOn(service, 'ruleSchemaFile').mockResolvedValue({
        inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
        resultOutputs: [{ id: '2', name: 'Output1', type: 'number', field: 'field2' }],
      });

      const result = await service.extractFields(nodes, 'inputs');
      expect(result).toEqual({
        inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
      });

      const resultOutputs = await service.extractFields(nodes, 'outputs');
      expect(resultOutputs).toEqual({
        outputs: [{ id: '2', name: 'Output1', type: 'number', field: 'field2' }],
      });
    });

    it('should handle expressionNode with simple expressions correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'expressionNode',
          content: {
            expressions: [
              { key: 'expr1', value: 'field3' },
              { key: 'expr2', value: '123' },
            ],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractFields(nodes, 'inputs');
      expect(result).toEqual({
        inputs: [
          { key: 'expr1', field: 'field3', exception: null },
          { key: 'expr2', field: '123', exception: null },
        ],
      });
    });

    it('should handle expressionNode with complex expressions correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'expressionNode',
          content: {
            expressions: [
              { key: 'expr1', value: 'field3 > 5' },
              { key: 'expr2', value: 'complexExpr + 2' },
            ],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractFields(nodes, 'inputs');
      expect(result).toEqual({
        inputs: [
          { key: 'expr1', field: 'expr1', exception: 'field3 > 5' },
          { key: 'expr2', field: 'expr2', exception: 'complexExpr + 2' },
        ],
      });
    });

    it('should handle nodes with unknown type correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'unknownType',
          content: {
            inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractFields(nodes, 'inputs');
      expect(result).toEqual({
        inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
      });
    });

    it('should handle nodes without the specified fieldKey correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractFields(nodes, 'outputs');
      expect(result).toEqual({
        outputs: [],
      });
    });

    it('should handle nodes with duplicate properties correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field1' },
            ],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractFields(nodes, 'inputs');
      expect(result).toEqual({
        inputs: [{ id: '2', name: 'Input2', type: 'number', field: 'field1' }],
      });
    });
  });

  describe('extractResultOutputs', () => {
    it('should extract result outputs correctly when there is one output node and corresponding edges', async () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'inputNode',
          content: {
            inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
          },
        },
        {
          id: '2',
          type: 'outputNode',
          content: {
            outputs: [{ id: '1', name: 'Output1', type: 'string', field: 'field2' }],
          },
        },
        {
          id: '3',
          type: 'intermediateNode',
          content: {
            outputs: [{ id: '2', name: 'Output2', type: 'number', field: 'field3' }],
          },
        },
      ];

      const edges: Edge[] = [
        { id: '1', type: 'someType', sourceId: '1', targetId: '2' },
        { id: '2', type: 'someType', sourceId: '3', targetId: '2' },
      ];

      jest.spyOn(service, 'extractFields').mockResolvedValue({
        outputs: [
          { id: '1', name: 'Output1', type: 'string', field: 'field2' },
          { id: '2', name: 'Output2', type: 'number', field: 'field3' },
        ],
      });

      const result = await service.extractResultOutputs(nodes, edges);
      expect(result).toEqual({
        resultOutputs: [
          { id: '1', name: 'Output1', type: 'string', field: 'field2' },
          { id: '2', name: 'Output2', type: 'number', field: 'field3' },
        ],
      });
    });

    it('should throw an error if no outputNode is found', async () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'inputNode',
          content: {
            inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
          },
        },
      ];

      const edges: Edge[] = [{ id: '1', type: 'someType', sourceId: '1', targetId: '2' }];

      try {
        await service.extractResultOutputs(nodes, edges);
        fail('Expected extractResultOutputs to throw an error');
      } catch (error) {
        expect(error.message).toBe('No outputNode found in the nodes array');
      }
    });

    it('should return an empty array if no target edges are found for the output node', async () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'inputNode',
          content: {
            inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
          },
        },
        {
          id: '2',
          type: 'outputNode',
          content: {
            outputs: [{ id: '1', name: 'Output1', type: 'string', field: 'field2' }],
          },
        },
      ];

      const edges: Edge[] = [];

      jest.spyOn(service, 'extractFields').mockResolvedValue({
        outputs: [],
      });

      const result = await service.extractResultOutputs(nodes, edges);
      expect(result).toEqual({
        resultOutputs: [],
      });
    });

    it('should handle cases where there are multiple output nodes', async () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'inputNode',
          content: {
            inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
          },
        },
        {
          id: '2',
          type: 'outputNode',
          content: {
            outputs: [{ id: '1', name: 'Output1', type: 'string', field: 'field2' }],
          },
        },
        {
          id: '3',
          type: 'outputNode',
          content: {
            outputs: [{ id: '2', name: 'Output2', type: 'number', field: 'field3' }],
          },
        },
      ];

      const edges: Edge[] = [
        { id: '1', type: 'someType', sourceId: '1', targetId: '2' },
        { id: '2', type: 'someType', sourceId: '1', targetId: '3' },
      ];

      jest.spyOn(service, 'extractFields').mockResolvedValue({
        outputs: [
          { id: '1', name: 'Output1', type: 'string', field: 'field2' },
          { id: '2', name: 'Output2', type: 'number', field: 'field3' },
        ],
      });

      const result = await service.extractResultOutputs(nodes, edges);
      expect(result).toEqual({
        resultOutputs: [
          { id: '1', name: 'Output1', type: 'string', field: 'field2' },
          { id: '2', name: 'Output2', type: 'number', field: 'field3' },
        ],
      });
    });
  });

  describe('extractInputsAndOutputs', () => {
    it('should extract inputs and outputs correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field2' },
            ],
            outputs: [
              { id: '3', name: 'Output1', type: 'string', field: 'field3' },
              { id: '4', name: 'Output2', type: 'number', field: 'field4' },
            ],
          },
          id: 'testNode',
        },
        {
          type: 'expressionNode',
          content: {
            expressions: [{ key: 'expr1', value: 'field5' }],
          },
          id: 'testNode2',
        },
      ];

      const result = await service.extractInputsAndOutputs(nodes);
      expect(result).toEqual({
        inputs: [
          { id: '1', name: 'Input1', type: 'string', field: 'field1' },
          { id: '2', name: 'Input2', type: 'number', field: 'field2' },
          { key: 'expr1', field: 'field5', exception: null },
        ],
        outputs: [
          { id: '3', name: 'Output1', type: 'string', field: 'field3' },
          { id: '4', name: 'Output2', type: 'number', field: 'field4' },
          { key: 'field5', field: 'expr1', exception: null },
        ],
      });
    });

    it('should handle empty nodes array', async () => {
      const nodes: Node[] = [];
      const result = await service.extractInputsAndOutputs(nodes);
      expect(result).toEqual({ inputs: [], outputs: [] });
    });
  });

  describe('findUniqueFields', () => {
    it('should find unique fields', () => {
      const fields = [
        { field: 'field1', name: 'Field 1' },
        { field: 'field2', name: 'Field 2' },
      ];
      const otherFields = new Set(['field2']);
      const result = service.findUniqueFields(fields, otherFields);
      expect(result).toEqual({
        field1: { field: 'field1', name: 'Field 1' },
      });
    });
  });

  describe('extractUniqueInputs', () => {
    it('should extract unique inputs correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field2' },
            ],
            outputs: [{ id: '3', name: 'Output1', type: 'string', field: 'field2' }],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractUniqueInputs(nodes);
      expect(result).toEqual({
        uniqueInputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
      });
    });

    it('should handle nodes without inputs', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            outputs: [{ id: '3', name: 'Output1', type: 'string', field: 'field2' }],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractUniqueInputs(nodes);
      expect(result).toEqual({
        uniqueInputs: [],
      });
    });

    it('should handle nodes with inputs and no outputs', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field2' },
            ],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractUniqueInputs(nodes);
      expect(result).toEqual({
        uniqueInputs: [
          { id: '1', name: 'Input1', type: 'string', field: 'field1' },
          { id: '2', name: 'Input2', type: 'number', field: 'field2' },
        ],
      });
    });

    it('should handle nodes with inputs and outputs that match', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field2' },
            ],
            outputs: [
              { id: '3', name: 'Output1', type: 'string', field: 'field1' },
              { id: '4', name: 'Output2', type: 'number', field: 'field2' },
            ],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractUniqueInputs(nodes);
      expect(result).toEqual({
        uniqueInputs: [],
      });
    });

    it('should handle nodes with transformed inputs as exceptions', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field2' },
            ],
            outputs: [
              {
                id: '3',
                name: 'Output1',
                type: 'string',
                field: 'field3',
                exception: 'field2',
              },
            ],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractUniqueInputs(nodes);
      expect(result).toEqual({
        uniqueInputs: [
          { id: '1', name: 'Input1', type: 'string', field: 'field1' },
          { id: '2', name: 'Input2', type: 'number', field: 'field2' },
        ],
      });
    });

    it('should handle multiple nodes with overlapping inputs and outputs', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
            outputs: [{ id: '2', name: 'Output1', type: 'string', field: 'field2' }],
          },
          id: 'testNode1',
        },
        {
          type: 'someType',
          content: {
            inputs: [
              { id: '3', name: 'Input3', type: 'boolean', field: 'field3' },
              { id: '4', name: 'Input4', type: 'number', field: 'field4' },
            ],
            outputs: [{ id: '5', name: 'Output2', type: 'boolean', field: 'field3' }],
          },
          id: 'testNode2',
        },
      ];

      const result = await service.extractUniqueInputs(nodes);
      expect(result).toEqual({
        uniqueInputs: [
          { id: '1', name: 'Input1', type: 'string', field: 'field1' },
          { id: '4', name: 'Input4', type: 'number', field: 'field4' },
        ],
      });
    });

    it('should handle nodes with exceptions correctly', async () => {
      const nodes: Node[] = [
        {
          type: 'someType',
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field2' },
            ],
            outputs: [
              {
                id: '3',
                name: 'Output1',
                type: 'string',
                field: 'field1',
                exception: 'field1',
              },
              {
                id: '4',
                name: 'Output2',
                type: 'number',
                field: 'field3',
                exception: 'field2',
              },
            ],
          },
          id: 'testNode',
        },
      ];

      const result = await service.extractUniqueInputs(nodes);
      expect(result).toEqual({
        uniqueInputs: [{ id: '2', name: 'Input2', type: 'number', field: 'field2' }],
      });
    });
  });

  describe('ruleSchema', () => {
    it('should generate a rule schema correctly', async () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'inputNode', // Assuming this node is an input node
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field2' },
            ],
          },
        },
        {
          id: '2',
          type: 'outputNode', // This node is the output node
          content: {
            outputs: [
              { id: '1', name: 'Output1', type: 'string', field: 'field2' },
              { id: '2', name: 'Output2', type: 'number', field: 'field3' },
            ],
          },
        },
      ];

      const edges = [{ id: '1', type: 'someType', targetId: '2', sourceId: '1' }]; // Edge connects input node to output node

      const result = await service.ruleSchema({ nodes, edges });
      expect(result).toEqual({
        inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
        outputs: [
          { id: '1', name: 'Output1', type: 'string', field: 'field2' },
          { id: '2', name: 'Output2', type: 'number', field: 'field3' },
        ],
        resultOutputs: [],
      });
    });

    it('should handle invalid request data', async () => {
      const ruleContent = { nodes: 'invalid' } as unknown as RuleContent;

      try {
        await service.ruleSchema(ruleContent);
        fail('Expected ruleSchema to throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidRuleContent);
        expect(error.message).toBe('Rule has no nodes');
      }
    });
    it('should handle nodes with inputs but no edges', async () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'inputNode',
          content: {
            inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
          },
        },
        {
          id: '1',
          type: 'outputNode',
          content: {
            outputs: [{ id: '1', name: 'Output1', type: 'string', field: 'field2' }],
          },
        },
      ];
      const edges: Edge[] = [];

      const result = await service.ruleSchema({ nodes, edges });
      expect(result).toEqual({
        inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
        outputs: [{ id: '1', name: 'Output1', type: 'string', field: 'field2' }],
        resultOutputs: [],
      });
    });

    it('should handle nodes with outputs but no edges', async () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'outputNode',
          content: {
            outputs: [{ id: '1', name: 'Output1', type: 'string', field: 'field2' }],
          },
        },
      ];
      const edges: Edge[] = [];

      const result = await service.ruleSchema({ nodes, edges });
      expect(result).toEqual({
        inputs: [],
        outputs: [{ id: '1', name: 'Output1', type: 'string', field: 'field2' }],
        resultOutputs: [],
      });
    });

    it('should handle nodes with both inputs and outputs correctly', async () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'inputNode',
          content: {
            inputs: [
              { id: '1', name: 'Input1', type: 'string', field: 'field1' },
              { id: '2', name: 'Input2', type: 'number', field: 'field2' },
            ],
          },
        },
        {
          id: '2',
          type: 'outputNode',
          content: {
            outputs: [
              { id: '1', name: 'Output1', type: 'string', field: 'field2' },
              { id: '2', name: 'Output2', type: 'number', field: 'field3' },
            ],
          },
        },
      ];
      const edges: Edge[] = [];

      const result = await service.ruleSchema({ nodes, edges });
      expect(result).toEqual({
        inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
        outputs: [
          { id: '1', name: 'Output1', type: 'string', field: 'field2' },
          { id: '2', name: 'Output2', type: 'number', field: 'field3' },
        ],
        resultOutputs: [],
      });
    });

    it('should handle nodes with decisionNode', async () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'decisionNode',
          content: {
            key: 'someKey',
          },
        },
        {
          id: '2',
          type: 'outputNode',
          content: {
            outputs: [
              { id: '1', name: 'Output1', type: 'string', field: 'field2' },
              { id: '2', name: 'Output2', type: 'number', field: 'field3' },
            ],
          },
        },
      ];
      const edges: Edge[] = [];

      // Mock the ruleSchemaFile method to return a sample schema
      jest.spyOn(service, 'ruleSchemaFile').mockResolvedValue({
        inputs: [{ id: '1', name: 'DecisionInput1', type: 'string', field: 'field1' }],
        resultOutputs: [{ id: '2', name: 'DecisionOutput1', type: 'number', field: 'field2' }],
      });

      const result = await service.ruleSchema({ nodes, edges });
      expect(result).toEqual({
        inputs: [{ id: '1', name: 'DecisionInput1', type: 'string', field: 'field1' }],
        outputs: [
          { id: '1', name: 'Output1', type: 'string', field: 'field2' },
          { id: '2', name: 'Output2', type: 'number', field: 'field3' },
        ],
        resultOutputs: [],
      });
    });
  });

  describe('evaluateRuleSchema', () => {
    it('should generate a rule schema correctly with single input and output', () => {
      const trace: TraceObject = {
        '1': {
          id: '1',
          order: 0,
          name: 'Test Rule',
          input: { field1: 'value1', field2: 'value2' },
          output: { outputField1: 'outputValue1' },
        },
      };

      const result = service.evaluateRuleSchema(trace);
      expect(result).toEqual({
        input: { field1: 'value1', field2: 'value2' },
        output: { outputField1: 'outputValue1' },
      });
    });

    it('should generate a rule schema correctly with multiple nested objects', () => {
      const trace: TraceObject = {
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

      const result = service.evaluateRuleSchema(trace);
      expect(result).toEqual({
        input: {
          field1: 'value1',
          field2: 'value2',
          field3: 'value3',
          field4: 'value4',
          field5: 'value5',
        },
        output: {
          outputField1: 'outputValue1',
          outputField2: 'outputValue2',
          outputField3: 'outputValue3',
        },
      });
    });

    it('should handle cases where there is no input', () => {
      const trace: TraceObject = {
        '1': {
          id: '1',
          order: 0,
          name: 'Test Rule',
          input: null,
          output: { outputField1: 'outputValue1' },
        },
      };

      const result = service.evaluateRuleSchema(trace);
      expect(result).toEqual({
        input: {},
        output: { outputField1: 'outputValue1' },
      });
    });

    it('should handle cases where there is no output', () => {
      const trace: TraceObject = {
        '1': {
          id: '1',
          order: 0,
          name: 'Test Rule',
          input: { field1: 'value1', field2: 'value2' },
          output: null,
        },
      };

      const result = service.evaluateRuleSchema(trace);
      expect(result).toEqual({
        input: { field1: 'value1', field2: 'value2' },
        output: {},
      });
    });

    it('should handle cases where there are no inputs and outputs', () => {
      const trace: TraceObject = {
        '1': {
          id: '1',
          order: 0,
          name: 'Test Rule',
          input: null,
          output: null,
        },
      };

      const result = service.evaluateRuleSchema(trace);
      expect(result).toEqual({
        input: {},
        output: {},
      });
    });
  });

  describe('ruleSchemaFile', () => {
    it('should generate a rule schema from a file', async () => {
      const mockFileContent = JSON.stringify({
        nodes: [
          {
            id: '1',
            type: 'inputNode', // Assuming this node is an input node
            content: {
              inputs: [
                { id: '1', name: 'Input1', type: 'string', field: 'field1' },
                { id: '2', name: 'Input2', type: 'number', field: 'field2' },
              ],
            },
          },
          {
            id: '2',
            type: 'outputNode', // This node is the output node
            content: {
              outputs: [
                { id: '3', name: 'Output1', type: 'string', field: 'field2' },
                { id: '4', name: 'Output2', type: 'number', field: 'field3' },
              ],
            },
          },
        ],
        edges: [
          {
            id: '1',
            type: 'someType',
            targetId: '2',
            sourceId: '1',
          },
        ],
      });

      const mockGetFileContent = jest.fn().mockResolvedValue(Buffer.from(mockFileContent));
      documentsService.getFileContent = mockGetFileContent;

      const filePath = 'path/to/mock/file.json';
      const result = await service.ruleSchemaFile(filePath);

      expect(mockGetFileContent).toHaveBeenCalledWith(filePath);
      expect(result).toEqual({
        resultOutputs: [],
        inputs: [{ id: '1', name: 'Input1', type: 'string', field: 'field1' }],
        outputs: [
          { id: '3', name: 'Output1', type: 'string', field: 'field2' },
          { id: '4', name: 'Output2', type: 'number', field: 'field3' },
        ],
      });
    });
  });

  describe('inputOutputSchema', () => {
    it('should throw an error if ruleContent is invalid or missing nodes', async () => {
      const invalidRuleContent = { nodes: null };

      await expect(service.inputOutputSchema(invalidRuleContent as any)).rejects.toThrowError(
        'Invalid rule content or missing nodes',
      );
    });

    it('should return empty inputs and resultOutputs if there are no input or output nodes', async () => {
      const ruleContent: RuleContent = { nodes: [], edges: [] };

      const result = await service.inputOutputSchema(ruleContent);

      expect(result).toEqual({ inputs: [], resultOutputs: [] });
    });

    it('should map input fields from inputNode and output fields from outputNode correctly', async () => {
      const ruleContent: RuleContent = {
        nodes: [
          {
            id: '1',
            type: 'inputNode',
            content: {
              fields: [
                { id: 'input1', name: 'Name', field: 'name', description: 'User name', dataType: 'string' },
                { id: 'input2', name: 'Age', field: 'age', description: 'User age', dataType: 'integer' },
              ],
            },
          },
          {
            id: '2',
            type: 'outputNode',
            content: {
              fields: [
                {
                  id: 'output1',
                  name: 'Eligibility',
                  field: 'eligibility',
                  description: 'Is eligible',
                  dataType: 'boolean',
                },
              ],
            },
          },
        ],
        edges: [],
      };

      const result = await service.inputOutputSchema(ruleContent);

      expect(result).toEqual({
        inputs: [
          {
            id: 'input1',
            name: 'Name',
            field: 'name',
            description: 'User name',
            type: 'string',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
          {
            id: 'input2',
            name: 'Age',
            field: 'age',
            description: 'User age',
            type: 'integer',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
        ],
        resultOutputs: [
          {
            id: 'output1',
            name: 'Eligibility',
            field: 'eligibility',
            description: 'Is eligible',
            type: 'boolean',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
        ],
      });
    });

    it('should correctly handle nested decisionNode and flatten the inputs and outputs', async () => {
      jest.spyOn(service, 'inputOutputSchemaFile').mockResolvedValue({
        inputs: [
          {
            id: 101,
            name: 'Income',
            field: 'income',
            description: 'Total annual income of the individual.',
            type: 'number-input',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: [],
          },
          {
            id: 102,
            name: 'Age',
            field: 'age',
            description: 'Age of the individual.',
            type: 'number-input',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: [],
          },
        ],
        resultOutputs: [],
      });

      const ruleContent: RuleContent = {
        nodes: [
          {
            id: '1',
            type: 'decisionNode',
            content: {
              key: 'nested-key',
            },
          },
          {
            id: '2',
            type: 'inputNode',
            content: {
              fields: [
                {
                  id: 1,
                  name: 'Employment Status',
                  field: 'employmentStatus',
                  description: 'Employment status of the individual.',
                  dataType: 'string',
                },
              ],
            },
          },
        ],
        edges: [],
      };

      const result = await service.inputOutputSchema(ruleContent);

      expect(result).toEqual({
        inputs: [
          {
            id: 1,
            name: 'Employment Status',
            field: 'employmentStatus',
            description: 'Employment status of the individual.',
            type: 'string',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
          {
            id: 101,
            name: 'Income',
            field: 'income',
            description: 'Total annual income of the individual.',
            type: 'number-input',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: [],
          },
          {
            id: 102,
            name: 'Age',
            field: 'age',
            description: 'Age of the individual.',
            type: 'number-input',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: [],
          },
        ],
        resultOutputs: [],
      });
    });

    it('should include inputs from both nested decisionNodes and inputNodes', async () => {
      const mockNestedSchema = {
        inputs: [
          {
            id: 1,
            name: 'Employment Status',
            field: 'employmentStatus',
            description: 'Employment status of the individual.',
            type: 'string',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: [],
          },
          {
            id: 101,
            name: 'Income',
            field: 'income',
            description: 'Total annual income of the individual.',
            type: 'number-input',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: [],
          },
        ],
        resultOutputs: [],
      };

      jest.spyOn(service, 'inputOutputSchemaFile').mockResolvedValue(mockNestedSchema);

      const ruleContent: RuleContent = {
        nodes: [
          {
            id: '1',
            type: 'decisionNode',
            content: {
              key: 'nested-key',
            },
          },
          {
            id: '2',
            type: 'inputNode',
            content: {
              fields: [
                {
                  id: 1,
                  name: 'Employment Status',
                  field: 'employmentStatus',
                  description: 'Employment status of the individual.',
                  dataType: 'string',
                },
              ],
            },
          },
          {
            id: '3',
            type: 'outputNode',
            content: {
              fields: [
                {
                  id: '201',
                  name: 'Eligibility Amount',
                  field: 'eligibilityAmount',
                  description: 'Amount eligible based on income.',
                  dataType: 'number-output',
                },
              ],
            },
          },
        ],
        edges: [],
      };

      const result = await service.inputOutputSchema(ruleContent);

      expect(result).toEqual({
        inputs: [
          {
            id: 1,
            name: 'Employment Status',
            field: 'employmentStatus',
            description: 'Employment status of the individual.',
            type: 'string',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
          {
            id: 1,
            name: 'Employment Status',
            field: 'employmentStatus',
            description: 'Employment status of the individual.',
            type: 'string',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: [],
          },
          {
            id: 101,
            name: 'Income',
            field: 'income',
            description: 'Total annual income of the individual.',
            type: 'number-input',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: [],
          },
        ],
        resultOutputs: [
          {
            id: '201',
            name: 'Eligibility Amount',
            field: 'eligibilityAmount',
            description: 'Amount eligible based on income.',
            type: 'number-output',
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
        ],
      });
    });
  });

  describe('inputOutputSchemaFile', () => {
    it('should generate a schema of inputs and outputs from a file', async () => {
      const mockFileContent = JSON.stringify({
        nodes: [
          {
            id: '1',
            type: 'inputNode',
            content: {
              fields: [
                { id: '1', name: 'Input1', dataType: 'string', field: 'field1' },
                { id: '2', name: 'Input2', dataType: 'number', field: 'field2' },
              ],
            },
          },
          {
            id: '2',
            type: 'outputNode',
            content: {
              fields: [
                { id: '3', name: 'Output1', dataType: 'string', field: 'field3' },
                { id: '4', name: 'Output2', dataType: 'number', field: 'field4' },
              ],
            },
          },
        ],
        edges: [
          {
            id: '1',
            type: 'someType',
            targetId: '2',
            sourceId: '1',
          },
        ],
      });

      const mockGetFileContent = jest.fn().mockResolvedValue(Buffer.from(mockFileContent));
      documentsService.getFileContent = mockGetFileContent;

      const filePath = 'path/to/mock/file.json';
      const result = await service.inputOutputSchemaFile(filePath);

      expect(mockGetFileContent).toHaveBeenCalledWith(filePath);

      expect(result).toEqual({
        inputs: [
          {
            id: '1',
            name: 'Input1',
            type: 'string',
            field: 'field1',
            description: undefined,
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
          {
            id: '2',
            name: 'Input2',
            type: 'number',
            field: 'field2',
            description: undefined,
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
        ],
        resultOutputs: [
          {
            id: '3',
            name: 'Output1',
            type: 'string',
            field: 'field3',
            description: undefined,
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
          {
            id: '4',
            name: 'Output2',
            type: 'number',
            field: 'field4',
            description: undefined,
            validationCriteria: undefined,
            validationType: undefined,
            childFields: undefined,
          },
        ],
      });
    });
  });
});
