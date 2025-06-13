import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DocumentPermission } from './document-permission.entity';
import { Room } from '../../rooms/entities/room.entity';
import { Operation } from '../../collaboration/entities/operation.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column('jsonb', { nullable: true })
  metadata: {
    theme?: string;
    fontSize?: number;
    fontFamily?: string;
    [key: string]: any;
  };

  @Column({ default: 1 })
  version: number;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: false })
  isTemplate: boolean;

  @Column({ nullable: true })
  templateCategory: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.ownedDocuments)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @OneToMany(() => DocumentPermission, (permission) => permission.document)
  permissions: DocumentPermission[];

  @OneToMany(() => Room, (room) => room.document)
  rooms: Room[];

  @OneToMany(() => Operation, (operation) => operation.document)
  operations: Operation[];
}
