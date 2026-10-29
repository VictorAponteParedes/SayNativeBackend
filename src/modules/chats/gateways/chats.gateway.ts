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
import { ChatsService } from '../services/chats.service';
import { SendMessageDto } from '../dto/send-message.dto';

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

      // Emitir mensaje en tiempo real a todos en la sala
      this.server.to(`room_${message.roomId}`).emit('new_message', message);
      return { success: true, data: message };
    } catch (error: any) {
      this.logger.error(`Error enviando mensaje por websocket: ${error.message}`);
      return { success: false, error: error.message };
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
