import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ChatMessageEntity } from './chat-message.entity';

@Entity('chat_rooms')
export class ChatRoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  participantOneId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'participantOneId' })
  participantOne: UserEntity;

  @Index()
  @Column({ type: 'uuid' })
  participantTwoId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'participantTwoId' })
  participantTwo: UserEntity;

  @Column({ type: 'text', nullable: true })
  lastMessageText: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  unreadCountUserOne: number;

  @Column({ type: 'integer', default: 0 })
  unreadCountUserTwo: number;

  @OneToMany(() => ChatMessageEntity, (message) => message.room)
  messages: ChatMessageEntity[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
