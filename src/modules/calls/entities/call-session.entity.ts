import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum CallSessionStatus {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  CONNECTED = 'connected',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  MISSED = 'missed',
  BUSY = 'busy',
  FAILED = 'failed',
}

@Entity('call_sessions')
export class CallSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  callerId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'callerId' })
  caller: UserEntity;

  @Index()
  @Column({ type: 'uuid' })
  receiverId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver: UserEntity;

  @Column({
    type: 'enum',
    enum: CallSessionStatus,
    default: CallSessionStatus.INITIATED,
  })
  status: CallSessionStatus;

  @Column({ type: 'varchar', length: 10, default: 'video' })
  callType: 'video' | 'audio';

  @Column({ type: 'smallint', default: 10 })
  ratePerMinute: number;

  @Column({ type: 'integer', default: 0 })
  durationSeconds: number;

  @Column({ type: 'integer', default: 0 })
  coinsTransferred: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
