import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationUsageEntity } from './entities/translation-usage.entity';
import { MessageTranslationEntity } from './entities/message-translation.entity';
import { ChatMessageEntity } from '../chats/entities/chat-message.entity';
import { TranslationsService } from './services/translations.service';
import { TranslationsController } from './controllers/translations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TranslationUsageEntity,
      MessageTranslationEntity,
      ChatMessageEntity,
    ]),
  ],
  controllers: [TranslationsController],
  providers: [TranslationsService],
  exports: [TranslationsService],
})
export class TranslationsModule {}
