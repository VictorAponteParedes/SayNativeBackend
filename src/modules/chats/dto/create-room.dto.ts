import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({
    example: '8827b8cc-b395-44c5-86c9-10aef550e5bb',
    description: 'UUID del compañero con el que se desea chatear',
  })
  @IsUUID('4', { message: 'errors.chats.invalid_partner_id' })
  partnerId: string;
}
