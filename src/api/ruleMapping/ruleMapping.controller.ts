import { Controller, Res, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { RuleMappingService, InvalidRuleContent } from './ruleMapping.service';
import { Response } from 'express';
import { EvaluateRuleRunSchemaDto, EvaluateRuleMappingDto } from './dto/evaluate-rulemapping.dto';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ruleContentExample, ruleExample, ruleInputMetadata, ruleOutputMetadata } from '../../examples/rule.example';
import { decisionExample } from '../../examples/decision.example';

@Controller('api/rulemap')
export class RuleMappingController {
  constructor(private ruleMappingService: RuleMappingService) {}

  // Map a rule file to its unique inputs, and all outputs
  @Post('/')
  @ApiOperation({ summary: 'Map a rule file to its unique inputs, and all outputs' })
  @ApiBody({
    schema: {
      example: {
        filepath: ruleExample.filepath,
        ruleContent: ruleContentExample,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Rule schema mapping generated successfully',
    schema: {
      example: {
        inputs: ruleInputMetadata,
        resultOutputs: ruleOutputMetadata,
      },
    },
  })
  async getRuleSchema(
    @Body('filepath') filepath: string,
    @Body('ruleContent') ruleContent: EvaluateRuleMappingDto,
    @Res() res: Response,
  ) {
    const rulemap = await this.ruleMappingService.inputOutputSchema(ruleContent);

    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filepath}`);
      res.send(rulemap);
    } catch (error) {
      if (error instanceof InvalidRuleContent) {
        throw new HttpException('Invalid rule content', HttpStatus.BAD_REQUEST);
      } else {
        throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  // Map a rule to its unique inputs, and all outputs
  @Post('/evaluate')
  @ApiOperation({ summary: 'Evaluate rule mapping' })
  @ApiBody({ type: EvaluateRuleMappingDto })
  @ApiResponse({
    status: 201,
    description: 'Rule mapping evaluated successfully',
    schema: {
      example: {
        result: {
          inputs: ruleInputMetadata,
          resultOutputs: ruleOutputMetadata,
        },
      },
    },
  })
  async evaluateRuleMap(@Body() ruleContent: EvaluateRuleMappingDto) {
    try {
      const result = await this.ruleMappingService.inputOutputSchema(ruleContent);
      return { result };
    } catch (error) {
      if (error instanceof InvalidRuleContent) {
        throw new HttpException('Invalid rule content', HttpStatus.BAD_REQUEST);
      } else {
        throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  // Map a rule to its unique inputs, and all outputs, based on the trace data of a rule run
  @Post('/rulerunschema')
  @ApiOperation({ summary: 'Map a rule to its unique inputs, and all outputs, based on the trace data of a rule run' })
  @ApiBody({ type: EvaluateRuleRunSchemaDto })
  @ApiResponse({
    status: 201,
    description: 'Rule schema evaluated successfully',
    schema: {
      example: {
        result: decisionExample.trace,
      },
    },
  })
  async evaluateRuleSchema(@Body() { trace }: EvaluateRuleRunSchemaDto) {
    try {
      if (!trace) {
        throw new HttpException('Invalid request data', HttpStatus.BAD_REQUEST);
      }
      const result = this.ruleMappingService.evaluateRuleSchema(trace);
      return { result };
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.BAD_REQUEST) {
        throw error;
      } else {
        throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  // Map a rule file using only the rule content
  @Post('/generateFromRuleContent')
  @ApiOperation({ summary: 'Generate rule mapping from rule content' })
  @ApiBody({
    schema: {
      example: {
        ruleContent: ruleContentExample,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Rule mapping generated successfully',
    schema: {
      example: {
        inputs: ruleInputMetadata,
        resultOutputs: ruleOutputMetadata,
      },
    },
  })
  async generateWithoutInputOutputNodes(
    @Body('ruleContent') ruleContent: EvaluateRuleMappingDto,
    @Res() res: Response,
  ) {
    const rulemap = await this.ruleMappingService.ruleSchema(ruleContent);

    try {
      res.setHeader('Content-Type', 'application/json');
      res.send(rulemap);
    } catch (error) {
      if (error instanceof InvalidRuleContent) {
        throw new HttpException('Invalid rule content', HttpStatus.BAD_REQUEST);
      } else {
        throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
