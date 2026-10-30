import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { ModerationService } from '../services/moderation.service';
import { BlockUserDto } from '../dto/block-user.dto';
import { ReportUserDto } from '../dto/report-user.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserEntity } from '../../users/entities/user.entity';

@ApiTags('Moderación y Seguridad (Moderation)')
@Controller('moderation')
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly i18n: I18nService,
  ) {}

  @Post('blocks')
  @ApiOperation({ summary: 'Bloquear a un usuario' })
  @SwaggerResponse({ status: 201, description: 'Usuario bloqueado exitosamente.' })
  async blockUser(
    @Body() dto: BlockUserDto,
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Headers('accept-language') lang = 'es',
  ) {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.moderation.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        }),
      );
    }
    return await this.moderationService.blockUser(targetUserId, dto, lang);
  }

  @Delete('blocks/:blockedId')
  @ApiOperation({ summary: 'Desbloquear a un usuario' })
  @SwaggerResponse({ status: 200, description: 'Usuario desbloqueado exitosamente.' })
  async unblockUser(
    @Param('blockedId', ParseUUIDPipe) blockedId: string,
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Headers('accept-language') lang = 'es',
  ) {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.moderation.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        }),
      );
    }
    return await this.moderationService.unblockUser(targetUserId, blockedId, lang);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'Listar usuarios bloqueados por el usuario actual' })
  @SwaggerResponse({ status: 200, description: 'Lista de usuarios bloqueados.' })
  async getBlockedUsers(
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Headers('accept-language') lang = 'es',
  ) {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.moderation.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        }),
      );
    }
    return await this.moderationService.getBlockedUsers(targetUserId);
  }

  @Get('blocks/check/:partnerId')
  @ApiOperation({ summary: 'Verificar si el compañero está bloqueado' })
  @SwaggerResponse({ status: 200, description: 'Estado de bloqueo del compañero.' })
  async checkBlockStatus(
    @Param('partnerId') partnerId: string,
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
  ) {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      return { isBlockedByMe: false, isBlocked: false };
    }
    const isBlockedByMe = await this.moderationService.isBlockedByMe(targetUserId, partnerId);
    const isBlocked = await this.moderationService.isBlocked(targetUserId, partnerId);
    return { isBlockedByMe, isBlocked };
  }

  @Post('reports')
  @ApiOperation({ summary: 'Reportar a un usuario a moderación' })
  @SwaggerResponse({ status: 201, description: 'Reporte registrado exitosamente.' })
  async reportUser(
    @Body() dto: ReportUserDto,
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Headers('accept-language') lang = 'es',
  ) {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.moderation.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        }),
      );
    }
    return await this.moderationService.reportUser(targetUserId, dto, lang);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Listar reportes realizados por el usuario actual' })
  @SwaggerResponse({ status: 200, description: 'Lista de reportes registrados.' })
  async getUserReports(
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Headers('accept-language') lang = 'es',
  ) {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.moderation.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        }),
      );
    }
    return await this.moderationService.getUserReports(targetUserId);
  }
}
