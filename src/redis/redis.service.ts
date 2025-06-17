// src/redis/redis.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: RedisClientType,
  ) {}

  // 기본 Redis 작업
  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.redisClient.setEx(key, ttlSeconds, value);
      } else {
        await this.redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  // 실시간 협업을 위한 Pub/Sub 기능
  async publish(channel: string, message: string): Promise<boolean> {
    try {
      await this.redisClient.publish(channel, message);
      return true;
    } catch (error) {
      this.logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
      return false;
    }
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    try {
      const subscriber = this.redisClient.duplicate();
      await subscriber.connect();

      await subscriber.subscribe(channel, (message) => {
        callback(message);
      });

      this.logger.log(`Subscribed to channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Redis SUBSCRIBE error for channel ${channel}:`, error);
    }
  }

  // 세션 관리
  async setUserSession(
    userId: string,
    sessionData: any,
    ttlSeconds = 86400,
  ): Promise<boolean> {
    const key = `user:session:${userId}`;
    return this.set(key, JSON.stringify(sessionData), ttlSeconds);
  }

  async getUserSession(userId: string): Promise<any | null> {
    const key = `user:session:${userId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId: string): Promise<boolean> {
    const key = `user:session:${userId}`;
    return this.del(key);
  }

  // 온라인 사용자 관리
  async setUserOnline(userId: string, roomId?: string): Promise<boolean> {
    const key = roomId ? `room:${roomId}:online` : 'users:online';
    try {
      await this.redisClient.sAdd(key, userId);
      return true;
    } catch (error) {
      this.logger.error(`Redis online user error:`, error);
      return false;
    }
  }

  async setUserOffline(userId: string, roomId?: string): Promise<boolean> {
    const key = roomId ? `room:${roomId}:online` : 'users:online';
    try {
      await this.redisClient.sRem(key, userId);
      return true;
    } catch (error) {
      this.logger.error(`Redis offline user error:`, error);
      return false;
    }
  }

  async getOnlineUsers(roomId?: string): Promise<string[]> {
    const key = roomId ? `room:${roomId}:online` : 'users:online';
    try {
      return await this.redisClient.sMembers(key);
    } catch (error) {
      this.logger.error(`Redis get online users error:`, error);
      return [];
    }
  }

  // 캐시 기능
  async cacheDocument(
    documentId: string,
    content: any,
    ttlSeconds = 3600,
  ): Promise<boolean> {
    const key = `document:cache:${documentId}`;
    return this.set(key, JSON.stringify(content), ttlSeconds);
  }

  async getCachedDocument(documentId: string): Promise<any | null> {
    const key = `document:cache:${documentId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateDocumentCache(documentId: string): Promise<boolean> {
    const key = `document:cache:${documentId}`;
    return this.del(key);
  }
}
