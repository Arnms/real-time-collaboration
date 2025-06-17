import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { RoomsModule } from './rooms/rooms.module';
import { WebsocketModule } from './websocket/websocket.module';
import { SharedModule } from './shared/shared.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

// 환경변수 설정
import {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
} from './config/configuration';
import { envValidationSchema } from './config/env-validation.schema';

@Module({
  imports: [
    // 환경설정 모듈 (검증 포함)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true, // 수정: 정의되지 않은 환경변수 허용
        abortEarly: true, // 첫 번째 에러에서 중단
      },
    }),

    // 인프라 모듈들
    DatabaseModule,
    RedisModule,
    HealthModule,

    // 공통 모듈
    SharedModule,

    // 기능 모듈들
    AuthModule,
    UsersModule,
    DocumentsModule,
    CollaborationModule,
    RoomsModule,
    WebsocketModule,
  ],
  providers: [
    // 전역 Guards 설정
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
