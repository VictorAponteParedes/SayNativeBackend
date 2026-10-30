import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { TranslationsService } from '../services/translations.service';
import { TranslateMessageDto } from '../dto/translate-message.dto';
import { UpdateTranslationConfigDto } from '../dto/update-translation-config.dto';

@ApiTags('Traducciones (Translations)')
@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Post('messages/:messageId')
  @ApiOperation({
    summary: 'Traducir un mensaje de chat usando DeepL con caché y circuit breaker',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Traducción obtenida con éxito (desde caché o desde DeepL)',
  })
  async translateMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: TranslateMessageDto,
    @Headers('accept-language') lang = 'es',
  ) {
    return await this.translationsService.translateChatMessage(
      messageId,
      dto.targetLang || 'ES',
      lang,
    );
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Consultar métricas de consumo de caracteres y límite mensual (Backoffice)',
  })
  async getUsageMetrics() {
    return await this.translationsService.getUsageMetrics();
  }

  @Patch('config')
  @ApiOperation({
    summary: 'Activar/desactivar servicio de traducción o ajustar límite mensual (Backoffice)',
  })
  async updateConfig(
    @Body() dto: UpdateTranslationConfigDto,
    @Headers('accept-language') lang = 'es',
  ) {
    return await this.translationsService.updateConfig(dto, lang);
  }
}
