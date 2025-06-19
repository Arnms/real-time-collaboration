import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import {
  ShareDocumentDto,
  BulkShareDocumentDto,
  UpdatePermissionDto,
} from './dto/share-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { Public } from '../shared/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import {
  PaginationResponseDto,
  ErrorResponseDto,
  SuccessResponseDto,
} from '../shared/dto/common-response.dto';
import { Document } from './entities/document.entity';
import { DocumentPermission } from './entities/document-permission.entity';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({
    summary: '문서 생성',
    description: '새로운 문서를 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '문서 생성 성공',
    type: Document,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
    type: ErrorResponseDto,
  })
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: User,
  ): Promise<Document> {
    return this.documentsService.create(createDocumentDto, user.id);
  }

  @Get('my')
  @ApiOperation({
    summary: '내 문서 목록 조회',
    description: '현재 사용자가 소유한 문서 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '내 문서 목록 조회 성공',
    type: PaginationResponseDto<Document>,
  })
  async findMyDocuments(
    @Query() query: DocumentQueryDto,
    @CurrentUser() user: User,
  ): Promise<PaginationResponseDto<Document>> {
    return this.documentsService.findMyDocuments(user.id, query);
  }

  @Get('shared')
  @ApiOperation({
    summary: '공유받은 문서 목록 조회',
    description: '다른 사용자로부터 공유받은 문서 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '공유받은 문서 목록 조회 성공',
    type: PaginationResponseDto<Document>,
  })
  async findSharedDocuments(
    @Query() query: DocumentQueryDto,
    @CurrentUser() user: User,
  ): Promise<PaginationResponseDto<Document>> {
    return this.documentsService.findSharedDocuments(user.id, query);
  }

  @Get('public')
  @Public()
  @ApiOperation({
    summary: '공개 문서 목록 조회',
    description:
      '공개로 설정된 문서 목록을 조회합니다. 로그인 없이 접근 가능합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '공개 문서 목록 조회 성공',
    type: PaginationResponseDto<Document>,
  })
  async findPublicDocuments(
    @Query() query: DocumentQueryDto,
  ): Promise<PaginationResponseDto<Document>> {
    return this.documentsService.findPublicDocuments(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '문서 조회',
    description: '특정 문서의 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: '문서 조회 성공',
    type: Document,
  })
  @ApiResponse({
    status: 404,
    description: '문서를 찾을 수 없음',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '접근 권한 없음',
    type: ErrorResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Document> {
    return this.documentsService.findOne(id, user.id);
  }

  @Get('public/:id')
  @Public()
  @ApiOperation({
    summary: '공개 문서 조회',
    description: '공개로 설정된 문서를 로그인 없이 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: '공개 문서 조회 성공',
    type: Document,
  })
  @ApiResponse({
    status: 404,
    description: '문서를 찾을 수 없음',
    type: ErrorResponseDto,
  })
  async findPublicDocument(@Param('id') id: string): Promise<Document> {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '문서 수정',
    description: '문서의 내용이나 설정을 수정합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: '문서 수정 성공',
    type: Document,
  })
  @ApiResponse({
    status: 404,
    description: '문서를 찾을 수 없음',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '편집 권한 없음',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser() user: User,
  ): Promise<Document> {
    return this.documentsService.update(id, updateDocumentDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '문서 삭제',
    description: '문서를 영구적으로 삭제합니다. 소유자만 가능합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: '문서 삭제 성공',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '문서를 찾을 수 없음',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '삭제 권한 없음 (소유자 아님)',
    type: ErrorResponseDto,
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<SuccessResponseDto> {
    await this.documentsService.remove(id, user.id);
    return {
      success: true,
      data: null,
      message: '문서가 삭제되었습니다.',
    };
  }

  // 문서 공유 관련 API

  @Post(':id/share')
  @ApiOperation({
    summary: '문서 공유',
    description: '특정 사용자에게 문서를 공유합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 201,
    description: '문서 공유 성공',
    type: DocumentPermission,
  })
  @ApiResponse({
    status: 404,
    description: '문서 또는 사용자를 찾을 수 없음',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '공유 권한 없음 (소유자 아님)',
    type: ErrorResponseDto,
  })
  async shareDocument(
    @Param('id') id: string,
    @Body() shareDocumentDto: ShareDocumentDto,
    @CurrentUser() user: User,
  ): Promise<DocumentPermission> {
    return this.documentsService.shareDocument(id, shareDocumentDto, user.id);
  }

  @Post(':id/share/bulk')
  @ApiOperation({
    summary: '문서 대량 공유',
    description: '여러 사용자에게 한 번에 문서를 공유합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 201,
    description: '문서 대량 공유 성공',
    type: [DocumentPermission],
  })
  @ApiResponse({
    status: 404,
    description: '문서를 찾을 수 없음',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '공유 권한 없음 (소유자 아님)',
    type: ErrorResponseDto,
  })
  async bulkShareDocument(
    @Param('id') id: string,
    @Body() bulkShareDocumentDto: BulkShareDocumentDto,
    @CurrentUser() user: User,
  ): Promise<DocumentPermission[]> {
    return this.documentsService.bulkShareDocument(
      id,
      bulkShareDocumentDto,
      user.id,
    );
  }

  @Get(':id/permissions')
  @ApiOperation({
    summary: '문서 권한 목록 조회',
    description: '문서에 설정된 모든 권한을 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: '문서 권한 목록 조회 성공',
    type: [DocumentPermission],
  })
  @ApiResponse({
    status: 404,
    description: '문서를 찾을 수 없음',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '권한 조회 권한 없음 (소유자 아님)',
    type: ErrorResponseDto,
  })
  async getDocumentPermissions(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<DocumentPermission[]> {
    return this.documentsService.getDocumentPermissions(id, user.id);
  }

  @Patch(':id/permissions/:userId')
  @ApiOperation({
    summary: '문서 권한 변경',
    description: '특정 사용자의 문서 권한을 변경합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiParam({
    name: 'userId',
    description: '대상 사용자 ID',
    example: 'user-uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: '권한 변경 성공',
    type: DocumentPermission,
  })
  @ApiResponse({
    status: 404,
    description: '문서 또는 권한을 찾을 수 없음',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '권한 변경 권한 없음',
    type: ErrorResponseDto,
  })
  async updatePermission(
    @Param('id') documentId: string,
    @Param('userId') userId: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @CurrentUser() user: User,
  ): Promise<DocumentPermission> {
    return this.documentsService.updatePermission(
      documentId,
      userId,
      updatePermissionDto,
      user.id,
    );
  }

  @Delete(':id/permissions/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '문서 권한 제거',
    description: '특정 사용자의 문서 접근 권한을 제거합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiParam({
    name: 'userId',
    description: '대상 사용자 ID',
    example: 'user-uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: '권한 제거 성공',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '문서 또는 권한을 찾을 수 없음',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '권한 제거 권한 없음',
    type: ErrorResponseDto,
  })
  async removePermission(
    @Param('id') documentId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: User,
  ): Promise<SuccessResponseDto> {
    await this.documentsService.removePermission(documentId, userId, user.id);
    return {
      success: true,
      data: null,
      message: '권한이 제거되었습니다.',
    };
  }

  @Get(':id/my-permission')
  @ApiOperation({
    summary: '내 문서 권한 조회',
    description: '현재 사용자의 특정 문서에 대한 권한을 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '문서 ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: '권한 조회 성공',
    schema: {
      type: 'object',
      properties: {
        permission: {
          type: 'string',
          enum: ['owner', 'editor', 'commenter', 'viewer'],
          example: 'editor',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '문서 또는 권한을 찾을 수 없음',
    type: ErrorResponseDto,
  })
  async getMyPermission(
    @Param('id') documentId: string,
    @CurrentUser() user: User,
  ): Promise<{ permission: string | null }> {
    const permission = await this.documentsService.getUserDocumentPermission(
      documentId,
      user.id,
    );
    return { permission };
  }
}
