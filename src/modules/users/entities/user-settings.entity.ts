import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_settings')
export class UserSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => UserEntity, (user) => user.settings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'boolean', default: false })
  isAvailableToTeach: boolean;

  @Column({ type: 'smallint', default: 7 })
  earningRatePerMin: number;

  @Column({ type: 'smallint', default: 10 })
  learningCostPerMin: number;

  @Column({ type: 'boolean', default: false })
  acceptedTerms: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  termsAcceptedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  acceptedPromotions: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
