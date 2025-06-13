import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { RoomsModule } from './rooms/rooms.module';
import { WebsocketModule } from './websocket/websocket.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [AuthModule, UsersModule, DocumentsModule, CollaborationModule, RoomsModule, WebsocketModule, SharedModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
