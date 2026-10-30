import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('user_blocks')
@Unique(['blockerId', 'blockedId'])
export class UserBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  blockerId: string;

  @Index()
  @Column({ type: 'uuid' })
  blockedId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedId' })
  blocked: UserEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
