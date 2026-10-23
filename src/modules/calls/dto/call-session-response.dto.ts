import { ApiProperty } from '@nestjs/swagger';
import { CallSessionStatus } from '../entities/call-session.entity';

export class CallSessionResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  callerId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  receiverId: string;

  @ApiProperty({ enum: CallSessionStatus, example: CallSessionStatus.CONNECTED })
  status: CallSessionStatus;

  @ApiProperty({ example: 'video' })
  callType: 'video' | 'audio';

  @ApiProperty({ example: 10 })
  ratePerMinute: number;

  @ApiProperty({ example: 340 })
  durationSeconds: number;

  @ApiProperty({ example: 60 })
  coinsTransferred: number;

  @ApiProperty({ example: '2026-10-23T18:00:00Z', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ example: '2026-10-23T18:05:40Z', nullable: true })
  endedAt: Date | null;

  @ApiProperty({ example: '2026-10-23T18:00:00Z' })
  createdAt: Date;
}
