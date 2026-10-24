import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Victor Aponte' })
  @IsString({ message: 'errors.users.invalid_name' })
  @MinLength(2, { message: 'errors.users.name_min_length' })
  @MaxLength(100, { message: 'errors.users.name_max_length' })
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: 'victor.aponte@saynative.com' })
  @IsEmail({}, { message: 'errors.users.invalid_email' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+34 612 345 678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Apasionado por los idiomas y la tecnología ✈️' })
  @IsString()
  @MaxLength(300, { message: 'errors.users.bio_max_length' })
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'ES' })
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ApiPropertyOptional({ example: '🇪🇸' })
  @IsString()
  @IsOptional()
  countryFlag?: string;

  @ApiPropertyOptional({ example: '1998-04-20', description: 'Fecha de nacimiento' })
  @IsString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isAvailableToTeach?: boolean;
}
