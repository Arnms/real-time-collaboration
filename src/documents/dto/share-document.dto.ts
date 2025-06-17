import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
} from 'class-validator';
import { DocumentPermission } from '../../shared/enums/document-permission.enum';

export class ShareDocumentDto {
  @ApiProperty({
    description: '공유할 사용자 이메일',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @ApiProperty({
    description: '권한 레벨',
    enum: DocumentPermission,
    example: DocumentPermission.EDITOR,
  })
  @IsEnum(DocumentPermission)
  permission: DocumentPermission;
}

export class BulkShareDocumentDto {
  @ApiProperty({
    description: '공유할 사용자들의 정보',
    type: [ShareDocumentDto],
    example: [
      { email: 'user1@example.com', permission: 'editor' },
      { email: 'user2@example.com', permission: 'viewer' },
    ],
  })
  @IsArray()
  users: ShareDocumentDto[];
}

export class UpdatePermissionDto {
  @ApiProperty({
    description: '새로운 권한 레벨',
    enum: DocumentPermission,
    example: DocumentPermission.COMMENTER,
  })
  @IsEnum(DocumentPermission)
  permission: DocumentPermission;
}
