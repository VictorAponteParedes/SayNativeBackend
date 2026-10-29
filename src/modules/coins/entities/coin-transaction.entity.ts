import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WalletEntity } from './wallet.entity';

export enum TransactionType {
  WELCOME_BONUS = 'WELCOME_BONUS',
  RECHARGE = 'RECHARGE',
  REWARD_AD = 'REWARD_AD',
  CALL_EXPENSE = 'CALL_EXPENSE',
  CALL_EARNING = 'CALL_EARNING',
  REFUND = 'REFUND',
}

@Entity('coin_transactions')
export class CoinTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  walletId: string;

  @ManyToOne(() => WalletEntity, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: WalletEntity;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'integer' })
  amount: number; // Positivo para ingresos, negativo para gastos

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.WELCOME_BONUS,
  })
  type: TransactionType;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceId: string | null; // ej. callId, packageId, receiptId

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
