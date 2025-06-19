import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Operation } from './entities/operation.entity';
import { CollaborationService } from './collaboration.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [TypeOrmModule.forFeature([Operation]), DocumentsModule],
  providers: [CollaborationService],
  exports: [CollaborationService, TypeOrmModule],
})
export class CollaborationModule {}
