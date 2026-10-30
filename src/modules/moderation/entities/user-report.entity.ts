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

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SCAM = 'scam',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
  RESOLVED = 'RESOLVED',
}

@Entity('user_reports')
export class UserReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  reporterId: string;

  @Index()
  @Column({ type: 'uuid' })
  reportedId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ReportReason.OTHER,
  })
  reason: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ReportStatus.PENDING,
  })
  status: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportedId' })
  reported: UserEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
