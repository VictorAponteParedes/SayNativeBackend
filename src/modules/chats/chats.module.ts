import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoomEntity } from './entities/chat-room.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { ChatsService } from './services/chats.service';
import { ChatsController } from './controllers/chats.controller';
import { ChatsGateway } from './gateways/chats.gateway';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoomEntity,
      ChatMessageEntity,
      UserEntity,
    ]),
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway],
  exports: [ChatsService, TypeOrmModule],
})
export class ChatsModule {}
