import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional, IsNumber } from 'class-validator';

export class SignalContentDto {
  @ApiProperty({ enum: ['offer', 'answer'] })
  @IsString()
  @IsNotEmpty()
  type: 'offer' | 'answer';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sdp: string;
}

export class SignalingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  callId: string;

  @ApiProperty({ type: SignalContentDto })
  @IsObject()
  signal: SignalContentDto;
}

export class IceCandidateContentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  candidate: string;

  @ApiProperty({ required: false, nullable: true })
  @IsString()
  @IsOptional()
  sdpMid?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsNumber()
  @IsOptional()
  sdpMLineIndex?: number | null;
}

export class IceCandidateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  callId: string;

  @ApiProperty({ type: IceCandidateContentDto })
  @IsObject()
  candidate: IceCandidateContentDto;
}
