import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token emitido previamente para renovación de sesión',
  })
  @IsString({ message: 'errors.auth.invalid_refresh_token' })
  @IsNotEmpty({ message: 'errors.auth.refresh_token_required' })
  refreshToken: string;
}
