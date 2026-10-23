import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSessionEntity } from './entities/call-session.entity';
import { CallsService } from './services/calls.service';
import { CallsController } from './controllers/calls.controller';
import { CallsGateway } from './gateways/calls.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([CallSessionEntity])],
  controllers: [CallsController],
  providers: [CallsService, CallsGateway],
  exports: [CallsService],
})
export class CallsModule {}
