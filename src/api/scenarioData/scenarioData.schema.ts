import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { variableExamples, scenarioExample, expectedResultsExample } from '../../examples/scenario.example';

export type ScenarioDataDocument = ScenarioData & Document;
export interface Variable {
  name: string;
  value: any;
  type?: string;
}

@Schema()
export class VariableSchema {
  @ApiProperty({
    description: 'The name of the variable',
    example: variableExamples[0].name,
  })
  @Prop({ required: true, type: String })
  name: string;

  @ApiProperty({
    description: 'The value of the variable',
    example: variableExamples[0].value,
  })
  @Prop({ required: true, type: {} })
  value: any;

  @ApiProperty({
    description: 'The data type of the variable',
    example: variableExamples[0].type,
  })
  @Prop({ required: false, type: String, default: '' })
  type: string;
}

const VariableModelSchema = SchemaFactory.createForClass(VariableSchema);

// impute the type of the value if not provided
VariableModelSchema.pre<Variable>('save', function (next) {
  if (!this.type) {
    this.type = typeof this.value;
  }
  next();
});

@Schema()
export class ScenarioData {
  @ApiProperty({
    description: 'The title of the scenario',
    example: scenarioExample.title,
  })
  @Prop({ description: 'The title of the scenario' })
  title: string;

  @ApiProperty({
    description: 'The unique identifier of the rule the scenario is attached to',
    example: scenarioExample.ruleID,
  })
  @Prop({
    ref: 'RuleData',
    required: true,
    description: 'The ID of the rule',
  })
  ruleID: string;

  @ApiProperty({
    type: [VariableSchema],
    description: 'Array of input variables for the scenario',
    example: variableExamples,
  })
  @Prop({
    required: true,
    description: 'The variables of the scenario',
    type: [VariableModelSchema],
  })
  variables: Variable[];

  @ApiProperty({
    type: [VariableSchema],
    description: 'Array of expected result outputs for the scenario',
    example: expectedResultsExample,
  })
  @Prop({
    required: false,
    description: 'The expected result of the scenario',
    type: [VariableModelSchema],
  })
  expectedResults: Variable[];

  @ApiProperty({
    description: 'The filepath to the rule definition',
    example: scenarioExample.filepath,
  })
  @Prop({ required: true, description: 'The filename of the JSON file containing the rule' })
  filepath: string;
}

export const ScenarioDataSchema = SchemaFactory.createForClass(ScenarioData);
