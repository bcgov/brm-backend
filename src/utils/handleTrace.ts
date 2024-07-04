import { RuleSchema } from '../api/scenarioData/scenarioData.interface';
import { replaceSpecialCharacters } from './helpers';
import { TraceObject } from '../api/ruleMapping/ruleMapping.interface';

/**
 * Gets the property name from the trace object based on the id
 * @param id Id of the property
 * @param type Type of the trace object
 * @returns Property name
 */
export const getPropertyById = (id: string, ruleSchema: RuleSchema, type: 'input' | 'output') => {
  const schema = type === 'input' ? ruleSchema.inputs : ruleSchema.finalOutputs;
  const item = schema.find((item: any) => item.id === id);
  return item ? item.property : null;
};

/**
 * Maps a trace object to a structured object
 * @param trace Trace object
 * @param type Type of trace object
 * @returns Structured object
 */
export const mapTraceToResult = (trace: TraceObject, ruleSchema: RuleSchema, type: 'input' | 'output') => {
  const result: { [key: string]: any } = {};
  const schema = type === 'input' ? ruleSchema.inputs : ruleSchema.finalOutputs;

  for (const [key, value] of Object.entries(trace)) {
    const propertyUnformatted = getPropertyById(key, ruleSchema, type);
    const property = propertyUnformatted ? replaceSpecialCharacters(propertyUnformatted, '') : null;
    if (property) {
      result[property] = value;
    } else {
      // Direct match without id
      const directMatch = schema.find((item: any) => replaceSpecialCharacters(item.property, '') === key);
      if (directMatch) {
        const formattedKey = replaceSpecialCharacters(directMatch.property, '');
        result[formattedKey] = value;
      }
    }
  }

  return result;
};

/**
 * Maps a trace object to a structured object
 * @param trace Trace object
 * @param type Type of trace object
 * @returns Structured object
 */
// Function to map traces for inputs or outputs
export const mapTraces = (traces: any, ruleSchema: RuleSchema, type: 'input' | 'output') => {
  const result: { [key: string]: any } = {};
  for (const trace of Object.values(traces as TraceObject)) {
    if (type === 'input' && trace.input) {
      Object.assign(result, mapTraceToResult(trace.input, ruleSchema, type));
    }
    if (type === 'output' && trace.output) {
      Object.assign(result, mapTraceToResult(trace.output, ruleSchema, type));
    }
  }
  return result;
};