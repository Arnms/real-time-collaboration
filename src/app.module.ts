import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { RoomsModule } from './rooms/rooms.module';
import { WebsocketModule } from './websocket/websocket.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    // 환경설정 모듈
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 데이터베이스 모듈
    DatabaseModule,

    // 헬스체크 모듈
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
})
export class AppModule {}
