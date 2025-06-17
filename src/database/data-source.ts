import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentPermission } from '../documents/entities/document-permission.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomParticipant } from '../rooms/entities/room-participant.entity';
import { Operation } from '../collaboration/entities/operation.entity';

config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST') || 'localhost',
  port: parseInt(configService.get('DB_PORT')!) || 5432,
  username: configService.get('DB_USERNAME') || 'postgres',
  password: configService.get('DB_PASSWORD') || 'password',
  database: configService.get('DB_DATABASE') || 'collaboration_db',
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  entities: [
    User,
    Document,
    DocumentPermission,
    Room,
    RoomParticipant,
    Operation,
  ],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  subscribers: ['src/**/*.subscriber{.ts,.js}'],
  // CLI 실행 시에도 dist 폴더 사용 가능하도록
  ...(process.env.NODE_ENV === 'production' && {
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/database/migrations/*{.ts,.js}'],
    subscribers: ['dist/**/*.subscriber{.ts,.js}'],
  }),
});
