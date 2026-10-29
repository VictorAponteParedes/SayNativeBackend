import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../entities/chat-message.entity';

export class SendMessageDto {
  @ApiPropertyOptional({
    example: '8827b8cc-b395-44c5-86c9-10aef550e5bb',
    description: 'ID de la sala de chat. Si se omite, debe proporcionarse recipientId.',
  })
  @IsUUID('4', { message: 'errors.chats.invalid_room_id' })
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional({
    example: 'f28083a9-9f35-488b-857a-0d127eb5ef7d',
    description: 'UUID del usuario destinatario (si no se proporciona roomId)',
  })
  @IsUUID('4', { message: 'errors.chats.invalid_partner_id' })
  @IsOptional()
  recipientId?: string;

  @ApiProperty({
    example: 'Hello! How are you doing today?',
    description: 'Contenido del mensaje',
  })
  @IsString()
  @IsNotEmpty({ message: 'errors.chats.message_empty' })
  text: string;

  @ApiPropertyOptional({ example: '¡Hola! ¿Cómo estás hoy?' })
  @IsString()
  @IsOptional()
  translatedText?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isAudio?: boolean;

  @ApiPropertyOptional({ example: '/api/v1/files/audio_123.m4a' })
  @IsString()
  @IsOptional()
  audioUrl?: string;

  @ApiPropertyOptional({ example: '0:28' })
  @IsString()
  @IsOptional()
  audioDuration?: string;

  @ApiPropertyOptional({ example: "Sounds great! Let's practice." })
  @IsString()
  @IsOptional()
  transcription?: string;

  @ApiPropertyOptional({
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;
}
