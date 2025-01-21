import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { KlammField } from './klamm';
import { KlammService } from './klamm.service';
import { klammResponseExamples } from '../../examples/klammRule.example';

@Controller('api/klamm')
export class KlammController {
  constructor(private readonly klammService: KlammService) {}

  @Get('/brefields')
  @ApiOperation({ summary: 'Search KLAMM BRE fields by search text' })
  @ApiQuery({
    name: 'searchText',
    description: 'Text to search for in field names',
    required: true,
    example: 'isEligible',
  })
  @ApiResponse({
    status: 200,
    description: 'BRE fields retrieved successfully',
    schema: {
      example: klammResponseExamples.breFields,
    },
  })
  async getKlammBREFields(@Query('searchText') searchText: string) {
    return await this.klammService.getKlammBREFields(searchText);
  }

  @Get('/brerules')
  @ApiOperation({ summary: 'Get all KLAMM fields and rules' })
  @ApiResponse({
    status: 200,
    description: 'All KLAMM fields retrieved successfully',
    schema: {
      example: klammResponseExamples.breRules,
    },
  })
  async getKlammBRERules() {
    return await this.klammService._getAllKlammFields();
  }

  @Get('/brefield/:fieldName')
  @ApiOperation({ summary: 'Get KLAMM field details by field name' })
  @ApiParam({
    name: 'fieldName',
    description: 'Name of the KLAMM field to retrieve',
    required: true,
    example: 'isEligible',
  })
  @ApiResponse({
    status: 200,
    description: 'KLAMM field retrieved successfully',
    schema: {
      example: klammResponseExamples.breFields,
    },
  })
  async getKlammBREFieldFromName(@Param('fieldName') fieldName: string): Promise<KlammField[]> {
    return await this.klammService.getKlammBREFieldFromName(fieldName);
  }
}
