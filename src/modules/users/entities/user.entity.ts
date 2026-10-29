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
import { UserSettingsEntity } from './user-settings.entity';
import { UserStatsEntity } from './user-stats.entity';
import { WalletEntity } from '../../coins/entities/wallet.entity';

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

  @Column({ type: 'date', nullable: true })
  birthDate: Date | string | null;

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

  @OneToOne(() => UserSettingsEntity, (settings) => settings.user, {
    cascade: true,
    eager: true,
  })
  settings: UserSettingsEntity;

  @OneToOne(() => UserStatsEntity, (stats) => stats.user, {
    cascade: true,
    eager: true,
  })
  stats: UserStatsEntity;

  @OneToOne(() => WalletEntity, (wallet) => wallet.user, {
    cascade: true,
    eager: true,
  })
  wallet: WalletEntity;

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
