import { Controller, Get, Param, Post, Body, Put, Delete, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { RuleDataService } from './ruleData.service';
import { RuleData } from './ruleData.schema';
import { RuleDraft } from './ruleDraft.schema';
import { CategoryObject, PaginationDto } from './dto/pagination.dto';
import { ruleExample, ruleExample2, ruleList, ruleContentExample } from '../../examples/rule.example';

@Controller('api/ruleData')
export class RuleDataController {
  constructor(private readonly ruleDataService: RuleDataService) {}

  @Get('/list')
  @ApiOperation({ summary: 'Get all rules data with pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of rules data retrieved successfully',
    schema: {
      example: { data: [ruleExample, ruleExample2], total: 2, categories: ruleList },
    },
  })
  async getAllRulesData(
    @Query() query?: PaginationDto,
  ): Promise<{ data: RuleData[]; total: number; categories: Array<CategoryObject> }> {
    try {
      const { data, total, categories } = await this.ruleDataService.getAllRuleData(query);
      return { data, total, categories };
    } catch (error) {
      throw new HttpException('Error getting list of rule data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/draft/:ruleId')
  @ApiOperation({ summary: 'Get a rule draft ID from a given rule ID' })
  @ApiParam({ name: 'ruleId', description: 'The ID of the rule', example: ruleExample._id })
  @ApiResponse({
    status: 200,
    description: 'Rule draft retrieved successfully',
    example: '676362648cb89c8b157adb5a',
  })
  async getRuleDraft(@Param('ruleId') ruleId: string): Promise<RuleDraft> {
    try {
      return await this.ruleDataService.getRuleDataWithDraft(ruleId);
    } catch (error) {
      throw new HttpException('Error getting draft data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/:ruleId')
  @ApiOperation({ summary: 'Get a rule by ID' })
  @ApiParam({ name: 'ruleId', description: 'The ID of the rule', example: ruleExample._id })
  @ApiResponse({
    status: 200,
    description: 'Rule data retrieved successfully',
    type: RuleData,
  })
  async getRuleData(@Param('ruleId') ruleId: string): Promise<RuleData> {
    try {
      return await this.ruleDataService.getRuleData(ruleId);
    } catch (error) {
      throw new HttpException('Error getting rule data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new rule' })
  @ApiBody({
    type: RuleData,
    schema: {
      examples: {
        newRule: {
          value: {
            title: ruleExample.title,
            filepath: ruleExample.filepath,
            ruleDraft: ruleContentExample,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Rule created successfully',
    type: RuleData,
  })
  async createRuleData(@Body() ruleData: RuleData): Promise<RuleData> {
    try {
      return await this.ruleDataService.createRuleData(ruleData);
    } catch (error) {
      throw new HttpException('Error creating rule data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('/:ruleId')
  @ApiOperation({ summary: 'Update an existing rule' })
  @ApiParam({ name: 'ruleId', description: 'The ID of the rule to update', example: ruleExample._id })
  @ApiBody({ type: RuleData })
  @ApiResponse({
    status: 200,
    description: 'Rule updated successfully',
    type: RuleData,
  })
  async updateRuleData(@Param('ruleId') ruleId: string, @Body() ruleData: RuleData): Promise<RuleData> {
    try {
      return await this.ruleDataService.updateRuleData(ruleId, ruleData);
    } catch (error) {
      throw new HttpException('Error updating rule data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('/:ruleId')
  @ApiOperation({ summary: 'Delete a rule' })
  @ApiParam({ name: 'ruleId', description: 'The ID of the rule to delete', example: ruleExample._id })
  @ApiResponse({
    status: 200,
    description: 'Rule deleted successfully',
  })
  async deleteRuleData(@Param('ruleId') ruleId: string): Promise<void> {
    try {
      await this.ruleDataService.deleteRuleData(ruleId);
    } catch (error) {
      throw new HttpException('Error deleting rule data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
