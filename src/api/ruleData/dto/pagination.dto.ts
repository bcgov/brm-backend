import { IsOptional, IsString, IsObject, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class FiltersDto {
  @ApiProperty({
    type: [String],
    description: 'Array of file paths',
    example: ['general-supplements', 'health-supplements'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filepath?: string[];
}

export class PaginationDto {
  @ApiProperty({
    example: 1,
    description: 'Page number for pagination',
    required: false,
  })
  @IsOptional()
  @IsString()
  page?: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
    required: false,
  })
  @IsOptional()
  @IsString()
  pageSize?: number;

  @ApiProperty({
    example: 'filepath',
    description: 'Field to sort by',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiProperty({
    example: 'ascend',
    enum: ['ascend', 'descend'],
    description: 'Sort order direction',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ascend' | 'descend';

  @ApiProperty({
    type: FiltersDto,
    description: 'Filter criteria',
    example: { filepath: ['general-supplements', 'health-supplements'] },
    required: false,
  })
  @IsOptional()
  filters?: FiltersDto;

  @ApiProperty({
    example: 'winter',
    description: 'Search term for filtering results',
    required: false,
  })
  @IsOptional()
  @IsString()
  searchTerm?: string;
}

export class CategoryObject {
  @ApiProperty({
    example: 'general-supplements',
    description: 'Category name',
  })
  @IsObject()
  @Type(() => Object)
  text: string;

  @ApiProperty({
    example: 'general-supplements',
    description: 'Category Value',
  })
  value: string;
}
