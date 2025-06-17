import { DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig, AppConfig } from '../config/configuration';

// 엔티티 직접 import (앱에서만 사용)
import { User } from '../users/entities/user.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentPermission } from '../documents/entities/document-permission.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomParticipant } from '../rooms/entities/room-participant.entity';
import { Operation } from '../collaboration/entities/operation.entity';

export const createDatabaseConfig = (
  configService: ConfigService,
): DataSourceOptions => {
  const appConfig = configService.get<AppConfig>('app')!;
  const dbConfig = configService.get<DatabaseConfig>('database')!;
  const isProduction = appConfig.nodeEnv === 'production';

  return {
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,

    // ✅ 앱에서는 직접 클래스 참조 (안전함)
    entities: [
      User,
      Document,
      DocumentPermission,
      Room,
      RoomParticipant,
      Operation,
    ],

    // 마이그레이션은 실행하지 않음 (CLI에서만)
    migrations: [],
    migrationsRun: false,
    synchronize: false, // 항상 false (마이그레이션 사용)
    logging: !isProduction,

    // 연결 풀 설정
    extra: {
      connectionLimit: dbConfig.connectionLimit,
      acquireTimeout: 60000,
      timeout: 60000,
    },

    // SSL 설정 (프로덕션용)
    ssl: isProduction
      ? {
          rejectUnauthorized: false,
        }
      : false,
  };
};
