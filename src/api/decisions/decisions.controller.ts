import { Controller, Post, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DecisionsService } from './decisions.service';
import { EvaluateDecisionDto, EvaluateDecisionWithContentDto } from './dto/evaluate-decision.dto';
import { ValidationError } from './validations/validation.error';
import { ruleExample } from '../../examples/rule.example';
import { decisionExample } from '../../examples/decision.example';

@Controller('api/decisions')
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Post('/evaluate')
  @ApiOperation({ summary: 'Evaluate a decision by its rule content' })
  @ApiBody({
    type: EvaluateDecisionWithContentDto,
    description: 'The decision rule content, decision context, and trace status.',
  })
  @ApiResponse({
    status: 201,
    description: 'Decision evaluated successfully',
    schema: { example: decisionExample },
  })
  async evaluateDecisionByContent(@Body() { ruleContent, context, trace, ruleDir }: EvaluateDecisionWithContentDto) {
    try {
      return await this.decisionsService.runDecisionByContent(JSON.parse(ruleContent), context, { trace }, ruleDir);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      } else {
        console.error(error);
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Post('/evaluateByFile')
  @ApiOperation({ summary: 'Evaluate a decision by rule file name' })
  @ApiQuery({
    name: 'ruleFileName',
    description: 'The path to the rule file to evaluate',
    example: ruleExample.filepath,
    required: true,
  })
  @ApiBody({
    type: EvaluateDecisionDto,
    description: 'The decision context, including variable properties and values, and trace status.',
  })
  @ApiResponse({
    status: 201,
    description: 'Decision evaluated successfully',
    schema: { example: decisionExample },
  })
  async evaluateDecisionByFile(
    @Query('ruleFileName') ruleFileName: string,
    @Body() { context, trace, ruleDir }: EvaluateDecisionDto,
  ) {
    try {
      return await this.decisionsService.runDecisionByFile(ruleFileName, context, { trace }, ruleDir);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
