import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserLanguageEntity } from './entities/user-language.entity';
import { UserSettingsEntity } from './entities/user-settings.entity';
import { UserStatsEntity } from './entities/user-stats.entity';
import { WalletEntity } from '../coins/entities/wallet.entity';
import { CoinTransactionEntity } from '../coins/entities/coin-transaction.entity';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserLanguageEntity,
      UserSettingsEntity,
      UserStatsEntity,
      WalletEntity,
      CoinTransactionEntity,
    ]),
    FilesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
