import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentPermission as PermissionEnum } from '../../shared/enums/document-permission.enum';

export class DocumentOwnerDto {
  @ApiProperty({ description: '소유자 ID', example: 'uuid-string' })
  id: string;

  @ApiProperty({ description: '소유자 이메일', example: 'owner@example.com' })
  email: string;

  @ApiProperty({ description: '소유자 사용자명', example: 'owner_user' })
  username: string;

  @ApiPropertyOptional({
    description: '소유자 프로필 이미지',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;
}

export class PermissionUserDto {
  @ApiProperty({ description: '사용자 ID', example: 'uuid-string' })
  id: string;

  @ApiProperty({ description: '사용자 이메일', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: '사용자명', example: 'username' })
  username: string;

  @ApiPropertyOptional({
    description: '프로필 이미지',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;
}

export class DocumentPermissionResponseDto {
  @ApiProperty({ description: '권한 ID', example: 'uuid-string' })
  id: string;

  @ApiProperty({
    description: '권한 레벨',
    enum: PermissionEnum,
    example: PermissionEnum.EDITOR,
  })
  permission: PermissionEnum;

  @ApiPropertyOptional({
    description: '초대한 사용자 ID',
    example: 'uuid-string',
  })
  invitedBy?: string;

  @ApiPropertyOptional({
    description: '초대 날짜',
    example: '2024-01-01T12:00:00Z',
  })
  invitedAt?: Date;

  @ApiProperty({ description: '생성 날짜', example: '2024-01-01T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정 날짜', example: '2024-01-01T12:00:00Z' })
  updatedAt: Date;

  @ApiProperty({ description: '사용자 정보', type: PermissionUserDto })
  user: PermissionUserDto;
}

export class DocumentResponseDto {
  @ApiProperty({ description: '문서 ID', example: 'uuid-string' })
  id: string;

  @ApiProperty({ description: '문서 제목', example: '프로젝트 계획서' })
  title: string;

  @ApiProperty({
    description: '문서 내용',
    example: '프로젝트의 목표와 계획...',
  })
  content: string;

  @ApiPropertyOptional({
    description: '문서 메타데이터',
    example: {
      theme: 'light',
      fontSize: 14,
      fontFamily: 'Arial',
      tags: ['프로젝트', '계획'],
    },
  })
  metadata?: {
    theme?: string;
    fontSize?: number;
    fontFamily?: string;
    tags?: string[];
    [key: string]: any;
  };

  @ApiProperty({ description: '문서 버전', example: 1 })
  version: number;

  @ApiProperty({ description: '공개 문서 여부', example: false })
  isPublic: boolean;

  @ApiProperty({ description: '템플릿 여부', example: false })
  isTemplate: boolean;

  @ApiPropertyOptional({ description: '템플릿 카테고리', example: '회의록' })
  templateCategory?: string;

  @ApiProperty({ description: '생성 날짜', example: '2024-01-01T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정 날짜', example: '2024-01-01T12:00:00Z' })
  updatedAt: Date;

  @ApiProperty({ description: '소유자 정보', type: DocumentOwnerDto })
  owner: DocumentOwnerDto;

  @ApiProperty({
    description: '권한 목록',
    type: [DocumentPermissionResponseDto],
    isArray: true,
  })
  permissions: DocumentPermissionResponseDto[];
}

export class DocumentListResponseDto {
  @ApiProperty({
    description: '문서 목록',
    type: [DocumentResponseDto],
    isArray: true,
  })
  items: DocumentResponseDto[];

  @ApiProperty({ description: '전체 문서 수', example: 100 })
  total: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지 크기', example: 10 })
  limit: number;

  @ApiProperty({ description: '전체 페이지 수', example: 10 })
  totalPages: number;
}
