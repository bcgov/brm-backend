import { Injectable } from '@nestjs/common';
import { Node, Edge } from './ruleMapping.interface';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class RuleMappingService {
  extractInputs(nodes: Node[]): {
    inputs: any[];
  } {
    const inputs: any[] = [];

    nodes.forEach((node) => {
      if (node.content) {
        if (node.content.inputs) {
          node.content.inputs.forEach((inputField) => {
            inputs.push({
              id: inputField.id,
              name: inputField.name,
              type: inputField.type,
              property: inputField.field,
            });
          });
        }
        if (node.type === 'expressionNode') {
          node.content.expressions?.forEach((expr) => {
            inputs.push({
              key: expr.key,
              property: expr.value,
            });
          });
        }
      }
    });

    return { inputs };
  }

  extractOutputs(nodes: Node[]): {
    outputs: any[];
  } {
    const outputs: any[] = [];
    nodes.forEach((node) => {
      if (node.content) {
        if (node.content.outputs) {
          node.content.outputs.forEach((outputField) => {
            outputs.push({
              id: outputField.id,
              name: outputField.name,
              type: outputField.type,
              property: outputField.field,
            });
          });
        }
        if (node.type === 'expressionNode') {
          node.content.expressions?.forEach((expr) => {
            outputs.push({
              key: expr.value,
              property: expr.key,
            });
          });
        }
      }
    });

    return { outputs };
  }

  // Get the final outputs of a rule from mapping the target output nodes and the edges
  extractfinalOutputs(
    nodes: Node[],
    edges: Edge[],
  ): {
    finalOutputs: any[];
  } {
    // Find the output node
    const outputNode = nodes.find((obj) => obj.type === 'outputNode');

    if (!outputNode) {
      throw new Error('No outputNode found in the nodes array');
    }

    const outputNodeID = outputNode.id;
    const targetEdges = edges.filter((edge) => edge.targetId === outputNodeID);
    const targetOutputNodes = targetEdges.map((edge) => nodes.find((node) => node.id === edge.sourceId));
    const finalOutputs: any[] = this.extractOutputs(targetOutputNodes).outputs;

    return { finalOutputs };
  }

  extractInputsAndOutputs(nodes: Node[]): {
    inputs: any[];
    outputs: any[];
  } {
    const inputs: any[] = this.extractInputs(nodes).inputs;
    const outputs: any[] = this.extractOutputs(nodes).outputs;
    return { inputs, outputs };
  }

  /**
   * Find unique fields that are not present in another set of fields.
   * @param fields - An array of field objects.
   * @param otherFields - A set of field names to compare against.
   * @returns An object containing the unique fields.
   */
  findUniqueFields(fields: any[], otherFields: Set<string>): { [key: string]: any } {
    const uniqueFields: { [key: string]: any } = {};
    fields.forEach((field) => {
      const fieldValue = field.property;
      if (!otherFields.has(fieldValue)) {
        uniqueFields[fieldValue] = field;
      }
    });
    return uniqueFields;
  }

  extractUniqueInputs(nodes: Node[]) {
    const { inputs, outputs } = this.extractInputsAndOutputs(nodes);
    const outputFields = new Set(outputs.map((outputField) => outputField.property));
    const uniqueInputFields = this.findUniqueFields(inputs, outputFields);

    return {
      uniqueInputs: Object.values(uniqueInputFields),
    };
  }

  // generate a rule schema from a list of nodes that represent the origin inputs and all outputs of a rule
  ruleSchema(
    nodes: Node[],
    edges: Edge[],
  ): {
    inputs: any[];
    outputs: any[];
    finalOutputs: any[];
  } {
    const inputs: any[] = this.extractUniqueInputs(nodes).uniqueInputs;
    const generalOutputs: any[] = this.extractOutputs(nodes).outputs;
    const finalOutputs: any[] = this.extractfinalOutputs(nodes, edges).finalOutputs;

    //get unique outputs excluding final outputs
    const outputs: any[] = generalOutputs.filter(
      (output) =>
        !finalOutputs.some(
          (finalOutput) =>
            finalOutput.id === output.id ||
            (finalOutput.key === output.key && finalOutput.property === output.property),
        ),
    );

    return { inputs, outputs, finalOutputs };
  }

  // generate a rule schema from a given local file
  async ruleSchemaFile(filePath: string): Promise<any> {
    const documentsService = new DocumentsService();
    const fileContent = await documentsService.getFileContent(filePath);
    const { nodes, edges } = await JSON.parse(fileContent.toString());
    return this.ruleSchema(nodes, edges);
  }
}
