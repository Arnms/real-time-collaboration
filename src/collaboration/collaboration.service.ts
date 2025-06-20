import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Operation } from './entities/operation.entity';
import { DocumentsService } from '../documents/documents.service';
import { RedisService } from '../redis/redis.service';
import { TextOperation } from '../websocket/types/collaboration.types';
import { OperationType } from '../shared/enums/operation-type.enum';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    @InjectRepository(Operation)
    private readonly operationRepository: Repository<Operation>,
    private readonly documentsService: DocumentsService,
    private readonly redisService: RedisService,
  ) {}

  // 텍스트 작업을 데이터베이스에 저장
  async saveOperation(
    documentId: string,
    authorId: string,
    operation: TextOperation,
    version: number,
  ): Promise<Operation> {
    try {
      const op = this.operationRepository.create({
        documentId,
        authorId,
        type: operation.type as OperationType,
        position: operation.position,
        content: operation.content,
        length: operation.length,
        attributes: operation.attributes,
        documentVersion: version,
        isApplied: true,
      });

      const savedOperation = await this.operationRepository.save(op);
      this.logger.log(
        `Operation saved: ${savedOperation.id} for document ${documentId}`,
      );

      return savedOperation;
    } catch (error) {
      this.logger.error(`Failed to save operation:`, error.message);
      throw error;
    }
  }

  // 문서의 작업 히스토리 조회
  async getDocumentOperations(
    documentId: string,
    fromVersion?: number,
    limit = 100,
  ): Promise<Operation[]> {
    try {
      const queryBuilder = this.operationRepository
        .createQueryBuilder('operation')
        .leftJoinAndSelect('operation.author', 'author')
        .where('operation.documentId = :documentId', { documentId })
        .orderBy('operation.createdAt', 'ASC');

      if (fromVersion !== undefined) {
        queryBuilder.andWhere('operation.documentVersion > :fromVersion', {
          fromVersion,
        });
      }

      const operations = await queryBuilder.take(limit).getMany();

      this.logger.log(
        `Retrieved ${operations.length} operations for document ${documentId}`,
      );
      return operations;
    } catch (error) {
      this.logger.error(`Failed to get operations:`, error.message);
      throw error;
    }
  }

  // 문서 버전 동기화
  async syncDocumentVersion(
    documentId: string,
    newContent: string,
  ): Promise<void> {
    try {
      // 현재 문서 조회
      const document = await this.documentsService.findOne(documentId);

      // 새 버전으로 업데이트
      await this.documentsService.update(
        documentId,
        {
          content: newContent,
          version: document.version + 1,
        },
        document.ownerId, // 시스템 업데이트이므로 소유자 권한 사용
      );

      // 캐시 업데이트
      await this.redisService.invalidateDocumentCache(documentId);

      this.logger.log(
        `Document ${documentId} synced to version ${document.version + 1}`,
      );
    } catch (error) {
      this.logger.error(`Failed to sync document version:`, error.message);
      throw error;
    }
  }

  // 간단한 Operational Transformation 구현
  async transformOperation(
    operation: TextOperation,
    againstOperation: TextOperation,
  ): Promise<TextOperation> {
    // 기본적인 OT 알고리즘 (단순화된 버전)
    const transformed = { ...operation };

    try {
      // 두 작업이 겹치는 경우 위치 조정
      if (operation.type === 'insert' && againstOperation.type === 'insert') {
        // 두 삽입 작업이 동시에 일어난 경우
        if (againstOperation.position <= operation.position) {
          transformed.position += againstOperation.content?.length || 0;
        }
      } else if (
        operation.type === 'insert' &&
        againstOperation.type === 'delete'
      ) {
        // 삽입 vs 삭제
        if (againstOperation.position < operation.position) {
          transformed.position -= againstOperation.length || 0;
        }
      } else if (
        operation.type === 'delete' &&
        againstOperation.type === 'insert'
      ) {
        // 삭제 vs 삽입
        if (againstOperation.position <= operation.position) {
          transformed.position += againstOperation.content?.length || 0;
        }
      } else if (
        operation.type === 'delete' &&
        againstOperation.type === 'delete'
      ) {
        // 두 삭제 작업
        if (againstOperation.position < operation.position) {
          transformed.position -= againstOperation.length || 0;
        }
      }

      this.logger.debug(
        `Operation transformed from pos ${operation.position} to ${transformed.position}`,
      );
      return transformed;
    } catch (error) {
      this.logger.error(`Failed to transform operation:`, error.message);
      return operation; // 변환 실패 시 원본 반환
    }
  }

  // 문서의 현재 온라인 사용자 수 조회
  async getOnlineUserCount(documentId: string): Promise<number> {
    try {
      const users = await this.redisService.getOnlineUsers(documentId);
      return users.length;
    } catch (error) {
      this.logger.error(`Failed to get online user count:`, error.message);
      return 0;
    }
  }

  // 문서 활동 통계
  async getDocumentActivity(
    documentId: string,
    timeRange = 24, // hours
  ): Promise<{
    operationCount: number;
    uniqueUsers: number;
    lastActivity: Date | null;
  }> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - timeRange);

      const operations = await this.operationRepository
        .createQueryBuilder('operation')
        .select(['operation.authorId', 'operation.createdAt'])
        .where('operation.documentId = :documentId', { documentId })
        .andWhere('operation.createdAt >= :since', { since })
        .getMany();

      const uniqueUsers = new Set(operations.map((op) => op.authorId)).size;
      const lastActivity =
        operations.length > 0
          ? operations[operations.length - 1].createdAt
          : null;

      return {
        operationCount: operations.length,
        uniqueUsers,
        lastActivity,
      };
    } catch (error) {
      this.logger.error(`Failed to get document activity:`, error.message);
      return {
        operationCount: 0,
        uniqueUsers: 0,
        lastActivity: null,
      };
    }
  }

  // Redis에서 임시 변경사항 가져오기 (복구용)
  async getTemporaryChanges(documentId: string): Promise<any[]> {
    try {
      // Redis에서 최근 변경사항들을 가져와서 복구에 사용
      const changes = [];
      // 구현 필요: Redis에서 저장된 임시 변경사항들 조회
      return changes;
    } catch (error) {
      this.logger.error(`Failed to get temporary changes:`, error.message);
      return [];
    }
  }
}
