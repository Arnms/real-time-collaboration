import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DocumentsService } from '../../documents/documents.service';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../redis/redis.service';
import { DocumentPermission } from '../../shared/enums/document-permission.enum';

// WebSocket 이벤트 타입 정의
interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  documentId?: string;
  color?: string;
}

interface OnlineUserDto {
  id?: string;
  username?: string;
  color?: string;
}

interface JoinDocumentDto {
  documentId: string;
  token: string;
}

interface TextChangeDto {
  documentId: string;
  operation: {
    type: 'insert' | 'delete' | 'retain';
    position: number;
    content?: string;
    length?: number;
    attributes?: any;
  };
  version: number;
}

interface CursorPositionDto {
  documentId: string;
  position: number;
  selection?: {
    start: number;
    end: number;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/collaboration',
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationGateway.name);
  private readonly connectedUsers = new Map<string, AuthenticatedSocket>();
  private readonly documentRooms = new Map<string, Set<string>>(); // documentId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly documentsService: DocumentsService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  // 클라이언트 연결 시
  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connecting: ${client.id}`);

    try {
      // 연결 시점에서는 인증만 준비, 실제 인증은 join-document에서
      this.connectedUsers.set(client.id, client);
      this.logger.log(`Client ${client.id} connected successfully`);
    } catch (error) {
      this.logger.error(`Connection error for ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  // 클라이언트 연결 해제 시
  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnecting: ${client.id}`);

    try {
      // 문서 룸에서 제거
      if (client.documentId) {
        await this.leaveDocument(client, client.documentId);
      }

      // 연결된 사용자 목록에서 제거
      this.connectedUsers.delete(client.id);

      this.logger.log(`Client ${client.id} disconnected`);
    } catch (error) {
      this.logger.error(`Disconnect error for ${client.id}:`, error.message);
    }
  }

  // 문서 참여
  @SubscribeMessage('join-document')
  async handleJoinDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinDocumentDto,
  ) {
    try {
      this.logger.log(
        `User ${client.id} attempting to join document ${data.documentId}`,
      );

      // JWT 토큰 검증
      const payload = this.jwtService.verify(data.token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        client.emit('error', { message: '사용자를 찾을 수 없습니다.' });
        return;
      }

      // 문서 접근 권한 확인
      const permission = await this.documentsService.getUserDocumentPermission(
        data.documentId,
        user.id,
      );

      if (!permission) {
        client.emit('error', { message: '문서에 대한 접근 권한이 없습니다.' });
        return;
      }

      // 클라이언트 정보 설정
      client.userId = user.id;
      client.username = user.username;
      client.documentId = data.documentId;
      client.color = this.generateUserColor(user.id);

      // 문서 룸 참여
      await this.joinDocumentRoom(client, data.documentId);

      // 문서 데이터 전송
      const document = await this.documentsService.findOne(
        data.documentId,
        user.id,
      );

      client.emit('document-joined', {
        document: {
          id: document.id,
          title: document.title,
          content: document.content,
          version: document.version,
        },
        user: {
          id: user.id,
          username: user.username,
          color: client.color,
        },
        permission,
      });

      // 다른 사용자들에게 새 사용자 참여 알림
      client.to(data.documentId).emit('user-joined', {
        user: {
          id: user.id,
          username: user.username,
          color: client.color,
        },
      });

      // 현재 온라인 사용자 목록 전송
      const onlineUsers = await this.getOnlineUsers(data.documentId);
      client.emit('online-users', { users: onlineUsers });

      // Redis에 온라인 상태 저장
      await this.redisService.setUserOnline(user.id, data.documentId);

      this.logger.log(
        `User ${user.username} joined document ${data.documentId}`,
      );
    } catch (error) {
      this.logger.error(`Join document error:`, error.message);
      client.emit('error', { message: '문서 참여 중 오류가 발생했습니다.' });
    }
  }

  // 문서 나가기
  @SubscribeMessage('leave-document')
  async handleLeaveDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string },
  ) {
    await this.leaveDocument(client, data.documentId);
  }

  // 텍스트 변경 이벤트
  @SubscribeMessage('text-change')
  async handleTextChange(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TextChangeDto,
  ) {
    try {
      if (!client.userId || !client.documentId) {
        client.emit('error', { message: '인증되지 않은 사용자입니다.' });
        return;
      }

      // 편집 권한 확인
      const permission = await this.documentsService.getUserDocumentPermission(
        data.documentId,
        client.userId,
      );

      if (
        !permission ||
        ![DocumentPermission.OWNER, DocumentPermission.EDITOR].includes(
          permission,
        )
      ) {
        client.emit('error', { message: '편집 권한이 없습니다.' });
        return;
      }

      // 변경사항을 다른 클라이언트들에게 브로드캐스트
      const changeEvent = {
        operation: data.operation,
        version: data.version,
        author: {
          id: client.userId,
          username: client.username,
          color: client.color,
        },
        timestamp: new Date().toISOString(),
      };

      // 같은 문서의 다른 사용자들에게 전송 (본인 제외)
      client.to(data.documentId).emit('text-changed', changeEvent);

      // Redis에 변경사항 저장 (나중에 Operation 엔티티로 저장할 수 있음)
      await this.redisService.publish(
        `document:${data.documentId}:changes`,
        JSON.stringify(changeEvent),
      );

      this.logger.log(
        `Text change in document ${data.documentId} by ${client.username}`,
      );
    } catch (error) {
      this.logger.error(`Text change error:`, error.message);
      client.emit('error', { message: '텍스트 변경 중 오류가 발생했습니다.' });
    }
  }

  // 커서 위치 변경
  @SubscribeMessage('cursor-position')
  async handleCursorPosition(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: CursorPositionDto,
  ) {
    try {
      if (!client.userId || !client.documentId) {
        return;
      }

      // 커서 위치를 다른 사용자들에게 브로드캐스트
      const cursorEvent = {
        user: {
          id: client.userId,
          username: client.username,
          color: client.color,
        },
        position: data.position,
        selection: data.selection,
        timestamp: new Date().toISOString(),
      };

      client.to(data.documentId).emit('cursor-moved', cursorEvent);

      // Redis에 커서 위치 저장
      await this.redisService.set(
        `cursor:${data.documentId}:${client.userId}`,
        JSON.stringify(cursorEvent),
        300, // 5분 TTL
      );
    } catch (error) {
      this.logger.error(`Cursor position error:`, error.message);
    }
  }

  // 타이핑 상태 변경
  @SubscribeMessage('typing-status')
  async handleTypingStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string; isTyping: boolean },
  ) {
    try {
      if (!client.userId || !client.documentId) {
        return;
      }

      const typingEvent = {
        user: {
          id: client.userId,
          username: client.username,
          color: client.color,
        },
        isTyping: data.isTyping,
        timestamp: new Date().toISOString(),
      };

      client.to(data.documentId).emit('typing-status-changed', typingEvent);
    } catch (error) {
      this.logger.error(`Typing status error:`, error.message);
    }
  }

  // Private helper methods

  private async joinDocumentRoom(
    client: AuthenticatedSocket,
    documentId: string,
  ) {
    // Socket.io 룸 참여
    await client.join(documentId);

    // 내부 룸 관리
    if (!this.documentRooms.has(documentId)) {
      this.documentRooms.set(documentId, new Set());
    }
    this.documentRooms.get(documentId)!.add(client.id);
  }

  private async leaveDocument(client: AuthenticatedSocket, documentId: string) {
    try {
      if (client.userId && documentId) {
        // 다른 사용자들에게 떠남 알림
        client.to(documentId).emit('user-left', {
          user: {
            id: client.userId,
            username: client.username,
          },
        });

        // Redis에서 온라인 상태 제거
        await this.redisService.setUserOffline(client.userId, documentId);

        // 커서 위치 정보 제거
        await this.redisService.del(`cursor:${documentId}:${client.userId}`);
      }

      // Socket.io 룸에서 나가기
      await client.leave(documentId);

      // 내부 룸 관리에서 제거
      const room = this.documentRooms.get(documentId);
      if (room) {
        room.delete(client.id);
        if (room.size === 0) {
          this.documentRooms.delete(documentId);
        }
      }

      // 클라이언트 정보 정리
      client.documentId = undefined;

      this.logger.log(`User ${client.username} left document ${documentId}`);
    } catch (error) {
      this.logger.error(`Leave document error:`, error.message);
    }
  }

  private async getOnlineUsers(documentId: string): Promise<any[]> {
    const users: OnlineUserDto[] = [];
    const room = this.documentRooms.get(documentId);

    if (room) {
      for (const socketId of room) {
        const client = this.connectedUsers.get(socketId);
        if (client && client.userId) {
          users.push({
            id: client.userId,
            username: client.username,
            color: client.color,
          });
        }
      }
    }

    return users;
  }

  private generateUserColor(userId: string): string {
    // 사용자 ID 기반으로 일관된 색상 생성
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E9',
      '#F8C471',
      '#82E0AA',
      '#F1948A',
      '#85C1E9',
      '#D7BDE2',
    ];

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
    }

    return colors[Math.abs(hash) % colors.length];
  }
}
