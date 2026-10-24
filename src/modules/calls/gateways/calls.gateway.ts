import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { CallsService } from '../services/calls.service';
import { SignalingDto, IceCandidateDto } from '../dto/signaling.dto';

@WebSocketGateway({
  namespace: '/calls',
  cors: {
    origin: '*',
  },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallsGateway.name);
  private readonly userSockets = new Map<string, string>(); // userId -> socketId
  private readonly socketUsers = new Map<string, string>(); // socketId -> userId
  private readonly waitingRoom = new Map<
    string,
    {
      userId: string;
      socketId: string;
      name: string;
      avatarUrl?: string;
      countryFlag?: string;
      ratePerMinute: number;
    }
  >();

  constructor(private readonly callsService: CallsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado a /calls: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.userSockets.delete(userId);
      this.socketUsers.delete(client.id);
      this.waitingRoom.delete(userId);
      this.logger.log(`Usuario ${userId} desvinculado del socket ${client.id}`);
    }
  }

  @SubscribeMessage('call:register-user')
  handleRegisterUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      this.userSockets.set(data.userId, client.id);
      this.socketUsers.set(client.id, data.userId);
      this.logger.log(`Usuario ${data.userId} registrado en socket ${client.id}`);
    }
  }

  @SubscribeMessage('call:lobby:join')
  handleLobbyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      userId: string;
      name?: string;
      avatarUrl?: string;
      countryFlag?: string;
      ratePerMinute?: number;
    },
  ) {
    if (!data?.userId) return;

    this.userSockets.set(data.userId, client.id);
    this.socketUsers.set(client.id, data.userId);

    this.logger.log(
      `Usuario ${data.name || data.userId} entró a la sala de espera`,
    );

    let matchedPartner: {
      userId: string;
      socketId: string;
      name: string;
      avatarUrl?: string;
      countryFlag?: string;
      ratePerMinute: number;
    } | null = null;

    for (const [waitingId, candidate] of this.waitingRoom.entries()) {
      if (waitingId !== data.userId) {
        matchedPartner = candidate;
        break;
      }
    }

    if (matchedPartner) {
      this.waitingRoom.delete(matchedPartner.userId);
      this.waitingRoom.delete(data.userId);

      this.logger.log(
        `¡Emparejamiento en sala! ${matchedPartner.name} con ${data.name || data.userId}`,
      );

      // Notificar al usuario entrante (caller)
      client.emit('call:lobby:matched', {
        peer: {
          id: matchedPartner.userId,
          name: matchedPartner.name,
          avatarUrl: matchedPartner.avatarUrl,
          countryFlag: matchedPartner.countryFlag,
          ratePerMinute: matchedPartner.ratePerMinute,
        },
        role: 'caller',
      });

      // Notificar al usuario que estaba esperando (callee)
      this.server.to(matchedPartner.socketId).emit('call:lobby:matched', {
        peer: {
          id: data.userId,
          name: data.name || 'Compañero',
          avatarUrl: data.avatarUrl,
          countryFlag: data.countryFlag,
          ratePerMinute: data.ratePerMinute || 10,
        },
        role: 'callee',
      });
    } else {
      this.waitingRoom.set(data.userId, {
        userId: data.userId,
        socketId: client.id,
        name: data.name || 'Usuario',
        avatarUrl: data.avatarUrl,
        countryFlag: data.countryFlag,
        ratePerMinute: data.ratePerMinute || 10,
      });
      client.emit('call:lobby:waiting');
      this.logger.log(
        `Usuario ${data.userId} esperando en sala. En espera: ${this.waitingRoom.size}`,
      );
    }
  }

  @SubscribeMessage('call:lobby:leave')
  handleLobbyLeave(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      this.waitingRoom.delete(data.userId);
      this.logger.log(
        `Usuario ${data.userId} salió de la sala de espera. En espera: ${this.waitingRoom.size}`,
      );
    }
  }

  @SubscribeMessage('call:initiate')
  async handleInitiateCall(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      callerId: string;
      callerName?: string;
      callerAvatar?: string;
      receiverId: string;
      callType?: 'video' | 'audio';
      ratePerMinute?: number;
    },
  ) {
    try {
      this.logger.log(
        `Iniciando llamada de ${data.callerName || data.callerId} hacia ${data.receiverId}`,
      );
      const session = await this.callsService.initiateCall(
        data.callerId,
        data.receiverId,
        data.callType || 'video',
        data.ratePerMinute || 10,
      );

      const receiverSocketId = this.userSockets.get(data.receiverId);
      this.logger.log(`Socket destino para ${data.receiverId}: ${receiverSocketId || 'DESCONECTADO'}`);

      // Confirmación de timbrado al que llama
      client.emit('call:ringing', { callId: session.id });

      if (receiverSocketId) {
        // Enviar evento de llamada entrante al receptor
        this.server.to(receiverSocketId).emit('call:incoming', {
          callId: session.id,
          caller: {
            id: data.callerId,
            name: data.callerName || 'Compañero',
            avatarUrl: data.callerAvatar,
            ratePerMinute: session.ratePerMinute,
          },
          callType: session.callType,
          ratePerMinute: session.ratePerMinute,
        });
      } else {
        this.logger.warn(`El receptor ${data.receiverId} no está registrado en ningún socket.`);
      }
    } catch (error) {
      this.logger.error(`Error al iniciar llamada: ${error}`);
      client.emit('call:busy');
    }
  }

  @SubscribeMessage('call:accept')
  async handleAcceptCall(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { callId: string; userId: string },
  ) {
    await this.callsService.acceptCall(data.callId);
    // Notificar a ambas partes que la llamada fue aceptada
    this.server.emit('call:accepted', { callId: data.callId });
  }

  @SubscribeMessage('call:reject')
  async handleRejectCall(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { callId: string; userId: string; reason?: string },
  ) {
    await this.callsService.rejectCall(data.callId);
    this.server.emit('call:rejected', {
      callId: data.callId,
      reason: data.reason || 'declined',
    });
  }

  @SubscribeMessage('call:signal')
  handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SignalingDto,
  ) {
    this.logger.log(
      `Retransmitiendo señal SDP (${data.signal?.type}) para llamada: ${data.callId}`,
    );
    client.broadcast.emit('call:signal', data);
  }

  @SubscribeMessage('call:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: IceCandidateDto,
  ) {
    client.broadcast.emit('call:ice-candidate', data);
  }

  @SubscribeMessage('call:hangup')
  async handleHangup(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { callId: string; durationSeconds: number },
  ) {
    const updated = await this.callsService.endCall(
      data.callId,
      data.durationSeconds,
    );

    this.server.emit('call:ended', {
      callId: updated.id,
      durationSeconds: updated.durationSeconds,
      coinsCharged: updated.coinsTransferred,
    });
  }
}
