import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('translation_usage')
export class TranslationUsageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 7 })
  monthPeriod: string; // Formato: YYYY-MM

  @Column({ type: 'integer', default: 0 })
  charactersUsed: number;

  @Column({ type: 'integer', default: 480000 })
  monthlyLimit: number;

  @Column({ type: 'boolean', default: true })
  isTranslationEnabled: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
