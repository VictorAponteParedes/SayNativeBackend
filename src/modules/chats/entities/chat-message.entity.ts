import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ChatRoomEntity } from './chat-room.entity';

export enum MessageType {
  TEXT = 'text',
  AUDIO = 'audio',
  VIDEOCALL_ENDED = 'videocall_ended',
  MISSED_CALL = 'missed_call',
}

@Entity('chat_messages')
export class ChatMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  roomId: string;

  @ManyToOne(() => ChatRoomEntity, (room) => room.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoomEntity;

  @Index()
  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'senderId' })
  sender: UserEntity;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', nullable: true })
  translatedText: string | null;

  @Column({ type: 'boolean', default: false })
  isAudio: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  audioUrl: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  audioDuration: string | null;

  @Column({ type: 'varchar', length: 10, default: '1x' })
  audioSpeed: string;

  @Column({ type: 'text', nullable: true })
  transcription: string | null;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
