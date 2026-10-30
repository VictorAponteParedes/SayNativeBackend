import { IsString, IsOptional, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TranslateMessageDto {
  @ApiPropertyOptional({
    example: 'ES',
    description: 'Código de idioma de destino (ej: ES, EN, PT, FR, JA, ZH). Por defecto: ES',
  })
  @IsString({ message: 'errors.translations.invalid_target_lang' })
  @Length(2, 5, { message: 'errors.translations.invalid_target_lang' })
  @IsOptional()
  targetLang?: string;
}
