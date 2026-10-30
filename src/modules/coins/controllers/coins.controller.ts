import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { CoinsService } from '../services/coins.service';
import { RechargeCoinsDto } from '../dto/recharge-coins.dto';
import { RewardCoinsDto } from '../dto/reward-coins.dto';
import { CoinTransactionEntity } from '../entities/coin-transaction.entity';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserEntity } from '../../users/entities/user.entity';

@ApiTags('Monedas y Billetera (Coins)')
@Controller('coins')
export class CoinsController {
  constructor(
    private readonly coinsService: CoinsService,
    private readonly i18n: I18nService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: 'Obtener el saldo actual de monedas del usuario' })
  async getBalance(
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Headers('accept-language') lang = 'es'
  ): Promise<{ balance: number }> {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.coins.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    return await this.coinsService.getBalance(targetUserId, lang);
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener el historial de transacciones de monedas' })
  @SwaggerResponse({ status: 200, type: [CoinTransactionEntity] })
  async getHistory(
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Query('limit') limit = 50,
    @Headers('accept-language') lang = 'es'
  ): Promise<CoinTransactionEntity[]> {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.coins.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    return await this.coinsService.getTransactions(
      targetUserId,
      Number(limit) || 50,
      lang
    );
  }

  @Post('recharge')
  @ApiOperation({ summary: 'Recargar monedas mediante compra de paquete' })
  async recharge(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @Body() dto: RechargeCoinsDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<{ balance: number; transaction: CoinTransactionEntity; message: string }> {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.coins.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    return await this.coinsService.recharge(targetUserId, dto, lang);
  }

  @Post('reward')
  @ApiOperation({ summary: 'Reclamar recompensa por anuncio patrocinado o bono diario' })
  async reward(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @Body() dto: RewardCoinsDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<{ balance: number; transaction: CoinTransactionEntity; message: string }> {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.coins.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    return await this.coinsService.reward(targetUserId, dto, lang);
  }
}
