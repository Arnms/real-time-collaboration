import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';

export enum DocumentSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TITLE = 'title',
  VERSION = 'version',
}

export class DocumentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '공개 문서만 조회',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: '템플릿만 조회',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({
    description: '템플릿 카테고리',
    example: '회의록',
  })
  @IsOptional()
  @IsString()
  templateCategory?: string;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: DocumentSortBy,
    example: DocumentSortBy.UPDATED_AT,
  })
  @IsOptional()
  @IsEnum(DocumentSortBy)
  sortBy?: DocumentSortBy = DocumentSortBy.UPDATED_AT;

  @ApiPropertyOptional({
    description: '태그로 필터링',
    example: 'project,meeting',
  })
  @IsOptional()
  @IsString()
  tags?: string;
}
