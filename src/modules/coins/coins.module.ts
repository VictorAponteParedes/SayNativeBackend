import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletEntity } from './entities/wallet.entity';
import { CoinTransactionEntity } from './entities/coin-transaction.entity';
import { CoinsService } from './services/coins.service';
import { CoinsController } from './controllers/coins.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletEntity, CoinTransactionEntity]),
  ],
  controllers: [CoinsController],
  providers: [CoinsService],
  exports: [CoinsService, TypeOrmModule],
})
export class CoinsModule {}
