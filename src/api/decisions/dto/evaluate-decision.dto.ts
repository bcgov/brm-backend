import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsBoolean, IsObject } from 'class-validator';
import { ruleContentExample, ruleInputs } from '../../../examples/rule.example';

@ApiSchema({ description: 'DTO for evaluating a decision' })
export class EvaluateDecisionDto {
  @ApiProperty({
    example: ruleInputs,
    description: 'The context object containing input data for the decision evaluation.',
  })
  @IsObject()
  context: object;

  @ApiProperty({
    example: true,
    description: 'Whether to include execution trace information in the response.',
  })
  @IsBoolean()
  trace: boolean;

  @ApiProperty({
    example: 'prod',
    description: 'The directory with rules to evaluate.',
  })
  ruleDir: string;
}

@ApiSchema({ description: 'DTO for evaluating a decision with rule content' })
export class EvaluateDecisionWithContentDto extends EvaluateDecisionDto {
  @ApiProperty({
    example: ruleContentExample,
    description:
      'The rule content containing nodes and edges that define the decision logic. The nodes represent the decision logic components and the edges represent the connections between them.',
  })
  @IsObject()
  ruleContent: string;
}
