import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Variable } from '../scenarioData.schema';
import { ApiProperty } from '@nestjs/swagger';
import { variableExamples, scenarioExample } from '../../../examples/scenario.example';

export class VariableClass implements Variable {
  @ApiProperty({
    description: 'The name of the variable',
    example: variableExamples[0].name,
  })
  name: string;

  @ApiProperty({
    description: 'The value of the variable',
    example: variableExamples[0].value,
  })
  value: any;

  @ApiProperty({
    description: 'The data type of the variable',
    example: variableExamples[0].type,
  })
  type: string;
}

export class CreateScenarioDto {
  @ApiProperty({
    description: 'The title of the scenario',
    example: scenarioExample.title,
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The unique identifier of the rule the scenario is attached to',
    example: scenarioExample.ruleID,
  })
  @IsNotEmpty()
  @IsString()
  ruleID: string;

  @ApiProperty({
    type: [VariableClass],
    description: 'Array of input variables for the scenario',
    example: variableExamples,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => VariableClass)
  variables: VariableClass[];

  @ApiProperty({
    type: [VariableClass],
    description: 'Array of expected result outputs for the scenario',
    example: scenarioExample.expectedResults,
  })
  @ValidateNested({ each: true })
  @Type(() => VariableClass)
  expectedResults: VariableClass[];

  @ApiProperty({
    description: 'The filepath to the rule definition',
    example: scenarioExample.filepath,
  })
  @IsNotEmpty()
  @IsString()
  filepath: string;
}
