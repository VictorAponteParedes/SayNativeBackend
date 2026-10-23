import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum LanguageType {
  NATIVE = 'NATIVE',
  LEARNING = 'LEARNING',
}

export enum CefrLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

@Entity('user_languages')
export class UserLanguageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.userLanguages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'varchar', length: 10 })
  languageCode: string; // ej: 'en', 'es', 'ja', 'zh', 'fr'

  @Column({ type: 'varchar', length: 100 })
  languageName: string; // ej: 'Inglés', 'Español'

  @Column({ type: 'varchar', length: 10 })
  flagEmoji: string; // ej: '🇺🇸', '🇪🇸'

  @Column({
    type: 'enum',
    enum: LanguageType,
    default: LanguageType.LEARNING,
  })
  type: LanguageType;

  @Column({
    type: 'enum',
    enum: CefrLevel,
    nullable: true,
  })
  cefrLevel: CefrLevel | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  targetLevel: string | null; // ej: 'B2'

  @Column({ type: 'smallint', default: 0 })
  progressPercentage: number;
}
