import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTranslationConfigDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Activar o desactivar el servicio de traducción',
  })
  @IsBoolean()
  @IsOptional()
  isTranslationEnabled?: boolean;

  @ApiPropertyOptional({
    example: 480000,
    description: 'Límite máximo mensual de caracteres antes de cortar el servicio',
  })
  @IsInt()
  @Min(1000)
  @IsOptional()
  monthlyLimit?: number;
}
