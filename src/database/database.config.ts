import { DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentPermission } from '../documents/entities/document-permission.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomParticipant } from '../rooms/entities/room-participant.entity';
import { Operation } from '../collaboration/entities/operation.entity';

export const createDatabaseConfig = (
  configService: ConfigService,
): DataSourceOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'password'),
    database: configService.get<string>('DB_DATABASE', 'collaboration_db'),
    entities: [
      User,
      Document,
      DocumentPermission,
      Room,
      RoomParticipant,
      Operation,
    ],
    migrations: ['dist/database/migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    migrationsRun: false,
    synchronize: !isProduction, // 프로덕션에서는 false
    logging: !isProduction,
    // 연결 풀 설정
    extra: {
      connectionLimit: configService.get<number>('DB_CONNECTION_LIMIT', 10),
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

// CLI용 설정
export const createCliDatabaseConfig = (): DataSourceOptions => {
  const { config } = require('dotenv');
  config();

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT!) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'collaboration_db',
    entities: ['src/**/*.entity{.ts,.js}'],
    migrations: ['src/database/migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
  };
};
