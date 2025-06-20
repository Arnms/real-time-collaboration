export interface CollaborationUser {
  id: string;
  username: string;
  color: string;
}

export interface DocumentInfo {
  id: string;
  title: string;
  content: string;
  version: number;
}

export interface TextOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
}

export interface CursorPosition {
  position: number;
  selection?: {
    start: number;
    end: number;
  };
}

// 클라이언트 -> 서버 이벤트
export interface ClientToServerEvents {
  'join-document': (data: { documentId: string; token: string }) => void;
  'leave-document': (data: { documentId: string }) => void;
  'text-change': (data: {
    documentId: string;
    operation: TextOperation;
    version: number;
  }) => void;
  'cursor-position': (data: {
    documentId: string;
    position: number;
    selection?: { start: number; end: number };
  }) => void;
  'typing-status': (data: { documentId: string; isTyping: boolean }) => void;
}

// 서버 -> 클라이언트 이벤트
export interface ServerToClientEvents {
  'document-joined': (data: {
    document: DocumentInfo;
    user: CollaborationUser;
    permission: string;
  }) => void;
  'user-joined': (data: { user: CollaborationUser }) => void;
  'user-left': (data: {
    user: Pick<CollaborationUser, 'id' | 'username'>;
  }) => void;
  'online-users': (data: { users: CollaborationUser[] }) => void;
  'text-changed': (data: {
    operation: TextOperation;
    version: number;
    author: CollaborationUser;
    timestamp: string;
  }) => void;
  'cursor-moved': (data: {
    user: CollaborationUser;
    position: number;
    selection?: { start: number; end: number };
    timestamp: string;
  }) => void;
  'typing-status-changed': (data: {
    user: CollaborationUser;
    isTyping: boolean;
    timestamp: string;
  }) => void;
  error: (data: { message: string }) => void;
}

// WebSocket 네임스페이스별 이벤트
export interface CollaborationEvents {
  connection: (socket: any) => void;
  disconnect: (reason: string) => void;
}
