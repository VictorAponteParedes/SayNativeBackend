import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatMessageEntity } from '../../chats/entities/chat-message.entity';

@Entity('message_translations')
@Index(['messageId', 'targetLang'], { unique: true })
export class MessageTranslationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  messageId: string;

  @ManyToOne(() => ChatMessageEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: ChatMessageEntity;

  @Column({ type: 'varchar', length: 10 })
  targetLang: string;

  @Column({ type: 'text' })
  translatedText: string;

  @Column({ type: 'varchar', length: 50, default: 'deepl' })
  provider: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
