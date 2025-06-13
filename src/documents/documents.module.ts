import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { DocumentPermission } from './entities/document-permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentPermission])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService, TypeOrmModule],
})
export class DocumentsModule {}
