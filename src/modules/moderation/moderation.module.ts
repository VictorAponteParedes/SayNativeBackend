import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBlockEntity } from './entities/user-block.entity';
import { UserReportEntity } from './entities/user-report.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ModerationService } from './services/moderation.service';
import { ModerationController } from './controllers/moderation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserBlockEntity,
      UserReportEntity,
      UserEntity,
    ]),
  ],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
