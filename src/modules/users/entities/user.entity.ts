import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { FileEntity } from '../../files/entities/file.entity';
import { UserLanguageEntity } from './user-language.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'uuid', nullable: true })
  avatarId: string | null;

  @OneToOne(() => FileEntity, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'avatarId' })
  avatar: FileEntity | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  countryCode: string | null; // ej: 'ES', 'US'

  @Column({ type: 'varchar', length: 10, nullable: true })
  countryFlag: string | null; // ej: '🇪🇸', '🇺🇸'

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isAvailableToTeach: boolean;

  @Column({ type: 'smallint', default: 7 })
  earningRatePerMin: number;

  @Column({ type: 'smallint', default: 10 })
  learningCostPerMin: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ type: 'integer', default: 0 })
  totalCalls: number;

  @Column({ type: 'decimal', precision: 6, scale: 1, default: 0.0 })
  hoursPracticed: number;

  @Column({ type: 'integer', default: 0 })
  reviewCount: number;

  @Column({ type: 'boolean', default: false })
  acceptedTerms: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  termsAcceptedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  acceptedPromotions: boolean;

  @OneToMany(() => UserLanguageEntity, (lang) => lang.user, {
    cascade: true,
    eager: true,
  })
  userLanguages: UserLanguageEntity[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
