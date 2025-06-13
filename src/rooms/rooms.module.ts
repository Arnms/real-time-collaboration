import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { Room } from './entities/room.entity';
import { RoomParticipant } from './entities/room-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomParticipant])],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService, TypeOrmModule],
})
export class RoomsModule {}
