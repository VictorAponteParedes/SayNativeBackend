import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { ChatRoomEntity } from '../entities/chat-room.entity';
import {
  ChatMessageEntity,
  MessageType,
} from '../entities/chat-message.entity';
import { CreateRoomDto } from '../dto/create-room.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { UserEntity } from '../../users/entities/user.entity';

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(
    @InjectRepository(ChatRoomEntity)
    private readonly roomRepository: Repository<ChatRoomEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepository: Repository<ChatMessageEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly i18n: I18nService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Obtiene o inicializa una sala de chat privada entre dos usuarios
   */
  async getOrCreateRoom(
    userOneId: string,
    userTwoId: string,
    lang = 'es',
  ): Promise<ChatRoomEntity> {
    if (userOneId === userTwoId) {
      throw new BadRequestException(
        await this.i18n.t('errors.chats.cannot_chat_with_self', {
          lang,
          defaultValue: 'No puedes iniciar una conversación contigo mismo.',
        }),
      );
    }

    let room = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.participantOne', 'p1')
      .leftJoinAndSelect('p1.avatar', 'p1Avatar')
      .leftJoinAndSelect('room.participantTwo', 'p2')
      .leftJoinAndSelect('p2.avatar', 'p2Avatar')
      .where(
        '(room.participantOneId = :u1 AND room.participantTwoId = :u2) OR (room.participantOneId = :u2 AND room.participantTwoId = :u1)',
        { u1: userOneId, u2: userTwoId },
      )
      .getOne();

    if (!room) {
      const partner = await this.userRepository.findOne({
        where: { id: userTwoId },
      });
      if (!partner) {
        throw new NotFoundException(
          await this.i18n.t('errors.chats.user_not_found', {
            lang,
            defaultValue: 'El usuario con el que deseas chatear no existe.',
          }),
        );
      }

      room = this.roomRepository.create({
        participantOneId: userOneId,
        participantTwoId: userTwoId,
        unreadCountUserOne: 0,
        unreadCountUserTwo: 0,
      });
      room = await this.roomRepository.save(room);

      // Recargar con relaciones
      room = await this.roomRepository.findOne({
        where: { id: room.id },
        relations: {
          participantOne: { avatar: true },
          participantTwo: { avatar: true },
        },
      });
    }

    return room!;
  }

  /**
   * Lista todas las conversaciones activas del usuario formateadas para la UI del móvil con soporte de filtros
   */
  async getUserConversations(
    userId: string,
    filter?: string,
    lang = 'es',
  ): Promise<any[]> {
    const rooms = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.participantOne', 'p1')
      .leftJoinAndSelect('p1.avatar', 'p1Avatar')
      .leftJoinAndSelect('p1.settings', 'p1Settings')
      .leftJoinAndSelect('room.participantTwo', 'p2')
      .leftJoinAndSelect('p2.avatar', 'p2Avatar')
      .leftJoinAndSelect('p2.settings', 'p2Settings')
      .where(
        'room.participantOneId = :userId OR room.participantTwoId = :userId',
        {
          userId,
        },
      )
      .orderBy('room.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('room.updatedAt', 'DESC')
      .getMany();

    const mapped = rooms.map((room) => {
      const isUserOne = room.participantOneId === userId;
      const partner = isUserOne ? room.participantTwo : room.participantOne;
      const unreadCount = isUserOne
        ? room.unreadCountUserOne
        : room.unreadCountUserTwo;

      let timeFormatted = '';
      if (room.lastMessageAt) {
        const d = new Date(room.lastMessageAt);
        timeFormatted = d.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      const isTeacher = Boolean(partner?.settings?.isAvailableToTeach);

      return {
        id: room.id,
        partnerId: partner?.id,
        name: partner?.fullName || partner?.email?.split('@')[0] || 'Compañero',
        avatarUrl: partner?.avatar?.url || '',
        countryFlag: partner?.countryFlag || '🌐',
        countryCode: partner?.countryCode || '',
        isOnline: true,
        badge: isTeacher ? 'Super Tutor' : undefined,
        lastMessage: room.lastMessageText || '',
        time: timeFormatted,
        unreadCount: unreadCount || 0,
        isRead: unreadCount === 0,
        messageType: room.lastMessageText?.includes('🎙️') ? 'audio' : 'text',
        ratePerMinute: partner?.settings?.learningCostPerMin ?? 10,
      };
    });

    if (filter === 'unread') {
      return mapped.filter((c) => (c.unreadCount || 0) > 0);
    }
    if (filter === 'videocalls') {
      return mapped.filter(
        (c) =>
          c.messageType === 'videocall_ended' ||
          c.messageType === 'missed_call',
      );
    }
    if (filter === 'tutors') {
      return mapped.filter((c) => Boolean(c.badge));
    }
    if (filter === 'online') {
      return mapped.filter((c) => Boolean(c.isOnline));
    }

    return mapped;
  }

  async getFilterOptions(userId: string, lang = 'es') {
    const all = await this.getUserConversations(userId, undefined, lang);

    const totalCount = all.length;
    const unreadCount = all.filter((c) => (c.unreadCount || 0) > 0).length;
    const videocallsCount = all.filter(
      (c) =>
        c.messageType === 'videocall_ended' || c.messageType === 'missed_call',
    ).length;
    const tutorsCount = all.filter((c) => Boolean(c.badge)).length;
    const onlineCount = all.filter((c) => Boolean(c.isOnline)).length;

    return [
      {
        key: 'all',
        label: await this.i18n.t('chats.filters.all_label', {
          lang,
          defaultValue: 'Todos los chats',
        }),
        description: await this.i18n.t('chats.filters.all_desc', {
          lang,
          defaultValue: 'Mostrar todas las conversaciones',
        }),
        count: totalCount,
        icon: 'message-circle',
      },
      {
        key: 'unread',
        label: await this.i18n.t('chats.filters.unread_label', {
          lang,
          defaultValue: 'Mensajes no leídos',
        }),
        description: await this.i18n.t('chats.filters.unread_desc', {
          lang,
          defaultValue: 'Conversaciones con mensajes pendientes',
        }),
        count: unreadCount,
        icon: 'mail',
      },
      {
        key: 'videocalls',
        label: await this.i18n.t('chats.filters.videocalls_label', {
          lang,
          defaultValue: 'Llamadas y videollamadas',
        }),
        description: await this.i18n.t('chats.filters.videocalls_desc', {
          lang,
          defaultValue: 'Historial de llamadas de práctica',
        }),
        count: videocallsCount,
        icon: 'video',
      },
      {
        key: 'tutors',
        label: await this.i18n.t('chats.filters.tutors_label', {
          lang,
          defaultValue: 'Tutores nativos',
        }),
        description: await this.i18n.t('chats.filters.tutors_desc', {
          lang,
          defaultValue: 'Profesores y tutores verificados',
        }),
        count: tutorsCount,
        icon: 'award',
      },
      {
        key: 'online',
        label: await this.i18n.t('chats.filters.online_label', {
          lang,
          defaultValue: 'En línea ahora',
        }),
        description: await this.i18n.t('chats.filters.online_desc', {
          lang,
          defaultValue: 'Compañeros activos para chatear',
        }),
        count: onlineCount,
        icon: 'activity',
      },
    ];
  }

  /**
   * Obtiene los mensajes de una sala específica
   */
  async getRoomMessages(
    roomId: string,
    userId: string,
    limit = 100,
    lang = 'es',
  ): Promise<ChatMessageEntity[]> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException(
        await this.i18n.t('errors.chats.room_not_found', {
          lang,
          defaultValue: 'La conversación no fue encontrada.',
        }),
      );
    }

    if (room.participantOneId !== userId && room.participantTwoId !== userId) {
      throw new BadRequestException(
        await this.i18n.t('errors.chats.unauthorized_access', {
          lang,
          defaultValue: 'No tienes acceso a esta conversación.',
        }),
      );
    }

    return await this.messageRepository.find({
      where: { roomId },
      relations: { sender: { avatar: true } },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Envía un mensaje en la conversación actualizando la sala
   */
  async sendMessage(
    senderId: string,
    dto: SendMessageDto,
    lang = 'es',
  ): Promise<ChatMessageEntity> {
    let roomId = dto.roomId;

    if (!roomId) {
      if (!dto.recipientId) {
        throw new BadRequestException(
          await this.i18n.t('errors.chats.invalid_partner_id', {
            lang,
            defaultValue: 'Debes especificar una sala o un destinatario.',
          }),
        );
      }
      const room = await this.getOrCreateRoom(senderId, dto.recipientId, lang);
      roomId = room.id;
    }

    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException(
        await this.i18n.t('errors.chats.room_not_found', {
          lang,
          defaultValue: 'La conversación no fue encontrada.',
        }),
      );
    }

    const message = this.messageRepository.create({
      roomId: room.id,
      senderId,
      text: dto.text.trim(),
      translatedText: dto.translatedText,
      isAudio: dto.isAudio ?? false,
      audioUrl: dto.audioUrl,
      audioDuration: dto.audioDuration,
      transcription: dto.transcription,
      type: dto.type ?? (dto.isAudio ? MessageType.AUDIO : MessageType.TEXT),
      isRead: false,
    });
    const savedMessage = await this.messageRepository.save(message);

    // Actualizar metadata de la sala y contador no leído del receptor
    const isSenderOne = room.participantOneId === senderId;
    if (isSenderOne) {
      room.unreadCountUserTwo += 1;
    } else {
      room.unreadCountUserOne += 1;
    }
    room.lastMessageText = dto.isAudio ? '🎙️ Mensaje de voz' : dto.text.trim();
    room.lastMessageAt = new Date();
    await this.roomRepository.save(room);

    this.eventEmitter.emit('chat.message_sent', {
      message: savedMessage,
      room,
    });

    return savedMessage;
  }

  /**
   * Marca los mensajes de la sala como leídos para el usuario
   */
  async markRoomAsRead(
    roomId: string,
    userId: string,
    lang = 'es',
  ): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) return;

    const isUserOne = room.participantOneId === userId;
    if (isUserOne) {
      room.unreadCountUserOne = 0;
    } else {
      room.unreadCountUserTwo = 0;
    }
    await this.roomRepository.save(room);

    await this.messageRepository
      .createQueryBuilder()
      .update(ChatMessageEntity)
      .set({ isRead: true, readAt: new Date() })
      .where('roomId = :roomId AND senderId != :userId AND isRead = false', {
        roomId,
        userId,
      })
      .execute();
  }
}
