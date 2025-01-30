import { ZenEngineTrace } from '@gorules/zen-engine';
import { RuleField } from '../scenarioData/scenarioData.interface';

export interface Field {
  id: string | number;
  name?: string;
  type?: string;
  field?: string;
  label?: string;
  description?: string;
  dataType?: string;
  validationCriteria?: string;
  validationType?: string;
  child_fields?: Field[] | RuleField[];
  childFields?: Field[] | RuleField[];
}

export interface InputField extends Field {}

export interface OutputField extends Field {
  exception?: string;
}

export interface Expression {
  key: string;
  value: string;
}

export interface NodeContent {
  inputs?: InputField[];
  outputs?: OutputField[];
  expressions?: Expression[];
  key?: string;
  fields?: Field[];
}

export interface Node {
  id: any;
  type: string;
  content: NodeContent | string;
  name?: string;
}

export interface Edge {
  id: string;
  type: string;
  targetId: string;
  sourceId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface RuleContent {
  nodes: Node[];
  edges: Edge[];
}

export interface TraceObjectEntry extends ZenEngineTrace {
  id: string;
  name: string;
  input: any;
  output: any;
  performance?: string;
  traceData?: any;
}

export interface TraceObject {
  [key: string]: TraceObjectEntry;
}
