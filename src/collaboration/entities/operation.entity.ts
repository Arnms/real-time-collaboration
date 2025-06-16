import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OperationType } from '../../shared/enums/operation-type.enum';
import { User } from '../../users/entities/user.entity';
import { Document } from '../../documents/entities/document.entity';

@Entity('operations')
@Index(['documentId', 'documentVersion']) // documentVersion으로 수정
export class Operation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: OperationType,
  })
  type: OperationType;

  @Column()
  position: number; // 텍스트에서의 위치

  @Column({ nullable: true })
  length: number; // 삭제/유지할 길이

  @Column('text', { nullable: true })
  content: string; // 삽입할 내용

  @Column('jsonb', { nullable: true })
  attributes: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    fontSize?: number;
    [key: string]: any;
  };

  @Column()
  documentVersion: number; // 적용된 문서 버전

  @Column({ default: false })
  isApplied: boolean; // 적용 여부

  @CreateDateColumn()
  createdAt: Date;

  // 관계 설정
  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: string;

  @ManyToOne(() => Document, (document) => document.operations)
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column()
  documentId: string;
}
