import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'victor.aponte@saynative.com' })
  @IsEmail({}, { message: 'errors.users.invalid_email' })
  email: string;

  @ApiProperty({ example: 'ContraseñaSegura123!' })
  @IsString({ message: 'errors.users.invalid_password' })
  @MinLength(8, { message: 'errors.users.password_min_length' })
  @MaxLength(50, { message: 'errors.users.password_max_length' })
  password: string;

  @ApiProperty({ example: 'Victor Aponte' })
  @IsString({ message: 'errors.users.invalid_name' })
  @MinLength(2, { message: 'errors.users.name_min_length' })
  @MaxLength(100, { message: 'errors.users.name_max_length' })
  fullName: string;

  @ApiProperty({ example: 'ES', required: false })
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ApiProperty({ example: '🇪🇸', required: false })
  @IsString()
  @IsOptional()
  countryFlag?: string;

  @ApiProperty({ example: 'es', default: 'es' })
  @IsString()
  @IsOptional()
  nativeLanguageCode?: string = 'es';

  @ApiProperty({ example: 'en', default: 'en' })
  @IsString()
  @IsOptional()
  learningLanguageCode?: string = 'en';
}
