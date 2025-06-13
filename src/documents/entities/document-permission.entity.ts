import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { DocumentPermission as PermissionEnum } from '../../shared/enums/document-permission.enum';
import { User } from '../../users/entities/user.entity';
import { Document } from './document.entity';

@Entity('document_permissions')
@Unique(['userId', 'documentId']) // 사용자당 문서별 하나의 권한만
export class DocumentPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PermissionEnum,
    default: PermissionEnum.VIEWER,
  })
  permission: PermissionEnum;

  @Column({ nullable: true })
  invitedBy: string; // 초대한 사용자 ID

  @Column({ nullable: true })
  invitedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.documentPermissions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Document, (document) => document.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column()
  documentId: string;
}
