import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { ChatsService } from '../services/chats.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { ChatMessageEntity } from '../entities/chat-message.entity';
import { ChatRoomEntity } from '../entities/chat-room.entity';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserEntity } from '../../users/entities/user.entity';

@ApiTags('Mensajería y Chats (Chats)')
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las conversaciones activas del usuario con filtros' })
  async getConversations(
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Query('filter') filter?: string,
    @Headers('accept-language') lang = 'es'
  ): Promise<any[]> {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.chats.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    return await this.chatsService.getUserConversations(targetUserId, filter, lang);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Obtener las opciones de filtrado de conversaciones (Backend-Driven)' })
  async getFilterOptions(
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Headers('accept-language') lang = 'es'
  ) {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.chats.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    return await this.chatsService.getFilterOptions(targetUserId, lang);
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Crear o abrir una conversación con otro usuario' })
  @SwaggerResponse({ status: 201, type: ChatRoomEntity })
  async createOrGetRoom(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateRoomDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<ChatRoomEntity> {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.chats.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    return await this.chatsService.getOrCreateRoom(targetUserId, dto.partnerId, lang);
  }

  @Get(':roomId/messages')
  @ApiOperation({ summary: 'Obtener los mensajes de una conversación' })
  @SwaggerResponse({ status: 200, type: [ChatMessageEntity] })
  async getRoomMessages(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('limit') limit = 100,
    @Headers('accept-language') lang = 'es'
  ): Promise<ChatMessageEntity[]> {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.chats.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    return await this.chatsService.getRoomMessages(
      roomId,
      targetUserId,
      Number(limit) || 100,
      lang
    );
  }

  @Post('messages')
  @ApiOperation({ summary: 'Enviar un nuevo mensaje de texto o audio' })
  @SwaggerResponse({ status: 201, type: ChatMessageEntity })
  async sendMessage(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @Body() dto: SendMessageDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<ChatMessageEntity> {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.chats.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    return await this.chatsService.sendMessage(targetUserId, dto, lang);
  }

  @Patch(':roomId/read')
  @ApiOperation({ summary: 'Marcar todos los mensajes de la sala como leídos' })
  async markAsRead(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Headers('accept-language') lang = 'es'
  ): Promise<{ success: boolean; message: string }> {
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      throw new BadRequestException(
        await this.i18n.t('errors.chats.missing_user_id', {
          lang,
          defaultValue: 'El encabezado x-user-id es requerido.',
        })
      );
    }
    await this.chatsService.markRoomAsRead(roomId, targetUserId, lang);
    const message = await this.i18n.t('chats.messages_marked_read', {
      lang,
      defaultValue: 'Mensajes marcados como leídos con éxito.',
    });
    return { success: true, message };
  }
}
