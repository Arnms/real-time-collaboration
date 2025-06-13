import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentPermission } from '../documents/entities/document-permission.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomParticipant } from '../rooms/entities/room-participant.entity';
import { Operation } from '../collaboration/entities/operation.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
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
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
        // 연결 풀 설정
        extra: {
          connectionLimit: 10,
          acquireTimeout: 60000,
          timeout: 60000,
        },
        // 재시도 설정
        retryAttempts: 3,
        retryDelay: 3000,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
