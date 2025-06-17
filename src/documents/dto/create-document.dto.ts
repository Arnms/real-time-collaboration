import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    description: '문서 제목',
    example: '새로운 프로젝트 계획서',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1, { message: '문서 제목은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '문서 제목은 최대 200자까지 가능합니다.' })
  title: string;

  @ApiPropertyOptional({
    description: '문서 내용',
    example: '프로젝트 목표:\n1. 사용자 경험 개선\n2. 성능 최적화',
    default: '',
  })
  @IsOptional()
  @IsString()
  content?: string = '';

  @ApiPropertyOptional({
    description: '문서 메타데이터',
    example: {
      theme: 'light',
      fontSize: 14,
      fontFamily: 'Arial',
      tags: ['프로젝트', '계획'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    theme?: string;
    fontSize?: number;
    fontFamily?: string;
    tags?: string[];
    [key: string]: any;
  };

  @ApiPropertyOptional({
    description: '공개 문서 여부',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({
    description: '템플릿으로 사용할지 여부',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean = false;

  @ApiPropertyOptional({
    description: '템플릿 카테고리',
    example: '회의록',
  })
  @IsOptional()
  @IsString()
  templateCategory?: string;
}
