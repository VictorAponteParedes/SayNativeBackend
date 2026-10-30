import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { UserBlockEntity } from '../entities/user-block.entity';
import { UserReportEntity, ReportReason, ReportStatus } from '../entities/user-report.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { BlockUserDto } from '../dto/block-user.dto';
import { ReportUserDto } from '../dto/report-user.dto';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(UserBlockEntity)
    private readonly blockRepository: Repository<UserBlockEntity>,
    @InjectRepository(UserReportEntity)
    private readonly reportRepository: Repository<UserReportEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Bloquea a un usuario y lo persiste en la base de datos
   */
  async blockUser(
    blockerId: string,
    dto: BlockUserDto,
    lang = 'es',
  ): Promise<{ success: boolean; message: string; data: UserBlockEntity }> {
    if (blockerId === dto.blockedId) {
      throw new BadRequestException(
        await this.i18n.t('errors.moderation.cannot_block_self', {
          lang,
          defaultValue: 'No puedes bloquearte a ti mismo.',
        }),
      );
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: dto.blockedId },
    });
    if (!targetUser) {
      throw new NotFoundException(
        await this.i18n.t('errors.moderation.user_not_found', {
          lang,
          defaultValue: 'El usuario que intentas bloquear no existe.',
        }),
      );
    }

    const existingBlock = await this.blockRepository.findOne({
      where: {
        blockerId,
        blockedId: dto.blockedId,
      },
    });

    if (existingBlock) {
      const message = await this.i18n.t('moderation.user_already_blocked', {
        lang,
        defaultValue: 'Este usuario ya se encuentra bloqueado.',
      });
      return { success: true, message, data: existingBlock };
    }

    const block = this.blockRepository.create({
      blockerId,
      blockedId: dto.blockedId,
      reason: dto.reason || null,
    });
    const saved = await this.blockRepository.save(block);

    const message = await this.i18n.t('moderation.user_blocked_success', {
      lang,
      defaultValue: 'Usuario bloqueado con éxito.',
    });

    this.logger.log(`Usuario ${blockerId} bloqueó a ${dto.blockedId}`);

    return {
      success: true,
      message,
      data: saved,
    };
  }

  /**
   * Desbloquea a un usuario previamente bloqueado
   */
  async unblockUser(
    blockerId: string,
    blockedId: string,
    lang = 'es',
  ): Promise<{ success: boolean; message: string }> {
    const block = await this.blockRepository.findOne({
      where: [
        { blockerId, blockedId },
        { blockerId, id: blockedId },
      ],
    });

    if (block) {
      await this.blockRepository.remove(block);
    }

    const message = await this.i18n.t('moderation.user_unblocked_success', {
      lang,
      defaultValue: 'Usuario desbloqueado con éxito.',
    });

    this.logger.log(`Usuario ${blockerId} desbloqueó a ${blockedId}`);

    return {
      success: true,
      message,
    };
  }

  /**
   * Comprueba si el usuario A ha bloqueado específicamente al usuario B
   */
  async isBlockedByMe(blockerId: string, blockedId: string): Promise<boolean> {
    if (!blockerId || !blockedId) return false;
    const block = await this.blockRepository.findOne({
      where: { blockerId, blockedId },
    });
    return !!block;
  }

  /**
   * Obtiene la lista de usuarios bloqueados por el usuario autenticado
   */
  async getBlockedUsers(blockerId: string): Promise<any[]> {
    const blocks = await this.blockRepository.find({
      where: { blockerId },
      relations: {
        blocked: { avatar: true },
      },
      order: { createdAt: 'DESC' },
    });

    return blocks.map((b) => ({
      id: b.id,
      blockedUserId: b.blockedId,
      name: b.blocked?.fullName || 'Usuario',
      avatarUrl: b.blocked?.avatar?.url || null,
      countryCode: b.blocked?.countryCode || null,
      countryFlag: b.blocked?.countryFlag || null,
      reason: b.reason,
      blockedAt: b.createdAt,
    }));
  }

  /**
   * Comprueba si existe un bloqueo bidireccional entre dos usuarios
   */
  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    if (!userAId || !userBId || userAId === userBId) return false;

    const block = await this.blockRepository.findOne({
      where: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    });

    return !!block;
  }

  /**
   * Envía un reporte sobre un usuario a la tabla de moderación
   */
  async reportUser(
    reporterId: string,
    dto: ReportUserDto,
    lang = 'es',
  ): Promise<{ success: boolean; message: string; data: UserReportEntity }> {
    if (reporterId === dto.reportedId) {
      throw new BadRequestException(
        await this.i18n.t('errors.moderation.cannot_report_self', {
          lang,
          defaultValue: 'No puedes reportarte a ti mismo.',
        }),
      );
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: dto.reportedId },
    });
    if (!targetUser) {
      throw new NotFoundException(
        await this.i18n.t('errors.moderation.user_not_found', {
          lang,
          defaultValue: 'El usuario que intentas reportar no existe.',
        }),
      );
    }

    const report = this.reportRepository.create({
      reporterId,
      reportedId: dto.reportedId,
      reason: dto.reason || ReportReason.OTHER,
      details: dto.details || null,
      status: ReportStatus.PENDING,
    });
    const saved = await this.reportRepository.save(report);

    const message = await this.i18n.t('moderation.report_submitted_success', {
      lang,
      defaultValue:
        'Reporte enviado con éxito. Nuestro equipo de moderación lo revisará a la brevedad.',
    });

    this.logger.log(`Reporte registrado: ${reporterId} reportó a ${dto.reportedId} (motivo: ${dto.reason})`);

    return {
      success: true,
      message,
      data: saved,
    };
  }

  /**
   * Lista los reportes realizados por el usuario
   */
  async getUserReports(reporterId: string): Promise<UserReportEntity[]> {
    return await this.reportRepository.find({
      where: { reporterId },
      relations: {
        reported: { avatar: true },
      },
      order: { createdAt: 'DESC' },
    });
  }
}
