import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportUserDto {
  @ApiProperty({
    description: 'UUID del usuario a reportar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'errors.moderation.invalid_target_id' })
  reportedId: string;

  @ApiPropertyOptional({
    description: 'Motivo del reporte (spam, harassment, inappropriate_content, scam, other)',
    example: 'inappropriate_content',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Detalles adicionales o descripción de lo ocurrido',
    example: 'Envió contenido ofensivo en el chat.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
