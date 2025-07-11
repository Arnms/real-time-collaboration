import { Injectable, Logger } from '@nestjs/common';
import { Operation, OperationComponent } from './operation';
import { RedisService } from '../../redis/redis.service';

export interface PendingOperation {
  id: string;
  operation: Operation;
  authorId: string;
  documentId: string;
  baseVersion: number;
  timestamp: Date;
}

export interface DocumentState {
  content: string;
  version: number;
  pendingOperations: PendingOperation[];
  lastModified: Date;
}

@Injectable()
export class OTServer {
  private readonly logger = new Logger(OTServer.name);
  private readonly documentStates = new Map<string, DocumentState>();

  constructor(private readonly redisService: RedisService) {}

  // 문서 초기화
  async initializeDocument(
    documentId: string,
    content: string,
    version: number = 0,
  ): Promise<void> {
    const state: DocumentState = {
      content,
      version,
      pendingOperations: [],
      lastModified: new Date(),
    };

    this.documentStates.set(documentId, state);

    // Redis에도 저장
    await this.redisService.set(
      `ot:document:${documentId}`,
      JSON.stringify({
        content,
        version,
        lastModified: state.lastModified.toISOString(),
      }),
      3600, // 1시간 TTL
    );

    this.logger.log(
      `Initialized document ${documentId} with version ${version}`,
    );
  }

  // Operation 수신 및 처리
  async receiveOperation(
    documentId: string,
    operation: Operation,
    authorId: string,
    baseVersion: number,
    operationId: string,
  ): Promise<{
    transformedOperation: Operation;
    newVersion: number;
    transformedOperations: { authorId: string; operation: Operation }[];
  }> {
    try {
      let state = this.documentStates.get(documentId);

      if (!state) {
        // Redis에서 상태 복구 시도
        state = await this.loadDocumentFromRedis(documentId);
        if (!state) {
          throw new Error(`Document ${documentId} not found`);
        }
      }

      // 중복 operation 체크
      const existingOp = state.pendingOperations.find(
        (op) => op.id === operationId,
      );
      if (existingOp) {
        this.logger.warn(
          `Duplicate operation ${operationId} for document ${documentId}`,
        );
        return {
          transformedOperation: operation,
          newVersion: state.version,
          transformedOperations: [],
        };
      }

      // Operation 변환
      const result = await this.transformOperation(
        state,
        operation,
        authorId,
        baseVersion,
        operationId,
      );

      // 상태 업데이트
      state.content = result.transformedOperation.apply(state.content);
      state.version++;
      state.lastModified = new Date();

      // 적용된 operation을 pending에서 제거하고, 나머지를 다시 변환
      state.pendingOperations = state.pendingOperations.filter(
        (op) => op.id !== operationId,
      );

      // Redis 동기화
      await this.syncToRedis(documentId, state);

      this.logger.log(
        `Applied operation ${operationId} to document ${documentId}, new version: ${state.version}`,
      );

      return {
        transformedOperation: result.transformedOperation,
        newVersion: state.version,
        transformedOperations: result.transformedOperations,
      };
    } catch (error) {
      this.logger.error(
        `Error processing operation for document ${documentId}:`,
        error.message,
      );
      throw error;
    }
  }

  // Operation 변환 로직
  private async transformOperation(
    state: DocumentState,
    operation: Operation,
    authorId: string,
    baseVersion: number,
    operationId: string,
  ): Promise<{
    transformedOperation: Operation;
    transformedOperations: { authorId: string; operation: Operation }[];
  }> {
    let transformedOperation = operation;
    const transformedOperations: { authorId: string; operation: Operation }[] =
      [];

    // baseVersion부터 현재 버전까지의 모든 operations에 대해 변환
    const missedOperations = state.pendingOperations.filter(
      (op) => op.baseVersion >= baseVersion && op.authorId !== authorId,
    );

    // 시간순으로 정렬
    missedOperations.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    for (const missedOp of missedOperations) {
      try {
        // 현재 operation과 누락된 operation을 변환
        const [transformed1, transformed2] = Operation.transform(
          transformedOperation,
          missedOp.operation,
          authorId < missedOp.authorId ? 'left' : 'right', // 일관된 우선순위
        );

        transformedOperation = transformed1;

        // 다른 클라이언트에게 보낼 변환된 operation
        transformedOperations.push({
          authorId: missedOp.authorId,
          operation: transformed2,
        });

        // 누락된 operation도 업데이트
        missedOp.operation = transformed2;
      } catch (error) {
        this.logger.error(`Error transforming operations:`, error.message);
        throw new Error('Operation transformation failed');
      }
    }

    // 새 operation을 pending에 추가
    state.pendingOperations.push({
      id: operationId,
      operation: transformedOperation,
      authorId,
      documentId: state.content,
      baseVersion: state.version,
      timestamp: new Date(),
    });

    return { transformedOperation, transformedOperations };
  }

  // 문서 상태 가져오기
  async getDocumentState(
    documentId: string,
  ): Promise<DocumentState | undefined> {
    let state = this.documentStates.get(documentId);

    if (!state) {
      state = await this.loadDocumentFromRedis(documentId);
    }

    return state;
  }

  // 현재 문서 내용 가져오기
  async getDocumentContent(
    documentId: string,
  ): Promise<{ content: string; version: number } | null> {
    const state = await this.getDocumentState(documentId);

    if (!state) {
      return null;
    }

    return {
      content: state.content,
      version: state.version,
    };
  }

  // Redis에서 문서 상태 로드
  private async loadDocumentFromRedis(
    documentId: string,
  ): Promise<DocumentState | undefined> {
    try {
      const data = await this.redisService.get(`ot:document:${documentId}`);

      if (!data) {
        return undefined;
      }

      const parsed = JSON.parse(data);
      const state: DocumentState = {
        content: parsed.content,
        version: parsed.version,
        pendingOperations: [],
        lastModified: new Date(parsed.lastModified),
      };

      this.documentStates.set(documentId, state);
      return state;
    } catch (error) {
      this.logger.error(`Error loading document from Redis:`, error.message);
      return undefined;
    }
  }

  // Redis에 문서 상태 동기화
  private async syncToRedis(
    documentId: string,
    state: DocumentState,
  ): Promise<void> {
    try {
      await this.redisService.set(
        `ot:document:${documentId}`,
        JSON.stringify({
          content: state.content,
          version: state.version,
          lastModified: state.lastModified.toISOString(),
        }),
        3600,
      );
    } catch (error) {
      this.logger.error(`Error syncing document to Redis:`, error.message);
    }
  }

  // 주기적으로 오래된 pending operations 정리
  async cleanupPendingOperations(): Promise<void> {
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5분

    for (const [documentId, state] of this.documentStates) {
      const before = state.pendingOperations.length;

      state.pendingOperations = state.pendingOperations.filter(
        (op) => now.getTime() - op.timestamp.getTime() < maxAge,
      );

      if (state.pendingOperations.length !== before) {
        this.logger.log(
          `Cleaned up ${before - state.pendingOperations.length} old operations for document ${documentId}`,
        );
      }
    }
  }

  // 문서 히스토리 생성 (스냅샷)
  async createSnapshot(documentId: string): Promise<void> {
    const state = await this.getDocumentState(documentId);

    if (!state) {
      throw new Error(`Document ${documentId} not found`);
    }

    // 스냅샷을 Redis에 저장
    await this.redisService.set(
      `ot:snapshot:${documentId}:${state.version}`,
      JSON.stringify({
        content: state.content,
        version: state.version,
        timestamp: new Date().toISOString(),
      }),
      7 * 24 * 3600, // 7일 보관
    );

    this.logger.log(
      `Created snapshot for document ${documentId} at version ${state.version}`,
    );
  }

  // 특정 버전으로 문서 복원
  async restoreFromSnapshot(
    documentId: string,
    version: number,
  ): Promise<boolean> {
    try {
      const snapshotData = await this.redisService.get(
        `ot:snapshot:${documentId}:${version}`,
      );

      if (!snapshotData) {
        return false;
      }

      const snapshot = JSON.parse(snapshotData);

      await this.initializeDocument(
        documentId,
        snapshot.content,
        snapshot.version,
      );

      this.logger.log(
        `Restored document ${documentId} from snapshot version ${version}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error restoring document from snapshot:`,
        error.message,
      );
      return false;
    }
  }

  // 문서 통계
  getDocumentStats(documentId: string): {
    version: number;
    pendingOperations: number;
    lastModified: Date;
    isActive: boolean;
  } | null {
    const state = this.documentStates.get(documentId);

    if (!state) {
      return null;
    }

    return {
      version: state.version,
      pendingOperations: state.pendingOperations.length,
      lastModified: state.lastModified,
      isActive: true,
    };
  }

  // 모든 활성 문서 목록
  getActiveDocuments(): string[] {
    return Array.from(this.documentStates.keys());
  }

  // 메모리 정리
  async unloadDocument(documentId: string): Promise<void> {
    const state = this.documentStates.get(documentId);

    if (state) {
      // 마지막으로 Redis에 동기화
      await this.syncToRedis(documentId, state);

      // 메모리에서 제거
      this.documentStates.delete(documentId);

      this.logger.log(`Unloaded document ${documentId} from memory`);
    }
  }
}

// Operation을 간단한 형태로 변환하는 유틸리티
export class OperationUtils {
  // 텍스트 변경을 Operation으로 변환
  static textChangeToOperation(
    oldText: string,
    newText: string,
    cursorPosition?: number,
  ): Operation {
    const op = new Operation();

    // 간단한 diff 알고리즘
    let i = 0;
    let j = 0;

    // 앞에서부터 같은 부분 찾기
    while (
      i < oldText.length &&
      i < newText.length &&
      oldText[i] === newText[i]
    ) {
      i++;
    }

    // 뒤에서부터 같은 부분 찾기
    let oldEnd = oldText.length;
    let newEnd = newText.length;

    while (
      oldEnd > i &&
      newEnd > i &&
      oldText[oldEnd - 1] === newText[newEnd - 1]
    ) {
      oldEnd--;
      newEnd--;
    }

    // Operation 구성
    if (i > 0) {
      op.retain(i);
    }

    // 삭제할 부분
    if (oldEnd > i) {
      op.delete(oldEnd - i);
    }

    // 삽입할 부분
    if (newEnd > i) {
      op.insert(newText.slice(i, newEnd));
    }

    // 나머지 유지
    if (oldText.length > oldEnd) {
      op.retain(oldText.length - oldEnd);
    }

    return op;
  }

  // Delta 형식을 Operation으로 변환
  static deltaToOperation(delta: any[]): Operation {
    const op = new Operation();

    for (const item of delta) {
      if (typeof item === 'string') {
        op.insert(item);
      } else if (typeof item === 'number') {
        op.retain(item);
      } else if (item.delete) {
        op.delete(item.delete);
      } else if (item.retain) {
        op.retain(item.retain, item.attributes);
      } else if (item.insert) {
        op.insert(item.insert, item.attributes);
      }
    }

    return op;
  }

  // Operation을 Delta 형식으로 변환
  static operationToDelta(operation: Operation): any[] {
    return operation.components.map((comp) => {
      switch (comp.type) {
        case 'retain':
          return comp.attributes
            ? { retain: comp.length, attributes: comp.attributes }
            : { retain: comp.length };
        case 'insert':
          return comp.attributes
            ? { insert: comp.text, attributes: comp.attributes }
            : { insert: comp.text };
        case 'delete':
          return { delete: comp.length };
      }
    });
  }

  // 커서 위치 변환
  static transformCursor(
    cursor: number,
    operation: Operation,
    isOwn: boolean = false,
  ): number {
    let transformedCursor = cursor;
    let index = 0;

    for (const component of operation.components) {
      if (index >= cursor) break;

      switch (component.type) {
        case 'retain':
          index += component.length!;
          break;

        case 'insert':
          if (index < cursor || (index === cursor && !isOwn)) {
            transformedCursor += component.text!.length;
          }
          break;

        case 'delete':
          const deleteEnd = index + component.length!;
          if (deleteEnd <= cursor) {
            transformedCursor -= component.length!;
          } else if (index < cursor) {
            transformedCursor = index;
          }
          index += component.length!;
          break;
      }
    }

    return Math.max(0, transformedCursor);
  }

  // 선택 영역 변환
  static transformSelection(
    selection: { start: number; end: number },
    operation: Operation,
    isOwn: boolean = false,
  ): { start: number; end: number } {
    return {
      start: this.transformCursor(selection.start, operation, isOwn),
      end: this.transformCursor(selection.end, operation, isOwn),
    };
  }
}
