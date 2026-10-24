import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import {
  CallSessionEntity,
  CallSessionStatus,
} from '../entities/call-session.entity';
import { CallCompletedEvent } from '../events/call-completed.event';
import { IceServerConfig } from '../interfaces/call.interface';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(CallSessionEntity)
    private readonly callSessionRepository: Repository<CallSessionEntity>,
    private readonly eventEmitter: EventEmitter2,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Obtiene la lista de servidores STUN/TURN oficiales
   */
  getIceServers(): IceServerConfig[] {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];
  }

  /**
   * Inicia una sesión de llamada validando disponibilidad del usuario
   */
  async initiateCall(
    callerId: string,
    receiverId: string,
    callType: 'video' | 'audio' = 'video',
    ratePerMinute = 10,
    lang = 'es',
  ): Promise<CallSessionEntity> {
    const isBusy = await this.checkIfUserIsBusy(receiverId);
    if (isBusy) {
      const message = await this.i18n.t('calls.user_busy', { lang });
      throw new ConflictException(message);
    }

    const session = this.callSessionRepository.create({
      callerId,
      receiverId,
      callType,
      ratePerMinute,
      status: CallSessionStatus.INITIATED,
    });

    return await this.callSessionRepository.save(session);
  }

  /**
   * Marca la llamada como conectada
   */
  async acceptCall(callId: string): Promise<CallSessionEntity> {
    const session = await this.callSessionRepository.findOne({ where: { id: callId } });
    if (!session) {
      throw new NotFoundException(`Llamada ${callId} no encontrada`);
    }

    session.status = CallSessionStatus.CONNECTED;
    session.startedAt = new Date();
    return await this.callSessionRepository.save(session);
  }

  /**
   * Registra rechazo de llamada
   */
  async rejectCall(callId: string): Promise<CallSessionEntity> {
    const session = await this.callSessionRepository.findOne({ where: { id: callId } });
    if (!session) {
      throw new NotFoundException(`Llamada ${callId} no encontrada`);
    }

    session.status = CallSessionStatus.REJECTED;
    session.endedAt = new Date();
    return await this.callSessionRepository.save(session);
  }

  /**
   * Finaliza la sesión de llamada, calcula monedas y dispara el evento de dominio desacoplado
   */
  async endCall(callId: string, durationSeconds: number): Promise<CallSessionEntity> {
    const session = await this.callSessionRepository.findOne({ where: { id: callId } });
    if (!session) {
      throw new NotFoundException(`Llamada ${callId} no encontrada`);
    }

    const minutes = Math.ceil(durationSeconds / 60);
    const coinsCharged = minutes * session.ratePerMinute;

    session.status = CallSessionStatus.COMPLETED;
    session.durationSeconds = durationSeconds;
    session.coinsTransferred = coinsCharged;
    session.endedAt = new Date();

    const saved = await this.callSessionRepository.save(session);

    // Emisión desacoplada vía EventEmitter2 hacia CoinsModule y NotificationsModule
    this.eventEmitter.emit(
      'call.completed',
      new CallCompletedEvent(
        saved.id,
        durationSeconds,
        saved.callerId,
        saved.receiverId,
        coinsCharged,
      ),
    );

    return saved;
  }

  /**
   * Verifica si un usuario tiene una llamada activa reciente (últimos 2 minutos)
   */
  async checkIfUserIsBusy(userId: string): Promise<boolean> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const active = await this.callSessionRepository
      .createQueryBuilder('session')
      .where('(session.callerId = :userId OR session.receiverId = :userId)', { userId })
      .andWhere('session.status IN (:...statuses)', {
        statuses: [CallSessionStatus.CONNECTED, CallSessionStatus.RINGING],
      })
      .andWhere('session.createdAt > :twoMinutesAgo', { twoMinutesAgo })
      .getOne();

    return Boolean(active);
  }

  /**
   * Consulta el historial de llamadas de un usuario
   */
  async getUserCallHistory(userId: string): Promise<CallSessionEntity[]> {
    return await this.callSessionRepository.find({
      where: [{ callerId: userId }, { receiverId: userId }],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
