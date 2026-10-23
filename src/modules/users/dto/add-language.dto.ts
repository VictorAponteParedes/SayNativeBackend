import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  LanguageType,
  CefrLevel,
} from '../entities/user-language.entity';

export class AddLanguageDto {
  @ApiProperty({ example: 'en' })
  @IsString({ message: 'errors.users.invalid_language_code' })
  languageCode: string;

  @ApiProperty({ example: 'Inglés' })
  @IsString({ message: 'errors.users.invalid_language_name' })
  languageName: string;

  @ApiProperty({ example: '🇺🇸' })
  @IsString()
  flagEmoji: string;

  @ApiProperty({ enum: LanguageType, default: LanguageType.LEARNING })
  @IsEnum(LanguageType, { message: 'errors.users.invalid_language_type' })
  type: LanguageType;

  @ApiProperty({ enum: CefrLevel, required: false, example: CefrLevel.B1 })
  @IsEnum(CefrLevel)
  @IsOptional()
  cefrLevel?: CefrLevel;

  @ApiProperty({ example: 'B2', required: false })
  @IsString()
  @IsOptional()
  targetLevel?: string;

  @ApiProperty({ example: 60, required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progressPercentage?: number = 0;
}
