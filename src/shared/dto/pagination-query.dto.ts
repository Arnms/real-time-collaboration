import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min, Max } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: '페이지 번호 (1부터 시작)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 아이템 수',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '검색 키워드',
    example: '검색어',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: '정렬 필드',
    example: 'createdAt',
  })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: '정렬 순서',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
