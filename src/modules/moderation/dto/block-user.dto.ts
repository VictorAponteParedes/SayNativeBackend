import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiProperty({
    description: 'UUID del usuario a bloquear',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'errors.moderation.invalid_target_id' })
  blockedId: string;

  @ApiPropertyOptional({
    description: 'Motivo opcional del bloqueo',
    example: 'Comportamiento no deseado',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
