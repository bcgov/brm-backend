import { Controller, Get, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { ruleExample, ruleList, ruleContentExample } from '../../examples/rule.example';

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('/all')
  @ApiOperation({ summary: 'Get a list of all JSON rule files in the rules directory' })
  @ApiResponse({
    status: 200,
    description: 'List of rule files retrieved successfully',
    schema: {
      example: ruleList,
    },
  })
  async getAllDocuments() {
    return await this.documentsService.getAllJSONFiles();
  }

  @Get('/')
  @ApiOperation({ summary: 'Get a specific rule file by filename' })
  @ApiQuery({
    name: 'ruleFileName',
    description: 'The path to the rule file to retrieve',
    example: ruleExample.filepath,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Rule file retrieved successfully',
    schema: {
      example: ruleContentExample,
    },
  })
  async getRuleFile(@Query('ruleFileName') ruleFileName: string, @Res() res: Response) {
    const fileContent = await this.documentsService.getFileContent(ruleFileName);

    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${ruleFileName}`);
      res.send(fileContent);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
