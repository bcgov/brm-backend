import { Injectable } from '@nestjs/common';
import { Node, Edge, TraceObject, Field, RuleContent } from './ruleMapping.interface';
import { RuleDataService } from '../ruleData/ruleData.service';
import { RuleSchema, RuleField } from '../scenarioData/scenarioData.interface';
export class InvalidRuleContent extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRuleContentError';
  }
}

@Injectable()
export class RuleMappingService {
  constructor(private ruleDataService: RuleDataService) {}

  // Extract all fields from a list of nodes
  async extractFields(
    ruleDir: string,
    nodes: Node[],
    fieldKey: 'inputs' | 'outputs',
  ): Promise<{ [key: string]: any[] }> {
    const promises = nodes.map(async (node: any) => {
      if (node.type === 'decisionNode' && node.content?.key) {
        const generateNestedSchema = await this.ruleSchemaFile(ruleDir, node.content.key);
        const { inputs, resultOutputs } = generateNestedSchema;
        return fieldKey === 'inputs' ? inputs : resultOutputs;
      }
      if (node.type === 'expressionNode' && node.content?.expressions) {
        const simpleExpressionRegex = /^[a-zA-Z0-9]+$/;
        return node.content.expressions.map((expr: { key: any; value: any }) => {
          const isSimpleValue = simpleExpressionRegex.test(expr.value);
          return {
            key: isSimpleValue ? (fieldKey === 'inputs' ? expr.key : expr.value) : expr.key,
            field: isSimpleValue ? (fieldKey === 'inputs' ? expr.value : expr.key) : expr.key,
            exception: isSimpleValue ? null : expr.value,
          };
        });
      } else {
        return (node.content?.[fieldKey] || []).map((field: Field) => ({
          id: field.id,
          name: field.name,
          type: field.type,
          field: field.field,
        }));
      }
    });

    const results = await Promise.all(promises);
    const fields = results.flat();

    const uniqueFieldsMap = new Map(fields.map((field) => [field.field, field]));

    const uniqueFields = Array.from(uniqueFieldsMap.values());
    return { [fieldKey]: uniqueFields };
  }

  // Get the final outputs of a rule from mapping the target output nodes and the edges
  async extractResultOutputs(ruleDir: string, nodes: Node[], edges: Edge[]): Promise<{ resultOutputs: any[] }> {
    // Find the output node
    const outputNode = nodes.find((obj) => obj.type === 'outputNode');

    if (!outputNode) {
      throw new Error('No outputNode found in the nodes array');
    }

    const outputNodeID = outputNode.id;

    // Find the edges that connect the output node to other nodes
    const targetEdges = edges.filter((edge) => edge.targetId === outputNodeID);
    const targetOutputNodes = targetEdges.map((edge) => nodes.find((node) => node.id === edge.sourceId));
    const resultOutputs: any[] = (await this.extractFields(ruleDir, targetOutputNodes, 'outputs')).outputs;

    return { resultOutputs };
  }

  async extractInputsAndOutputs(ruleDir: string, nodes: Node[]): Promise<{ inputs: any[]; outputs: any[] }> {
    const inputs: any[] = (await this.extractFields(ruleDir, nodes, 'inputs')).inputs;
    const outputs: any[] = (await this.extractFields(ruleDir, nodes, 'outputs')).outputs;

    return { inputs, outputs };
  }

  // Find unique fields that are not present in another set of fields
  findUniqueFields(fields: any[], otherFields: Set<string>): { [key: string]: any } {
    const uniqueFields: { [key: string]: any } = {};
    fields.forEach((field) => {
      const fieldValue = field.field;
      if (!otherFields.has(fieldValue)) {
        uniqueFields[fieldValue] = field;
      }
    });
    return uniqueFields;
  }

  // check for presence of goRules expression in string
  private isExpressionFunction(expression: string): boolean {
    const functionPatterns = [
      'none(',
      'map(',
      'flatMap(',
      'filter(',
      'some(',
      'all(',
      'count(',
      'contains(',
      'flatten(',
      'sum(',
      'avg(',
      'min(',
      'max(',
      'mean(',
      'mode(',
      'len(',
      '$root',
    ];
    return functionPatterns.some((pattern) => expression.includes(pattern));
  }

  // Check if the key is being transformed (used in an operation)
  private isTransformation(expression: string, key: string): boolean {
    const cleanExpression = expression.replace(/\s/g, '');
    if (cleanExpression === key) return true;
    const operatorPattern = new RegExp(`${key}[^=]*[+\\-*/%?:]`);
    return operatorPattern.test(expression);
  }

  // extract only the unique inputs from a list of nodes
  // excludes inputs found in the outputs of other nodes
  // inputs that are only transformed are still included as unique as marked as exception
  async extractUniqueInputs(ruleDir: string, nodes: Node[]): Promise<{ uniqueInputs: any[] }> {
    const { inputs, outputs } = await this.extractInputsAndOutputs(ruleDir, nodes);
    const outputFields = new Set(
      outputs
        .filter((outputField) => {
          if (!outputField.exception) return true;
          if (!outputField.key) return true;
          if (this.isExpressionFunction(outputField.exception)) {
            return true;
          }
          return !this.isTransformation(outputField.exception, outputField.key);
        })
        .map((outputField) => outputField.field),
    );
    const uniqueInputFields = this.findUniqueFields(inputs, outputFields);

    return {
      uniqueInputs: Object.values(uniqueInputFields),
    };
  }

  // generate a rule schema from a list of nodes that represent the origin inputs and all outputs of a rule
  async ruleSchema(ruleDir: string, ruleContent: RuleContent): Promise<RuleSchema> {
    if (!ruleContent) {
      throw new InvalidRuleContent('No content');
    }
    const { nodes, edges } = ruleContent;
    if (!nodes || !Array.isArray(nodes)) {
      throw new InvalidRuleContent('Rule has no nodes');
    }
    const inputs: any[] = (await this.extractUniqueInputs(ruleDir, nodes)).uniqueInputs;
    const generalOutputs: any[] = (await this.extractFields(ruleDir, nodes, 'outputs')).outputs;
    const resultOutputs: any[] = (await this.extractResultOutputs(ruleDir, nodes, edges)).resultOutputs;

    // get unique outputs excluding final outputs
    const outputs: any[] = generalOutputs.filter(
      (output) =>
        !resultOutputs.some(
          (resultOutput) =>
            resultOutput.id === output.id || (resultOutput.key === output.key && resultOutput.field === output.field),
        ),
    );

    return { inputs, outputs, resultOutputs };
  }

  // generate a rule schema from a given rule filepath
  async ruleSchemaFile(ruleDir: string, ruleFilepath: string): Promise<any> {
    const fileContent = await this.ruleDataService.getContentForRuleFromFilepath(ruleFilepath, ruleDir);
    const ruleContent = await JSON.parse(fileContent.toString());
    return this.ruleSchema(ruleDir, ruleContent);
  }

  // generate a schema for the inputs and outputs of a rule given the trace data of a rule run
  evaluateRuleSchema(trace: TraceObject): {
    input: any;
    output: any;
  } {
    const output: any = {};
    const input: any = {};
    for (const traceId in trace) {
      if (trace.hasOwnProperty(traceId)) {
        const traceData = trace[traceId];
        if (traceData.output !== null && traceData.output !== undefined) {
          Object.assign(output, traceData.output);
        }
        if (traceData.input !== null && traceData.input !== undefined) {
          Object.assign(input, traceData.input);
        }
      }
    }
    return { input, output };
  }

  async inputOutputSchema(ruleDir: string, ruleContent: RuleContent): Promise<RuleSchema> {
    if (!ruleContent || !Array.isArray(ruleContent.nodes)) {
      throw new Error('Invalid rule content or missing nodes');
    }

    const flattenNodes = async (nodes: Node[]): Promise<{ resultInput: RuleField[]; resultOutput: RuleField[] }> => {
      const resultInput: RuleField[] = [];
      const resultOutput: RuleField[] = [];

      for (const node of nodes) {
        if (node.type === 'decisionNode' && typeof node.content === 'object' && node.content?.key) {
          const generateNestedInputs = await this.inputOutputSchemaFile(node.content.key, ruleDir);
          const { inputs, resultOutputs } = generateNestedInputs;
          resultInput.push(...inputs.map((input) => ({ ...input, nested: node?.name ?? true })));
          resultOutput.push(...resultOutputs);
        }
      }

      return { resultInput, resultOutput };
    };

    // Helper function to map fields to the desired format
    const mapFields = (fields: Field[]): RuleField[] =>
      fields.map((field) => ({
        id: field.id,
        name: field.name,
        field: field.field,
        description: field.description,
        type: field.dataType,
        validationCriteria: field.validationCriteria,
        validationType: field.validationType,
        childFields: field.childFields,
      }));

    // Extract inputs from 'inputNode' type
    const inputNodes = ruleContent.nodes.filter((node) => node.type === 'inputNode');
    let inputs = inputNodes.flatMap((node) =>
      typeof node.content === 'object' && 'fields' in node.content ? mapFields(node.content.fields || []) : [],
    );

    // Fetch and concatenate nested inputs
    const nestedInputs = await flattenNodes(ruleContent.nodes);
    const filteredInputs = nestedInputs.resultInput.filter(
      (input) => !nestedInputs.resultOutput.some((output) => output.id === input.id),
    );
    inputs = inputs.concat(filteredInputs);

    // Extract outputs from 'outputNode' type
    const outputNodes = ruleContent.nodes.filter((node) => node.type === 'outputNode');
    const resultOutputs = outputNodes.flatMap((node) =>
      typeof node.content === 'object' && 'fields' in node.content ? mapFields(node.content.fields || []) : [],
    );

    // Return the schema with inputs and outputs
    return { inputs, resultOutputs };
  }

  async inputOutputSchemaFile(ruleFilepath: string, ruleDir: string = ''): Promise<RuleSchema> {
    const fileContent = await this.ruleDataService.getContentForRuleFromFilepath(ruleFilepath, ruleDir);
    const ruleContent = JSON.parse(fileContent.toString());
    return this.inputOutputSchema(ruleDir, ruleContent);
  }
}
