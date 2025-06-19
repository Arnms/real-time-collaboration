import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentPermission } from './entities/document-permission.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import {
  ShareDocumentDto,
  BulkShareDocumentDto,
  UpdatePermissionDto,
} from './dto/share-document.dto';
import { DocumentPermission as PermissionEnum } from '../shared/enums/document-permission.enum';
import { PaginationResponseDto } from '../shared/dto/common-response.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentPermission)
    private readonly permissionRepository: Repository<DocumentPermission>,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  // 문서 생성
  async create(
    createDocumentDto: CreateDocumentDto,
    userId: string,
  ): Promise<Document> {
    const document = this.documentRepository.create({
      ...createDocumentDto,
      ownerId: userId,
      version: 1,
    });

    const savedDocument = await this.documentRepository.save(document);

    // 소유자 권한 자동 생성
    await this.permissionRepository.save({
      userId,
      documentId: savedDocument.id,
      permission: PermissionEnum.OWNER,
    });

    // 캐시 저장
    await this.redisService.cacheDocument(savedDocument.id, savedDocument);

    return this.findOne(savedDocument.id, userId);
  }

  // 내 문서 목록 조회
  async findMyDocuments(
    userId: string,
    query: DocumentQueryDto,
  ): Promise<PaginationResponseDto<Document>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'DESC',
      isPublic,
      isTemplate,
      templateCategory,
      tags,
    } = query;

    const queryBuilder = this.createDocumentQueryBuilder().where(
      'document.ownerId = :userId',
      { userId },
    );

    // 필터 적용
    this.applyFilters(queryBuilder, {
      search,
      isPublic,
      isTemplate,
      templateCategory,
      tags,
    });

    // 정렬 및 페이지네이션
    queryBuilder
      .orderBy(`document.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 공유받은 문서 목록 조회
  async findSharedDocuments(
    userId: string,
    query: DocumentQueryDto,
  ): Promise<PaginationResponseDto<Document>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.createDocumentQueryBuilder()
      .innerJoin('document.permissions', 'permission')
      .where('permission.userId = :userId', { userId })
      .andWhere('document.ownerId != :userId', { userId });

    // 검색 적용
    if (search) {
      queryBuilder.andWhere(
        '(document.title ILIKE :search OR document.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 정렬 및 페이지네이션
    queryBuilder
      .orderBy(`document.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 공개 문서 목록 조회
  async findPublicDocuments(
    query: DocumentQueryDto,
  ): Promise<PaginationResponseDto<Document>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'DESC',
      isTemplate,
      templateCategory,
      tags,
    } = query;

    const queryBuilder = this.createDocumentQueryBuilder().where(
      'document.isPublic = :isPublic',
      { isPublic: true },
    );

    // 필터 적용
    this.applyFilters(queryBuilder, {
      search,
      isTemplate,
      templateCategory,
      tags,
    });

    // 정렬 및 페이지네이션
    queryBuilder
      .orderBy(`document.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 문서 단일 조회
  async findOne(id: string, userId?: string): Promise<Document> {
    // 캐시에서 먼저 확인
    const cached = await this.redisService.getCachedDocument(id);
    if (cached && !userId) {
      return cached;
    }

    const queryBuilder = this.createDocumentQueryBuilder().where(
      'document.id = :id',
      { id },
    );

    const document = await queryBuilder.getOne();

    if (!document) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    // 권한 확인 (userId가 제공된 경우)
    if (userId) {
      await this.checkDocumentAccess(id, userId, PermissionEnum.VIEWER);
    }

    return document;
  }

  // 문서 수정
  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    userId: string,
  ): Promise<Document> {
    const document = await this.findOne(id);

    // 편집 권한 확인
    await this.checkDocumentAccess(id, userId, PermissionEnum.EDITOR);

    // 버전 증가
    const newVersion = document.version + 1;

    await this.documentRepository.update(id, {
      ...updateDocumentDto,
      version: newVersion,
    });

    // 캐시 무효화
    await this.redisService.invalidateDocumentCache(id);

    return this.findOne(id, userId);
  }

  // 문서 삭제
  async remove(id: string, userId: string): Promise<void> {
    const document = await this.findOne(id);

    // 소유자 권한 확인
    await this.checkDocumentAccess(id, userId, PermissionEnum.OWNER);

    await this.documentRepository.remove(document);

    // 캐시 무효화
    await this.redisService.invalidateDocumentCache(id);
  }

  // 문서 공유
  async shareDocument(
    id: string,
    shareDto: ShareDocumentDto,
    ownerId: string,
  ): Promise<DocumentPermission> {
    // 소유자 권한 확인
    await this.checkDocumentAccess(id, ownerId, PermissionEnum.OWNER);

    // 공유받을 사용자 확인
    const user = await this.usersService.findByEmail(shareDto.email);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 자신에게 공유하는 것 방지
    if (user.id === ownerId) {
      throw new ConflictException('자신에게는 공유할 수 없습니다.');
    }

    // 기존 권한 확인
    const existingPermission = await this.permissionRepository.findOne({
      where: { userId: user.id, documentId: id },
    });

    if (existingPermission) {
      // 권한 업데이트
      existingPermission.permission = shareDto.permission;
      existingPermission.invitedBy = ownerId;
      existingPermission.invitedAt = new Date();
      return this.permissionRepository.save(existingPermission);
    } else {
      // 새 권한 생성
      const permission = this.permissionRepository.create({
        userId: user.id,
        documentId: id,
        permission: shareDto.permission,
        invitedBy: ownerId,
        invitedAt: new Date(),
      });
      return this.permissionRepository.save(permission);
    }
  }

  // 대량 문서 공유
  async bulkShareDocument(
    id: string,
    bulkShareDto: BulkShareDocumentDto,
    ownerId: string,
  ): Promise<DocumentPermission[]> {
    const results: DocumentPermission[] = [];

    for (const shareInfo of bulkShareDto.users) {
      try {
        const permission = await this.shareDocument(id, shareInfo, ownerId);
        results.push(permission);
      } catch (error) {
        // 개별 공유 실패는 로그만 남기고 계속 진행
        console.error(
          `Failed to share with ${shareInfo.email}:`,
          error.message,
        );
      }
    }

    return results;
  }

  // 권한 변경
  async updatePermission(
    documentId: string,
    targetUserId: string,
    updatePermissionDto: UpdatePermissionDto,
    ownerId: string,
  ): Promise<DocumentPermission> {
    // 소유자 권한 확인
    await this.checkDocumentAccess(documentId, ownerId, PermissionEnum.OWNER);

    const permission = await this.permissionRepository.findOne({
      where: { userId: targetUserId, documentId },
    });

    if (!permission) {
      throw new NotFoundException('권한을 찾을 수 없습니다.');
    }

    // 소유자 권한은 변경할 수 없음
    if (permission.permission === PermissionEnum.OWNER) {
      throw new ForbiddenException('소유자 권한은 변경할 수 없습니다.');
    }

    permission.permission = updatePermissionDto.permission;
    return this.permissionRepository.save(permission);
  }

  // 권한 제거 (공유 해제)
  async removePermission(
    documentId: string,
    targetUserId: string,
    ownerId: string,
  ): Promise<void> {
    // 소유자 권한 확인
    await this.checkDocumentAccess(documentId, ownerId, PermissionEnum.OWNER);

    const permission = await this.permissionRepository.findOne({
      where: { userId: targetUserId, documentId },
    });

    if (!permission) {
      throw new NotFoundException('권한을 찾을 수 없습니다.');
    }

    // 소유자 권한은 제거할 수 없음
    if (permission.permission === PermissionEnum.OWNER) {
      throw new ForbiddenException('소유자 권한은 제거할 수 없습니다.');
    }

    await this.permissionRepository.remove(permission);
  }

  // 문서 권한 목록 조회
  async getDocumentPermissions(
    documentId: string,
    userId: string,
  ): Promise<DocumentPermission[]> {
    // 소유자 권한 확인
    await this.checkDocumentAccess(documentId, userId, PermissionEnum.OWNER);

    return this.permissionRepository.find({
      where: { documentId },
      relations: ['user'],
      select: {
        user: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
        },
      },
    });
  }

  // 사용자의 문서 권한 확인
  async getUserDocumentPermission(
    documentId: string,
    userId: string,
  ): Promise<PermissionEnum | null> {
    const permission = await this.permissionRepository.findOne({
      where: { userId, documentId },
    });

    return permission?.permission || null;
  }

  // Private helper methods

  private createDocumentQueryBuilder(): SelectQueryBuilder<Document> {
    return this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.owner', 'owner')
      .leftJoinAndSelect('document.permissions', 'permissions')
      .leftJoinAndSelect('permissions.user', 'permissionUser')
      .select([
        'document',
        'owner.id',
        'owner.email',
        'owner.username',
        'owner.avatarUrl',
        'permissions.id',
        'permissions.permission',
        'permissions.invitedAt',
        'permissionUser.id',
        'permissionUser.email',
        'permissionUser.username',
        'permissionUser.avatarUrl',
      ]);
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Document>,
    filters: {
      search?: string;
      isPublic?: boolean;
      isTemplate?: boolean;
      templateCategory?: string;
      tags?: string;
    },
  ): void {
    const { search, isPublic, isTemplate, templateCategory, tags } = filters;

    if (search) {
      queryBuilder.andWhere(
        '(document.title ILIKE :search OR document.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isPublic !== undefined) {
      queryBuilder.andWhere('document.isPublic = :isPublic', { isPublic });
    }

    if (isTemplate !== undefined) {
      queryBuilder.andWhere('document.isTemplate = :isTemplate', {
        isTemplate,
      });
    }

    if (templateCategory) {
      queryBuilder.andWhere('document.templateCategory = :templateCategory', {
        templateCategory,
      });
    }

    // 수정: 태그 검색을 더 안전한 방식으로 변경
    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim());

      // PostgreSQL JSONB 쿼리를 더 호환성 있게 수정
      queryBuilder.andWhere(
        `document.metadata->>'tags' IS NOT NULL AND (${tagArray
          .map((_, index) => `document.metadata->'tags' @> :tag${index}`)
          .join(' OR ')})`,
        tagArray.reduce((params, tag, index) => {
          params[`tag${index}`] = JSON.stringify([tag]);
          return params;
        }, {} as any),
      );
    }
  }

  private async checkDocumentAccess(
    documentId: string,
    userId: string,
    requiredPermission: PermissionEnum,
  ): Promise<void> {
    const permission = await this.getUserDocumentPermission(documentId, userId);

    if (!permission) {
      throw new ForbiddenException('문서에 대한 접근 권한이 없습니다.');
    }

    // 권한 레벨 체크
    const permissionLevels = {
      [PermissionEnum.VIEWER]: 1,
      [PermissionEnum.COMMENTER]: 2,
      [PermissionEnum.EDITOR]: 3,
      [PermissionEnum.OWNER]: 4,
    };

    if (permissionLevels[permission] < permissionLevels[requiredPermission]) {
      throw new ForbiddenException('충분한 권한이 없습니다.');
    }
  }
}
