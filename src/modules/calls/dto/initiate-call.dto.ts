import { IsUUID, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateCallDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID('4', { message: 'errors.calls.invalid_receiver_id' })
  receiverId: string;

  @ApiProperty({ example: 'video', enum: ['video', 'audio'], default: 'video' })
  @IsEnum(['video', 'audio'], { message: 'errors.calls.invalid_call_type' })
  @IsOptional()
  callType?: 'video' | 'audio' = 'video';

  @ApiProperty({ example: 10, default: 10 })
  @IsInt({ message: 'errors.calls.rate_must_be_integer' })
  @Min(1, { message: 'errors.calls.min_rate' })
  @IsOptional()
  ratePerMinute?: number = 10;
}
