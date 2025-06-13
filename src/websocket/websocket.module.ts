import { Module } from '@nestjs/common';
import { CollaborationGateway } from './collaboration/collaboration.gateway';

@Module({
  providers: [CollaborationGateway]
})
export class WebsocketModule {}
