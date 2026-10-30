import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChatsService } from '../services/chats.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { ChatMessageEntity } from '../entities/chat-message.entity';
import { ChatRoomEntity } from '../entities/chat-room.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chats',
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatsGateway.name);

  constructor(private readonly chatsService: ChatsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado al socket de chat: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado del socket de chat: ${client.id}`);
  }

  @SubscribeMessage('register_user')
  @SubscribeMessage('chat:register-user')
  handleRegisterUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    if (data?.userId) {
      client.join(`user_${data.userId}`);
      this.logger.log(`Usuario ${data.userId} registrado en canal personal user_${data.userId}`);
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string }
  ) {
    if (data?.roomId) {
      client.join(`room_${data.roomId}`);
      this.logger.log(`Usuario ${data.userId} se unió a la sala room_${data.roomId}`);
      client.to(`room_${data.roomId}`).emit('user_joined', { userId: data.userId });
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string }
  ) {
    if (data?.roomId) {
      client.leave(`room_${data.roomId}`);
      this.logger.log(`Usuario ${data.userId} salió de la sala room_${data.roomId}`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { senderId: string; dto: SendMessageDto; lang?: string }
  ) {
    try {
      const message = await this.chatsService.sendMessage(
        payload.senderId,
        payload.dto,
        payload.lang || 'es'
      );
      return { success: true, data: message };
    } catch (error: any) {
      this.logger.error(`Error enviando mensaje por websocket: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Escucha el evento desacoplado emitido por ChatsService (tanto vía HTTP como vía WebSocket)
   * y retransmite a la sala activa y al canal personal del destinatario
   */
  @OnEvent('chat.message_sent')
  handleChatMessageSent(payload: { message: ChatMessageEntity; room: ChatRoomEntity }) {
    const { message, room } = payload;

    // 1. Emitir a todos los que estén dentro de la sala de conversación
    this.server.to(`room_${message.roomId}`).emit('new_message', message);

    // 2. Determinar el destinatario
    const recipientId =
      room.participantOneId === message.senderId
        ? room.participantTwoId
        : room.participantOneId;

    // 3. Emitir a la sala personal del destinatario para actualizar su BottomTabBar y lista de chats en vivo
    if (recipientId) {
      this.server.to(`user_${recipientId}`).emit('new_message', message);
      this.server.to(`user_${recipientId}`).emit('new_message_notification', {
        roomId: message.roomId,
        message,
      });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; isTyping: boolean }
  ) {
    if (data?.roomId) {
      client
        .to(`room_${data.roomId}`)
        .emit('partner_typing', { userId: data.userId, isTyping: data.isTyping });
    }
  }
}
