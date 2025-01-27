import { getPropertyById, mapTraceToResult, mapTraces } from './handleTrace';
import { RuleSchema } from '../api/scenarioData/scenarioData.interface';
import { TraceObject, TraceObjectEntry } from '../api/ruleMapping/ruleMapping.interface';

describe('Rule Utility Functions', () => {
  const mockRuleSchema: RuleSchema = {
    inputs: [
      { id: 'input1', field: 'Input Field 1' },
      { id: 'input2', field: 'Input Field 2' },
    ],
    resultOutputs: [
      { id: 'output1', field: 'Output Field 1' },
      { id: 'output2', field: 'Output Field 2' },
    ],
  };

  describe('getPropertyById', () => {
    it('should return the property name for input', () => {
      const result = getPropertyById('input1', mockRuleSchema, 'input');
      expect(result).toBe('Input Field 1');
    });

    it('should return the property name for output', () => {
      const result = getPropertyById('output1', mockRuleSchema, 'output');
      expect(result).toBe('Output Field 1');
    });

    it('should return null for non-existing id', () => {
      const result = getPropertyById('nonExistingId', mockRuleSchema, 'input');
      expect(result).toBeNull();
    });
  });

  describe('mapTraceToResult', () => {
    it('should map trace to result for input', () => {
      const trace: TraceObjectEntry = {
        id: 'trace1',
        order: 1,
        name: 'trace1',
        input: { input1: 'value1', input2: 'value2' },
        output: {},
      };
      const result = mapTraceToResult(trace.input, mockRuleSchema, 'input');
      expect(result).toEqual({
        'Input Field 1': 'value1',
        'Input Field 2': 'value2',
      });
    });

    it('should map trace to result for output', () => {
      const trace: TraceObjectEntry = {
        id: 'trace1',
        order: 1,
        name: 'trace1',
        input: {},
        output: { output1: 'value1', output2: 'value2' },
      };
      const result = mapTraceToResult(trace.output, mockRuleSchema, 'output');
      expect(result).toEqual({
        'Output Field 1': 'value1',
        'Output Field 2': 'value2',
      });
    });

    it('should map nested objects in trace', () => {
      const trace: TraceObjectEntry = {
        id: 'trace1',
        order: 1,
        name: 'trace1',
        input: { input1: { nestedKey: 'nestedValue' }, input2: 'value2' },
        output: {},
      };
      const result = mapTraceToResult(trace.input, mockRuleSchema, 'input');
      expect(result).toEqual({
        'Input Field 1': { nestedKey: 'nestedValue' },
        'Input Field 2': 'value2',
      });
    });

    it('should map array values in trace', () => {
      const trace: TraceObjectEntry = {
        id: 'trace1',
        order: 1,
        name: 'trace1',
        input: {
          input1: ['value1', 'value2'],
          input2: 'value3',
        },
        output: {},
      };
      const result = mapTraceToResult(trace.input, mockRuleSchema, 'input');
      expect(result).toEqual({
        'Input Field 1': ['value1', 'value2'],
        'Input Field 2': 'value3',
      });
    });

    it('should handle object entries correctly', () => {
      const trace: TraceObjectEntry = {
        id: 'trace1',
        order: 1,
        name: 'trace1',
        input: {
          input1: { key1: 'value1', key2: 'value2' },
          input2: 'value3',
        },
        output: {},
      };
      const result = mapTraceToResult(trace.input, mockRuleSchema, 'input');
      expect(result).toEqual({
        'Input Field 1': { key1: 'value1', key2: 'value2' },
        'Input Field 2': 'value3',
      });
    });
  });

  describe('mapTraces', () => {
    it('should map multiple traces for input', () => {
      const traces: TraceObject = {
        trace1: { id: 'trace1', order: 1, name: 'trace1', input: { input1: 'value1' }, output: {} },
        trace2: { id: 'trace2', order: 2, name: 'trace2', input: { input2: 'value2' }, output: {} },
      };
      const result = mapTraces(traces, mockRuleSchema, 'input');
      expect(result).toEqual({
        'Input Field 1': 'value1',
        'Input Field 2': 'value2',
      });
    });

    it('should map multiple traces for output', () => {
      const traces: TraceObject = {
        trace1: { id: 'trace1', order: 1, name: 'trace1', input: {}, output: { output1: 'value1' } },
        trace2: { id: 'trace2', order: 2, name: 'trace2', input: {}, output: { output2: 'value2' } },
      };
      const result = mapTraces(traces, mockRuleSchema, 'output');
      expect(result).toEqual({
        'Output Field 1': 'value1',
        'Output Field 2': 'value2',
      });
    });
  });

  describe('mapTraceToResult - object handling in trace', () => {
    const mockSchema: RuleSchema = {
      inputs: [
        { field: 'nestedObjectKey', id: '1' },
        { field: 'validKey', id: '5' },
        { field: 'emptyObjectKey', id: '2' },
      ],
      resultOutputs: [{ field: 'outputField', id: '2' }],
    };

    it('should correctly map nested objects in trace to result with appropriate keys', () => {
      const trace: TraceObject = {
        nestedObjectKey: {
          id: '1',
          order: 1,
          name: 'Test Entry',
          input: {},
          output: {},
          traceData: {
            first: { nestedField: 'value1' },
            second: { nestedField: 'value2' },
          },
        },
      };

      const result = mapTraceToResult(trace, mockSchema, 'input');
      console.log('Test Result (nested objects):', result);

      expect(result).toEqual({
        nestedObjectKey: {
          name: 'Test Entry',
          id: '1',
          order: 1,
          input: {},
          output: {},
          traceData: { first: { nestedField: 'value1' }, second: { nestedField: 'value2' } },
        },
        'nestedObjectKey[4]nestedObjectKey': {},
        'nestedObjectKey[5]nestedObjectKey': {},
        'nestedObjectKey[6]first': {
          nestedField: 'value1',
        },
        'nestedObjectKey[6]second': { nestedField: 'value2' },
      });
    });

    it('should map an empty object in trace correctly with the appropriate key format', () => {
      const trace: TraceObject = {
        emptyObjectKey: {
          id: '2',
          order: 1,
          name: 'Empty Object Entry',
          input: {},
          output: {},
          traceData: {
            first: {},
          },
        },
      };

      const result = mapTraceToResult(trace, mockSchema, 'output');
      console.log('Test Result (empty object):', result);

      expect(result).toEqual({});
    });

    it('should ignore keys $ and $nodes even if they exist in trace', () => {
      const trace: TraceObject = {
        $: {
          id: '3',
          order: 2,
          name: 'Dollar Entry',
          input: {},
          output: {},
        },
        $nodes: {
          id: '4',
          order: 3,
          name: 'Nodes Entry',
          input: {},
          output: {},
        },
        validKey: {
          id: '5',
          order: 4,
          name: 'Valid Entry',
          input: {},
          output: {},
          traceData: {
            first: { someField: 'validValue' },
          },
        },
      };

      const result = mapTraceToResult(trace, mockSchema, 'input');
      console.log('Test Result (ignore $ and $nodes):', result);

      expect(result).toEqual({
        validKey: {
          id: '5',
          order: 4,
          name: 'Valid Entry',
          input: {},
          output: {},
          traceData: {
            first: { someField: 'validValue' },
          },
        },
        'validKey[4]validKey': {},
        'validKey[5]validKey': {},
        'validKey[6]first': {
          someField: 'validValue',
        },
      });
    });

    it('should not map a trace key if it does not exist on schema', () => {
      const trace: TraceObject = {
        unrelatedKey: {
          id: '6',
          order: 5,
          name: 'Unrelated Entry',
          input: {},
          output: {},
          traceData: {
            first: { unrelatedField: 'shouldNotMap' },
          },
        },
      };

      const result = mapTraceToResult(trace, mockSchema, 'input');
      console.log('Test Result (unrelated key):', result);

      expect(result).toEqual({});
    });
  });
});
