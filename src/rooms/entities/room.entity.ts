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
import { Document } from '../../documents/entities/document.entity';
import { RoomParticipant } from './room-participant.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 10 })
  maxParticipants: number;

  @Column('jsonb', { nullable: true })
  settings: {
    allowAnonymous?: boolean;
    requireApproval?: boolean;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 관계 설정
  @ManyToOne(() => Document, (document) => document.rooms)
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column()
  documentId: string;

  @OneToMany(() => RoomParticipant, (participant) => participant.room)
  participants: RoomParticipant[];
}
