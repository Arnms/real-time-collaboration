// src/database/database.config.ts
import { DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentPermission } from '../documents/entities/document-permission.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomParticipant } from '../rooms/entities/room-participant.entity';
import { Operation } from '../collaboration/entities/operation.entity';
import { DatabaseConfig, AppConfig } from '../config/configuration';

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
    entities: [
      User,
      Document,
      DocumentPermission,
      Room,
      RoomParticipant,
      Operation,
    ],
    migrations: [
      isProduction
        ? 'dist/database/migrations/*{.ts,.js}'
        : 'src/database/migrations/*{.ts,.js}',
    ],
    migrationsTableName: 'migrations',
    migrationsRun: false,
    synchronize: !isProduction, // 프로덕션에서는 false
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
