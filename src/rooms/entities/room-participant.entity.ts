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
import { User } from '../../users/entities/user.entity';
import { Room } from './room.entity';

@Entity('room_participants')
@Unique(['userId', 'roomId'])
export class RoomParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  nickname: string; // 룸에서 사용할 닉네임

  @Column({ default: '#3B82F6' })
  color: string; // 사용자 커서/하이라이트 색상

  @Column({ default: true })
  isOnline: boolean;

  @Column({ nullable: true })
  lastSeenAt: Date;

  @Column('jsonb', { nullable: true })
  cursorPosition: {
    line?: number;
    column?: number;
    selection?: { start: number; end: number };
  };

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.roomParticipations)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Room, (room) => room.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column()
  roomId: string;
}
