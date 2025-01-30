export interface RuleField {
  id: string | number;
  name?: string;
  field?: string;
  description?: string;
  type?: string;
  validationCriteria?: string;
  validationType?: string;
  childFields?: RuleField[];
  nested?: boolean | string;
}

export interface RuleSchema {
  inputs: RuleField[];
  outputs?: RuleField[];
  resultOutputs: RuleField[];
}

export interface RuleRunResults {
  [scenarioId: string]: any;
}
