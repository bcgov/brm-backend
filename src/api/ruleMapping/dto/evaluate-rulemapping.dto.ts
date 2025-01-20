import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiExtraModels, ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Edge, Node, TraceObject, TraceObjectEntry, NodeContent } from '../ruleMapping.interface';
import { ruleContentExample } from '../../../examples/rule.example';
import { decisionExample } from '../../../examples/decision.example';

export class EdgeClass implements Edge {
  @ApiProperty({
    description: 'Unique identifier for the edge',
    example: 'aed0501a-8138-4cfa-b7f3-7b8eee7807c9',
  })
  id: string;

  @ApiProperty({
    description: 'The type of the edge',
    example: 'edge',
  })
  type: string;

  @ApiProperty({
    description: 'ID of the target node',
    example: 'd5c6c7df-dc16-47d4-b84d-e005893ee2d1',
  })
  targetId: string;

  @ApiProperty({
    description: 'ID of the source node',
    example: '533fcf7b-c45d-45fd-b1e9-3099217d9ded',
  })
  sourceId: string;

  @ApiProperty({
    description: 'Handle identifier for the source connection point',
    example: '38203cc4-5089-4ed7-b19c-58a99b65e545',
    required: false,
  })
  sourceHandle?: string;

  @ApiProperty({
    description: 'Handle identifier for the target connection point',
    example: '7b088ca1-2314-45ec-835c-c38e66f7cb5c',
    required: false,
  })
  targetHandle?: string;

  constructor(
    id: string,
    type: string,
    targetId: string,
    sourceId: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) {
    this.id = id;
    this.type = type;
    this.targetId = targetId;
    this.sourceId = sourceId;
    this.sourceHandle = sourceHandle;
    this.targetHandle = targetHandle;
  }
}

export class NodeClass implements Node {
  @ApiProperty({
    description: 'Unique identifier for the node',
    example: '8ac97728-c53d-441b-8c4f-cbce96bbbfb1',
  })
  id: string;

  @ApiProperty({
    description: 'Type of the node',
    example: 'inputNode',
  })
  type: string;

  @ApiProperty({
    description: 'Content of the node',
    example: ruleContentExample.nodes[0].content,
  })
  content: NodeContent | string;

  constructor(id: string, type: string, content: NodeContent | string) {
    this.id = id;
    this.type = type;
    this.content = content;
  }
}

@ApiExtraModels()
@ApiSchema({ description: 'Trace details from rule run' })
export class TraceObjectEntryClass implements TraceObjectEntry {
  @ApiProperty({
    example: 'bd7103da-9a6e-4fbd-ba14-12008e3cd61c',
    description: 'Unique identifier for the trace entry',
  })
  id: string;

  @ApiProperty({
    example: 'Calculate Age',
    description: 'Name of the operation',
  })
  name: string;

  @ApiProperty({
    description: 'Input data for the operation',
  })
  input: any;

  @ApiProperty({
    description: 'Output data from the operation',
  })
  output: any;

  @ApiProperty({
    example: '207.958µs',
    description: 'Execution time of the operation',
    required: false,
  })
  performance?: string;

  @ApiProperty({
    description: 'Additional trace information',
    required: false,
  })
  traceData?: any;

  constructor(id: string, name: string, input: any, output: any, performance?: string, traceData?: any) {
    this.id = id;
    this.name = name;
    this.input = input;
    this.output = output;
    this.performance = performance;
    this.traceData = traceData;
  }
}

@ApiSchema({ description: 'Trace information from the rule execution' })
export class TraceObjectClass implements TraceObject {
  [key: string]: TraceObjectEntryClass;

  constructor(entries: { [key: string]: TraceObjectEntryClass }) {
    Object.assign(this, entries);
  }
}

export class EvaluateRuleMappingDto {
  @ApiProperty({
    description: 'Array of nodes representing the rule mapping',
    type: [NodeClass],
    example: ruleContentExample.nodes,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeClass)
  nodes: Node[];

  @ApiProperty({
    description: 'Array of edges connecting the nodes',
    type: [EdgeClass],
    example: ruleContentExample.edges,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EdgeClass)
  edges: Edge[];
}

export class EvaluateRuleRunSchemaDto {
  @ApiProperty({
    type: TraceObjectClass,
    description: 'Trace information from the rule execution',
    example: decisionExample.trace,
  })
  @ValidateNested()
  @Type(() => TraceObjectClass)
  trace: TraceObject;
}
