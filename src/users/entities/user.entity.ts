import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../../shared/enums/user-role.enum';
import { Document } from '../../documents/entities/document.entity';
import { DocumentPermission } from '../../documents/entities/document-permission.entity';
import { RoomParticipant } from '../../rooms/entities/room-participant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 관계 설정
  @OneToMany(() => Document, (document) => document.owner)
  ownedDocuments: Document[];

  @OneToMany(() => DocumentPermission, (permission) => permission.user)
  documentPermissions: DocumentPermission[];

  @OneToMany(() => RoomParticipant, (participant) => participant.user)
  roomParticipations: RoomParticipant[];
}
