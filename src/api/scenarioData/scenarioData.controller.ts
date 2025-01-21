import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  HttpException,
  HttpStatus,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ScenarioDataService } from './scenarioData.service';
import { ScenarioData } from './scenarioData.schema';
import { RuleContent } from '../ruleMapping/ruleMapping.interface';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { FileNotFoundError } from '../../utils/readFile';
import { RuleRunResults } from './scenarioData.interface';
import { ApiOperation, ApiResponse, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { scenarioCSVExample, scenarioExample } from '../../examples/scenario.example';
import { ruleContentExample, ruleExample, ruleInputs } from '../../examples/rule.example';
import { decisionResultExample } from '../../examples/decision.example';

@Controller('api/scenario')
export class ScenarioDataController {
  constructor(private readonly scenarioDataService: ScenarioDataService) {}

  @Get('/list')
  @ApiOperation({ summary: 'Get all scenarios' })
  @ApiResponse({
    status: 200,
    description: 'List of all scenarios retrieved successfully',
    type: [ScenarioData],
  })
  async getAllScenarioData(): Promise<ScenarioData[]> {
    try {
      return await this.scenarioDataService.getAllScenarioData();
    } catch (error) {
      throw new HttpException('Error getting all scenario data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/by-rule/:ruleId')
  @ApiOperation({ summary: 'Get scenarios by rule ID' })
  @ApiParam({ name: 'ruleId', description: 'The ID of the rule', schema: { example: scenarioExample.ruleID } })
  @ApiResponse({
    status: 200,
    description: 'Scenarios for rule retrieved successfully',
    type: [ScenarioData],
  })
  async getScenariosByRuleId(@Param('ruleId') ruleId: string): Promise<ScenarioData[]> {
    try {
      return await this.scenarioDataService.getScenariosByRuleId(ruleId);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw new HttpException('Rule not found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException('Error getting scenarios by rule ID', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Post('/by-filename')
  @ApiOperation({ summary: 'Get scenarios by file path' })
  @ApiBody({
    schema: {
      properties: {
        filepath: { type: 'string', example: scenarioExample.filepath },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Scenarios for file retrieved successfully',
    type: [ScenarioData],
  })
  async getScenariosByFilename(@Body('filepath') filepath: string): Promise<ScenarioData[]> {
    try {
      return await this.scenarioDataService.getScenariosByFilename(filepath);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw new HttpException('Rule not found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException('Error getting scenarios by filename', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get('/:scenarioId')
  @ApiOperation({ summary: 'Get scenario by ID' })
  @ApiParam({ name: 'scenarioId', description: 'The ID of the scenario', example: scenarioExample._id })
  @ApiResponse({
    status: 200,
    description: 'Scenario retrieved successfully',
    type: ScenarioData,
  })
  async getScenarioData(@Param('scenarioId') scenarioId: string): Promise<ScenarioData> {
    try {
      return await this.scenarioDataService.getScenarioData(scenarioId);
    } catch (error) {
      throw new HttpException('Error getting scenario data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new scenario' })
  @ApiBody({ type: CreateScenarioDto })
  @ApiResponse({
    status: 201,
    description: 'Scenario created successfully',
    type: ScenarioData,
  })
  async createScenarioData(@Body() createScenarioDto: CreateScenarioDto): Promise<ScenarioData> {
    try {
      const scenarioData: ScenarioData = {
        title: createScenarioDto.title,
        ruleID: createScenarioDto.ruleID,
        variables: createScenarioDto.variables,
        filepath: createScenarioDto.filepath,
        expectedResults: createScenarioDto.expectedResults,
      };
      return await this.scenarioDataService.createScenarioData(scenarioData);
    } catch (error) {
      throw new HttpException('Error creating scenario data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('/:scenarioId')
  @ApiOperation({ summary: 'Update an existing scenario' })
  @ApiParam({ name: 'scenarioId', description: 'The ID of the scenario to update', example: scenarioExample._id })
  @ApiBody({ type: CreateScenarioDto })
  @ApiResponse({
    status: 200,
    description: 'Scenario updated successfully',
    type: ScenarioData,
  })
  async updateScenarioData(
    @Param('scenarioId') scenarioId: string,
    @Body() updateScenarioDto: CreateScenarioDto,
  ): Promise<ScenarioData> {
    try {
      const scenarioData: ScenarioData = {
        title: updateScenarioDto.title,
        ruleID: updateScenarioDto.ruleID,
        variables: updateScenarioDto.variables,
        filepath: updateScenarioDto.filepath,
        expectedResults: updateScenarioDto.expectedResults,
      };
      return await this.scenarioDataService.updateScenarioData(scenarioId, scenarioData);
    } catch (error) {
      throw new HttpException('Error updating scenario data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('/:scenarioId')
  @ApiOperation({ summary: 'Delete a scenario' })
  @ApiParam({ name: 'scenarioId', description: 'The ID of the scenario to delete', example: scenarioExample._id })
  @ApiResponse({
    status: 200,
    description: 'Scenario deleted successfully',
  })
  async deleteScenarioData(@Param('scenarioId') scenarioId: string): Promise<void> {
    try {
      await this.scenarioDataService.deleteScenarioData(scenarioId);
    } catch (error) {
      throw new HttpException('Error deleting scenario data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  sendCSV = (res: Response, fileContent: string, filepath: string = 'processed_data.csv') => {
    // UTF- 8 encoding with BOM
    const bom = '\uFEFF';
    const utf8CsvContent = bom + fileContent;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filepath.replace(/\.json$/, '.csv')}`);
    res.status(HttpStatus.OK).send(utf8CsvContent);
  };

  @Post('/evaluation')
  @ApiOperation({ summary: 'Generate CSV for rule evaluation' })
  @ApiBody({
    schema: {
      properties: {
        filepath: { type: 'string', description: 'Path to the rule file', example: ruleExample.filepath },
        ruleContent: { type: 'object', description: 'Rule file body', example: ruleContentExample },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file generated successfully',
  })
  async getCSVForRuleRun(
    @Body('filepath') filepath: string,
    @Body('ruleContent') ruleContent: RuleContent,
    @Res() res: Response,
  ) {
    try {
      const { allTestsPassed, csvContent } = await this.scenarioDataService.getCSVForRuleRun(filepath, ruleContent);
      // Add header that notes if all tests passed or not
      res.setHeader('X-All-Tests-Passed', allTestsPassed.toString());
      this.sendCSV(res, csvContent, filepath);
    } catch (error) {
      throw new HttpException('Error generating CSV for rule run', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/run-decisions')
  @ApiOperation({ summary: 'Run decision engine for scenarios' })
  @ApiBody({
    schema: {
      properties: {
        filepath: { type: 'string', example: ruleExample.filepath },
        ruleContent: { type: 'object', example: ruleContentExample },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Decisions executed successfully',
    schema: {
      properties: {
        decisions: { type: 'object', example: decisionResultExample },
      },
    },
  })
  async runDecisionsForScenarios(
    @Body('filepath') filepath: string,
    @Body('ruleContent') ruleContent: RuleContent,
  ): Promise<{ [scenarioId: string]: any }> {
    try {
      return await this.scenarioDataService.runDecisionsForScenarios(filepath, ruleContent);
    } catch (error) {
      throw new HttpException('Error running scenario decisions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/evaluation/upload/')
  @ApiOperation({ summary: 'Upload and process CSV file for evaluation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: `CSV file containing scenarios. Example (save as CSV file for upload): ${scenarioCSVExample} .`,
        },
        filepath: { type: 'string', description: 'Path to the rule file', example: ruleExample.filepath },
        ruleContent: {
          type: 'string',
          description: 'Rule content to be executed (as JSON string)',
          example: ruleContentExample,
        },
      },
      required: ['file', 'filepath', 'ruleContent'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file processed successfully',
    type: 'file',
    example: scenarioCSVExample,
    content: {
      'text/csv': {
        schema: {
          example: scenarioCSVExample,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCSVAndProcess(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Res() res: Response,
    @Body('filepath') filepath: string,
    @Body('ruleContent') ruleContent: RuleContent,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      const scenarios = await this.scenarioDataService.processProvidedScenarios(filepath, file);
      const { allTestsPassed, csvContent } = await this.scenarioDataService.getCSVForRuleRun(
        filepath,
        typeof ruleContent === 'string' ? JSON.parse(ruleContent) : ruleContent,
        scenarios,
      );
      // Add header that notes if all tests passed or not
      res.setHeader('X-All-Tests-Passed', allTestsPassed.toString());
      this.sendCSV(res, csvContent);
    } catch (error) {
      throw new HttpException('Error processing CSV file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/test')
  @ApiOperation({ summary: 'Generate test scenarios and evaluate rules' })
  @ApiBody({
    schema: {
      properties: {
        filepath: { type: 'string', example: ruleExample.filepath },
        ruleContent: { type: 'object', example: ruleContentExample },
        simulationContext: { type: 'object', example: ruleInputs },
        testScenarioCount: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Test scenarios generated and evaluated successfully',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example: scenarioCSVExample,
        },
      },
    },
  })
  async getCSVTests(
    @Body('filepath') filepath: string,
    @Body('ruleContent') ruleContent: RuleContent,
    @Body('simulationContext') simulationContext: RuleRunResults,
    @Body('testScenarioCount') testScenarioCount: number,
    @Res() res: Response,
  ) {
    try {
      const fileContent = await this.scenarioDataService.generateTestCSVScenarios(
        filepath,
        ruleContent,
        simulationContext,
        testScenarioCount && testScenarioCount > 0 ? testScenarioCount : undefined,
      );
      this.sendCSV(res, fileContent, filepath);
    } catch (error) {
      throw new HttpException('Error generating CSV for rule run', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
