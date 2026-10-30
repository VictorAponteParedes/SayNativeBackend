import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { TranslationUsageEntity } from '../entities/translation-usage.entity';
import { MessageTranslationEntity } from '../entities/message-translation.entity';
import { ChatMessageEntity } from '../../chats/entities/chat-message.entity';
import { UpdateTranslationConfigDto } from '../dto/update-translation-config.dto';

@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);

  constructor(
    @InjectRepository(TranslationUsageEntity)
    private readonly usageRepository: Repository<TranslationUsageEntity>,
    @InjectRepository(MessageTranslationEntity)
    private readonly translationRepository: Repository<MessageTranslationEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepository: Repository<ChatMessageEntity>,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Obtiene o inicializa el contador de consumo del mes actual (YYYY-MM)
   */
  async getCurrentMonthUsage(): Promise<TranslationUsageEntity> {
    const now = new Date();
    const monthPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let usage = await this.usageRepository.findOne({
      where: { monthPeriod },
    });

    if (!usage) {
      usage = this.usageRepository.create({
        monthPeriod,
        charactersUsed: 0,
        monthlyLimit: 480000,
        isTranslationEnabled: true,
      });
      usage = await this.usageRepository.save(usage);
    }

    return usage;
  }

  /**
   * Traduce un mensaje de chat usando DeepL API con caché y Circuit Breaker
   */
  async translateChatMessage(
    messageId: string,
    rawTargetLang = 'ES',
    lang = 'es',
  ): Promise<{
    messageId: string;
    targetLang: string;
    translatedText: string;
    cached: boolean;
  }> {
    const targetLang = rawTargetLang.trim().toUpperCase();

    // 1. Validar existencia del mensaje
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(
        await this.i18n.t('errors.translations.message_not_found', {
          lang,
          defaultValue: 'El mensaje a traducir no fue encontrado.',
        }),
      );
    }

    if (message.isAudio || !message.text || !message.text.trim()) {
      throw new BadRequestException(
        await this.i18n.t('errors.translations.cannot_translate_audio', {
          lang,
          defaultValue: 'Solo es posible traducir mensajes de texto.',
        }),
      );
    }

    // 2. Verificar si ya existe en la caché de la base de datos
    const cachedTranslation = await this.translationRepository.findOne({
      where: { messageId, targetLang },
    });

    if (cachedTranslation) {
      return {
        messageId,
        targetLang,
        translatedText: cachedTranslation.translatedText,
        cached: true,
      };
    }

    // 3. Circuit Breaker: Validar switch de backoffice y límite mensual de caracteres
    const usage = await this.getCurrentMonthUsage();

    if (!usage.isTranslationEnabled) {
      throw new BadRequestException(
        await this.i18n.t('errors.translations.service_disabled', {
          lang,
          defaultValue: 'El servicio de traducción se encuentra temporalmente desactivado.',
        }),
      );
    }

    const textLength = message.text.length;
    if (usage.charactersUsed + textLength >= usage.monthlyLimit) {
      this.logger.warn(
        `Límite mensual de traducción alcanzado (${usage.charactersUsed}/${usage.monthlyLimit}). Cortando API.`,
      );
      throw new BadRequestException(
        await this.i18n.t('errors.translations.quota_exceeded', {
          lang,
          defaultValue:
            'El servicio de traducción ha alcanzado el límite mensual gratuito.',
        }),
      );
    }

    // 4. Llamada a DeepL API
    const apiKey =
      this.configService.get<string>('DEEPL_API_KEY') ||
      process.env.DEEPL_API_KEY;

    let translatedText: string;

    if (!apiKey) {
      // Modo desarrollo sin API key configurada aún
      this.logger.warn(
        'DEEPL_API_KEY no encontrada en las variables de entorno. Generando traducción simulada para desarrollo.',
      );
      translatedText = `[DeepL Demo ${targetLang}]: ${message.text}`;
    } else {
      translatedText = await this.callDeepLApi(message.text, targetLang, apiKey, lang);
    }

    // 5. Guardar en message_translations (Caché permanente)
    const newTranslation = this.translationRepository.create({
      messageId: message.id,
      targetLang,
      translatedText,
      provider: 'deepl',
    });
    await this.translationRepository.save(newTranslation);

    // 6. Actualizar contador de caracteres
    usage.charactersUsed += textLength;
    await this.usageRepository.save(usage);

    // 7. Actualizar translatedText en la entidad de mensaje para retrocompatibilidad
    message.translatedText = translatedText;
    await this.messageRepository.save(message);

    return {
      messageId: message.id,
      targetLang,
      translatedText,
      cached: false,
    };
  }

  /**
   * Comunicación HTTP con la API de DeepL (Free Tier)
   */
  private async callDeepLApi(
    text: string,
    targetLang: string,
    apiKey: string,
    lang = 'es',
  ): Promise<string> {
    // Normalizar idiomas compuestos para DeepL
    let deepLTarget = targetLang;
    if (targetLang === 'EN') deepLTarget = 'EN-US';
    if (targetLang === 'PT') deepLTarget = 'PT-BR';

    try {
      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [text],
          target_lang: deepLTarget,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Error DeepL API (${response.status}): ${errorBody}`);
        throw new BadRequestException(
          await this.i18n.t('errors.translations.translation_failed', {
            lang,
            defaultValue: 'No se pudo completar la traducción en este momento.',
          }),
        );
      }

      const data = (await response.json()) as {
        translations?: { text: string }[];
      };

      if (!data.translations || data.translations.length === 0) {
        throw new BadRequestException(
          await this.i18n.t('errors.translations.translation_failed', {
            lang,
            defaultValue: 'No se pudo completar la traducción en este momento.',
          }),
        );
      }

      return data.translations[0].text;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Excepción conectando con DeepL: ${err?.message}`);
      throw new BadRequestException(
        await this.i18n.t('errors.translations.translation_failed', {
          lang,
          defaultValue: 'No se pudo completar la traducción en este momento.',
        }),
      );
    }
  }

  /**
   * Obtiene las métricas de consumo actuales para el Backoffice
   */
  async getUsageMetrics(): Promise<{
    monthPeriod: string;
    charactersUsed: number;
    monthlyLimit: number;
    isTranslationEnabled: boolean;
    percentageUsed: number;
    charactersRemaining: number;
  }> {
    const usage = await this.getCurrentMonthUsage();
    const percentageUsed = Math.min(
      100,
      Number(((usage.charactersUsed / usage.monthlyLimit) * 100).toFixed(2)),
    );
    const charactersRemaining = Math.max(0, usage.monthlyLimit - usage.charactersUsed);

    return {
      monthPeriod: usage.monthPeriod,
      charactersUsed: usage.charactersUsed,
      monthlyLimit: usage.monthlyLimit,
      isTranslationEnabled: usage.isTranslationEnabled,
      percentageUsed,
      charactersRemaining,
    };
  }

  /**
   * Actualiza la configuración de traducción desde el Backoffice
   */
  async updateConfig(
    dto: UpdateTranslationConfigDto,
    lang = 'es',
  ): Promise<{
    success: boolean;
    message: string;
    usage: TranslationUsageEntity;
  }> {
    const usage = await this.getCurrentMonthUsage();

    if (typeof dto.isTranslationEnabled === 'boolean') {
      usage.isTranslationEnabled = dto.isTranslationEnabled;
    }

    if (typeof dto.monthlyLimit === 'number') {
      usage.monthlyLimit = dto.monthlyLimit;
    }

    const updated = await this.usageRepository.save(usage);
    const message = await this.i18n.t('translations.config_updated', {
      lang,
      defaultValue: 'Configuración de traducción actualizada con éxito.',
    });

    return {
      success: true,
      message,
      usage: updated,
    };
  }
}
